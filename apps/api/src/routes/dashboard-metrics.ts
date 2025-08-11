import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@repo/database'

const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  period: z.enum(['today', 'week', 'month', 'year', 'all']).optional()
})

export default async function dashboardMetricsRoutes(fastify: FastifyInstance) {
  
  // Get overview metrics
  fastify.get('/overview', async (request, reply) => {
    const { startDate, endDate, period } = dateRangeSchema.parse(request.query)
    
    const dateFilter = getDateFilter(startDate, endDate, period)
    
    try {
      // Products metrics
      const totalProducts = await prisma.product.count({
        where: dateFilter
      })
      
      const productsByPlatform = await prisma.product.groupBy({
        by: ['platform'],
        _count: true,
        where: dateFilter
      })
      
      const productsByStatus = await prisma.product.groupBy({
        by: ['status'],
        _count: true,
        where: dateFilter
      })
      
      // Scraper metrics
      const totalScrapers = await prisma.scraperConfig.count()
      const activeScrapers = await prisma.scraperConfig.count({
        where: { isActive: true }
      })
      
      const scraperExecutions = await prisma.scraperExecution.groupBy({
        by: ['status'],
        _count: true,
        where: {
          startedAt: dateFilter.createdAt
        }
      })
      
      // Message metrics
      const totalMessages = await prisma.scheduledMessage.count({
        where: {
          scheduledFor: dateFilter.createdAt
        }
      })
      
      const messagesByStatus = await prisma.scheduledMessage.groupBy({
        by: ['status'],
        _count: true,
        where: {
          scheduledFor: dateFilter.createdAt
        }
      })
      
      // URL shortener metrics
      const totalShortUrls = await prisma.shortUrl.count({
        where: dateFilter
      })
      
      const totalClicks = await prisma.shortUrl.aggregate({
        _sum: { clicks: true },
        where: dateFilter
      })
      
      // Calculate trends (compare with previous period)
      const previousPeriodFilter = getPreviousPeriodFilter(startDate, endDate, period)
      
      const previousProducts = await prisma.product.count({
        where: previousPeriodFilter
      })
      
      const productsTrend = calculateTrend(totalProducts, previousProducts)
      
      return {
        overview: {
          products: {
            total: totalProducts,
            trend: productsTrend,
            byPlatform: productsByPlatform.map(p => ({
              platform: p.platform,
              count: p._count
            })),
            byStatus: productsByStatus.map(p => ({
              status: p.status,
              count: p._count
            }))
          },
          scrapers: {
            total: totalScrapers,
            active: activeScrapers,
            executions: scraperExecutions.map(e => ({
              status: e.status,
              count: e._count
            }))
          },
          messages: {
            total: totalMessages,
            byStatus: messagesByStatus.map(m => ({
              status: m.status,
              count: m._count
            }))
          },
          urlShortener: {
            totalUrls: totalShortUrls,
            totalClicks: totalClicks._sum.clicks || 0
          }
        }
      }
    } catch (error) {
      console.error('Error fetching overview metrics:', error)
      reply.status(500).send({ error: 'Failed to fetch metrics' })
    }
  })
  
  // Get product performance metrics
  fastify.get('/products/performance', async (request, reply) => {
    const { startDate, endDate, period } = dateRangeSchema.parse(request.query)
    
    const dateFilter = getDateFilter(startDate, endDate, period)
    
    try {
      // Top performing products (by clicks on short URLs)
      const topProducts = await prisma.product.findMany({
        where: dateFilter,
        orderBy: {
          clickCount: 'desc'
        },
        take: 10,
        select: {
          id: true,
          title: true,
          price: true,
          platform: true,
          clickCount: true,
          shareCount: true,
          category: true
        }
      })
      
      // Price distribution
      const priceRanges = await prisma.$queryRaw`
        SELECT 
          CASE 
            WHEN price < 50 THEN '0-50'
            WHEN price < 100 THEN '50-100'
            WHEN price < 200 THEN '100-200'
            WHEN price < 500 THEN '200-500'
            ELSE '500+'
          END as range,
          COUNT(*) as count
        FROM "Product"
        WHERE "createdAt" >= ${dateFilter.createdAt?.gte || new Date(0)}
        GROUP BY range
        ORDER BY range
      `
      
      // Discount distribution
      const discountStats = await prisma.$queryRaw`
        SELECT 
          AVG(CAST(REGEXP_REPLACE(discount, '[^0-9]', '', 'g') AS INTEGER)) as avg_discount,
          MAX(CAST(REGEXP_REPLACE(discount, '[^0-9]', '', 'g') AS INTEGER)) as max_discount,
          MIN(CAST(REGEXP_REPLACE(discount, '[^0-9]', '', 'g') AS INTEGER)) as min_discount
        FROM "Product"
        WHERE discount IS NOT NULL
          AND discount != ''
          AND "createdAt" >= ${dateFilter.createdAt?.gte || new Date(0)}
      `
      
      return {
        performance: {
          topProducts,
          priceDistribution: priceRanges,
          discountStats: discountStats[0] || {
            avg_discount: 0,
            max_discount: 0,
            min_discount: 0
          }
        }
      }
    } catch (error) {
      console.error('Error fetching product performance:', error)
      reply.status(500).send({ error: 'Failed to fetch product performance' })
    }
  })
  
  // Get scraper performance metrics
  fastify.get('/scrapers/performance', async (request, reply) => {
    const { startDate, endDate, period } = dateRangeSchema.parse(request.query)
    
    const dateFilter = getDateFilter(startDate, endDate, period)
    
    try {
      // Scraper success rate
      const executions = await prisma.scraperExecution.findMany({
        where: {
          startedAt: dateFilter.createdAt
        },
        include: {
          scraper: true
        }
      })
      
      const scraperStats = executions.reduce((acc: any, exec) => {
        const platform = exec.scraper.platform
        if (!acc[platform]) {
          acc[platform] = {
            total: 0,
            success: 0,
            failed: 0,
            productsFound: 0,
            productsAdded: 0,
            avgDuration: 0,
            durations: []
          }
        }
        
        acc[platform].total++
        if (exec.status === 'SUCCESS') {
          acc[platform].success++
          acc[platform].productsFound += exec.productsFound || 0
          acc[platform].productsAdded += exec.productsAdded || 0
        } else if (exec.status === 'FAILED') {
          acc[platform].failed++
        }
        
        if (exec.finishedAt && exec.startedAt) {
          const duration = exec.finishedAt.getTime() - exec.startedAt.getTime()
          acc[platform].durations.push(duration)
        }
        
        return acc
      }, {})
      
      // Calculate averages
      Object.keys(scraperStats).forEach(platform => {
        const stats = scraperStats[platform]
        if (stats.durations.length > 0) {
          stats.avgDuration = stats.durations.reduce((a: number, b: number) => a + b, 0) / stats.durations.length
        }
        delete stats.durations
        stats.successRate = stats.total > 0 ? (stats.success / stats.total) * 100 : 0
      })
      
      // Hourly distribution
      const hourlyDistribution = await prisma.$queryRaw`
        SELECT 
          EXTRACT(HOUR FROM "startedAt") as hour,
          COUNT(*) as count,
          AVG(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) * 100 as success_rate
        FROM "ScraperExecution"
        WHERE "startedAt" >= ${dateFilter.createdAt?.gte || new Date(0)}
        GROUP BY hour
        ORDER BY hour
      `
      
      return {
        scraperPerformance: {
          byPlatform: scraperStats,
          hourlyDistribution
        }
      }
    } catch (error) {
      console.error('Error fetching scraper performance:', error)
      reply.status(500).send({ error: 'Failed to fetch scraper performance' })
    }
  })
  
  // Get message analytics
  fastify.get('/messages/analytics', async (request, reply) => {
    const { startDate, endDate, period } = dateRangeSchema.parse(request.query)
    
    const dateFilter = getDateFilter(startDate, endDate, period)
    
    try {
      // Message delivery stats
      const messageStats = await prisma.scheduledMessage.groupBy({
        by: ['status', 'type'],
        _count: true,
        where: {
          scheduledFor: dateFilter.createdAt
        }
      })
      
      // Peak hours for messaging
      const peakHours = await prisma.$queryRaw`
        SELECT 
          EXTRACT(HOUR FROM "scheduledFor") as hour,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) as sent,
          SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed
        FROM "ScheduledMessage"
        WHERE "scheduledFor" >= ${dateFilter.createdAt?.gte || new Date(0)}
        GROUP BY hour
        ORDER BY total DESC
      `
      
      // Template performance
      const templatePerformance = await prisma.template.findMany({
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              messages: {
                where: {
                  scheduledFor: dateFilter.createdAt
                }
              }
            }
          }
        },
        orderBy: {
          messages: {
            _count: 'desc'
          }
        },
        take: 10
      })
      
      return {
        messageAnalytics: {
          stats: messageStats.map(s => ({
            status: s.status,
            type: s.type,
            count: s._count
          })),
          peakHours,
          topTemplates: templatePerformance.map(t => ({
            id: t.id,
            name: t.name,
            usageCount: t._count.messages
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching message analytics:', error)
      reply.status(500).send({ error: 'Failed to fetch message analytics' })
    }
  })
  
  // Get real-time stats
  fastify.get('/realtime', async (request, reply) => {
    try {
      // Products added today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const productsToday = await prisma.product.count({
        where: {
          createdAt: { gte: today }
        }
      })
      
      // Active scrapers now
      const runningScrapers = await prisma.scraperExecution.count({
        where: {
          status: 'RUNNING'
        }
      })
      
      // Messages pending
      const pendingMessages = await prisma.scheduledMessage.count({
        where: {
          status: 'PENDING',
          scheduledFor: { lte: new Date() }
        }
      })
      
      // Recent clicks (last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const recentClicks = await prisma.urlClick.count({
        where: {
          clickedAt: { gte: oneHourAgo }
        }
      })
      
      // Online WhatsApp accounts
      const onlineAccounts = await prisma.whatsAppAccount.count({
        where: {
          status: 'CONNECTED'
        }
      })
      
      return {
        realtime: {
          productsToday,
          runningScrapers,
          pendingMessages,
          recentClicks,
          onlineAccounts,
          timestamp: new Date()
        }
      }
    } catch (error) {
      console.error('Error fetching realtime stats:', error)
      reply.status(500).send({ error: 'Failed to fetch realtime stats' })
    }
  })
}

