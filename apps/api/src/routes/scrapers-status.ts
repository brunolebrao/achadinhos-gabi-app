import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@repo/database'

export default async function scrapersStatusRoutes(fastify: FastifyInstance) {
  // Get all scraper configurations with latest execution
  fastify.get('/status', async (request, reply) => {
    try {
      const scrapers = await prisma.scraperConfig.findMany({
        include: {
          executions: {
            orderBy: { startedAt: 'desc' },
            take: 1
          }
        }
      })
      
      const status = scrapers.map(scraper => {
        const lastExecution = scraper.executions[0]
        
        return {
          id: scraper.id,
          name: scraper.name,
          platform: scraper.platform,
          isActive: scraper.isActive,
          keywords: scraper.keywords,
          categories: scraper.categories,
          maxProducts: scraper.maxProducts,
          frequency: scraper.frequency,
          lastRun: scraper.lastRun,
          nextRun: scraper.nextRun,
          status: lastExecution?.status || 'NEVER_RUN',
          lastExecutionId: lastExecution?.id,
          lastExecutionStarted: lastExecution?.startedAt,
          lastExecutionFinished: lastExecution?.finishedAt,
          lastProductsFound: lastExecution?.productsFound || 0,
          lastProductsAdded: lastExecution?.productsAdded || 0,
          lastError: lastExecution?.error
        }
      })
      
      return {
        success: true,
        scrapers: status,
        total: status.length,
        active: status.filter(s => s.isActive).length,
        running: status.filter(s => s.status === 'RUNNING').length
      }
    } catch (error: any) {
      fastify.log.error('Failed to get scrapers status:', error)
      return reply.code(500).send({
        error: 'Failed to get scrapers status',
        message: error.message
      })
    }
  })
  
  // Get execution history for a specific scraper
  fastify.get('/status/:scraperId/history', async (request, reply) => {
    try {
      const { scraperId } = z.object({
        scraperId: z.string()
      }).parse(request.params)
      
      const { limit = 10, offset = 0 } = z.object({
        limit: z.coerce.number().min(1).max(100).optional(),
        offset: z.coerce.number().min(0).optional()
      }).parse(request.query)
      
      const [executions, total] = await Promise.all([
        prisma.scraperExecution.findMany({
          where: { scraperId },
          orderBy: { startedAt: 'desc' },
          take: limit,
          skip: offset
        }),
        prisma.scraperExecution.count({
          where: { scraperId }
        })
      ])
      
      return {
        success: true,
        executions,
        total,
        limit,
        offset
      }
    } catch (error: any) {
      fastify.log.error('Failed to get execution history:', error)
      return reply.code(500).send({
        error: 'Failed to get execution history',
        message: error.message
      })
    }
  })
  
  // Get real-time metrics
  fastify.get('/metrics', async (request, reply) => {
    try {
      const now = new Date()
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      const [
        totalProducts,
        productsToday,
        productsThisWeek,
        executionsToday,
        executionsThisWeek,
        successRate,
        avgExecutionTime
      ] = await Promise.all([
        // Total products
        prisma.product.count(),
        
        // Products added today
        prisma.product.count({
          where: {
            createdAt: { gte: oneDayAgo }
          }
        }),
        
        // Products added this week
        prisma.product.count({
          where: {
            createdAt: { gte: oneWeekAgo }
          }
        }),
        
        // Executions today
        prisma.scraperExecution.count({
          where: {
            startedAt: { gte: oneDayAgo }
          }
        }),
        
        // Executions this week
        prisma.scraperExecution.count({
          where: {
            startedAt: { gte: oneWeekAgo }
          }
        }),
        
        // Success rate (last 100 executions)
        prisma.scraperExecution.findMany({
          select: { status: true },
          orderBy: { startedAt: 'desc' },
          take: 100
        }).then(execs => {
          const successful = execs.filter(e => e.status === 'SUCCESS').length
          return execs.length > 0 ? (successful / execs.length) * 100 : 0
        }),
        
        // Average execution time (last 50 successful executions)
        prisma.scraperExecution.findMany({
          where: {
            status: 'SUCCESS',
            finishedAt: { not: null }
          },
          select: {
            startedAt: true,
            finishedAt: true
          },
          orderBy: { startedAt: 'desc' },
          take: 50
        }).then(execs => {
          if (execs.length === 0) return 0
          
          const times = execs.map(e => {
            if (!e.finishedAt) return 0
            return e.finishedAt.getTime() - e.startedAt.getTime()
          }).filter(t => t > 0)
          
          return times.length > 0 
            ? Math.round(times.reduce((a, b) => a + b, 0) / times.length / 1000)
            : 0
        })
      ])
      
      return {
        success: true,
        metrics: {
          products: {
            total: totalProducts,
            today: productsToday,
            thisWeek: productsThisWeek
          },
          executions: {
            today: executionsToday,
            thisWeek: executionsThisWeek,
            successRate: Math.round(successRate),
            avgExecutionTime: `${avgExecutionTime}s`
          }
        }
      }
    } catch (error: any) {
      fastify.log.error('Failed to get metrics:', error)
      return reply.code(500).send({
        error: 'Failed to get metrics',
        message: error.message
      })
    }
  })
  
  // Trigger manual scraper run
  fastify.post('/run/:scraperId', async (request, reply) => {
    try {
      const { scraperId } = z.object({
        scraperId: z.string()
      }).parse(request.params)
      
      // Update nextRun to trigger immediate execution
      const scraper = await prisma.scraperConfig.update({
        where: { id: scraperId },
        data: {
          nextRun: new Date() // Set to now to trigger on next check
        }
      })
      
      return {
        success: true,
        message: `Scraper "${scraper.name}" scheduled for immediate execution`,
        scraper: {
          id: scraper.id,
          name: scraper.name,
          platform: scraper.platform,
          nextRun: scraper.nextRun
        }
      }
    } catch (error: any) {
      fastify.log.error('Failed to trigger scraper:', error)
      return reply.code(500).send({
        error: 'Failed to trigger scraper',
        message: error.message
      })
    }
  })
}