// Helper functions
function getDateFilter(startDate?: string, endDate?: string, period?: string) {
  const now = new Date()
  let start = startDate ? new Date(startDate) : undefined
  let end = endDate ? new Date(endDate) : undefined
  
  if (period && !start) {
    switch (period) {
      case 'today':
        start = new Date(now.setHours(0, 0, 0, 0))
        break
      case 'week':
        start = new Date(now.setDate(now.getDate() - 7))
        break
      case 'month':
        start = new Date(now.setMonth(now.getMonth() - 1))
        break
      case 'year':
        start = new Date(now.setFullYear(now.getFullYear() - 1))
        break
    }
  }
  
  return {
    createdAt: {
      gte: start,
      lte: end
    }
  }
}

function getPreviousPeriodFilter(startDate?: string, endDate?: string, period?: string) {
  const now = new Date()
  let start = startDate ? new Date(startDate) : undefined
  let end = endDate ? new Date(endDate) : undefined
  
  if (period && !start) {
    switch (period) {
      case 'today':
        start = new Date(now.setDate(now.getDate() - 1))
        end = new Date(now.setHours(0, 0, 0, 0))
        break
      case 'week':
        start = new Date(now.setDate(now.getDate() - 14))
        end = new Date(now.setDate(now.getDate() + 7))
        break
      case 'month':
        start = new Date(now.setMonth(now.getMonth() - 2))
        end = new Date(now.setMonth(now.getMonth() + 1))
        break
      case 'year':
        start = new Date(now.setFullYear(now.getFullYear() - 2))
        end = new Date(now.setFullYear(now.getFullYear() + 1))
        break
    }
  }
  
  return {
    createdAt: {
      gte: start,
      lte: end
    }
  }
}

function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return 100
  return ((current - previous) / previous) * 100
}