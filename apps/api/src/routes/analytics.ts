import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@repo/database'

export default async function analyticsRoutes(fastify: FastifyInstance) {
  fastify.get('/overview', async (request) => {
    const { from, to } = z.object({
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional()
    }).parse(request.query)

    const dateFilter = {
      ...(from && { gte: from }),
      ...(to && { lte: to })
    }

    const [
      totalProducts,
      activeProducts,
      totalMessages,
      sentMessages,
      totalContacts,
      activeGroups,
      totalClicks
    ] = await Promise.all([
      prisma.product.count({
        where: {
          createdAt: dateFilter
        }
      }),
      prisma.product.count({
        where: {
          status: 'APPROVED',
          createdAt: dateFilter
        }
      }),
      prisma.scheduledMessage.count({
        where: {
          createdAt: dateFilter
        }
      }),
      prisma.scheduledMessage.count({
        where: {
          status: 'SENT',
          sentAt: dateFilter
        }
      }),
      prisma.contact.count({
        where: {
          isBlocked: false
        }
      }),
      prisma.group.count({
        where: {
          isActive: true
        }
      }),
      prisma.affiliateClick.count({
        where: {
          clickedAt: dateFilter
        }
      })
    ])

    return {
      products: {
        total: totalProducts,
        active: activeProducts
      },
      messages: {
        total: totalMessages,
        sent: sentMessages
      },
      contacts: {
        total: totalContacts
      },
      groups: {
        active: activeGroups
      },
      clicks: {
        total: totalClicks
      }
    }
  })

  fastify.get('/products/by-platform', async (request) => {
    const { from, to } = z.object({
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional()
    }).parse(request.query)

    const dateFilter = {
      ...(from && { gte: from }),
      ...(to && { lte: to })
    }

    const products = await prisma.product.groupBy({
      by: ['platform'],
      where: {
        createdAt: dateFilter
      },
      _count: {
        id: true
      }
    })

    return products.map(p => ({
      platform: p.platform,
      count: p._count.id
    }))
  })

  fastify.get('/products/by-category', async (request) => {
    const { from, to, platform } = z.object({
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
      platform: z.enum(['MERCADOLIVRE', 'SHOPEE', 'AMAZON', 'ALIEXPRESS']).optional()
    }).parse(request.query)

    const dateFilter = {
      ...(from && { gte: from }),
      ...(to && { lte: to })
    }

    const products = await prisma.product.groupBy({
      by: ['category'],
      where: {
        ...(platform && { platform }),
        createdAt: dateFilter
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    })

    return products.map(p => ({
      category: p.category,
      count: p._count.id
    }))
  })

  fastify.get('/messages/timeline', async (request) => {
    const { days = 7 } = z.object({
      days: z.coerce.number().positive().max(30).default(7)
    }).parse(request.query)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    const messages = await prisma.scheduledMessage.findMany({
      where: {
        sentAt: {
          gte: startDate
        },
        status: 'SENT'
      },
      select: {
        sentAt: true
      }
    })

    const timeline: Record<string, number> = {}
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateKey = date.toISOString().split('T')[0]!
      timeline[dateKey] = 0
    }

    messages.forEach(message => {
      if (message.sentAt) {
        const dateKey = message.sentAt.toISOString().split('T')[0]!
        if (timeline[dateKey] !== undefined) {
          timeline[dateKey]++
        }
      }
    })

    return Object.entries(timeline).map(([date, count]) => ({
      date,
      count
    }))
  })

  fastify.get('/clicks/top-products', async (request) => {
    const { limit = 10, from, to } = z.object({
      limit: z.coerce.number().positive().max(50).default(10),
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional()
    }).parse(request.query)

    const dateFilter = {
      ...(from && { gte: from }),
      ...(to && { lte: to })
    }

    const topProducts = await prisma.affiliateClick.groupBy({
      by: ['productId'],
      where: {
        productId: { not: null },
        clickedAt: dateFilter
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: limit
    })

    const productIds = topProducts.map(p => p.productId).filter(Boolean) as string[]
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds }
      }
    })

    const productMap = new Map(products.map(p => [p.id, p]))

    return topProducts
      .map(tp => ({
        product: productMap.get(tp.productId!),
        clicks: tp._count.id
      }))
      .filter(item => item.product)
  })

  fastify.get('/scrapers/performance', async () => {
    const scrapers = await prisma.scraperConfig.findMany({
      include: {
        executions: {
          where: {
            finishedAt: { not: null }
          },
          orderBy: {
            startedAt: 'desc'
          },
          take: 10
        }
      }
    })

    return scrapers.map(scraper => {
      const successfulExecutions = scraper.executions.filter(e => e.status === 'SUCCESS')
      const totalProducts = successfulExecutions.reduce((sum, e) => sum + e.productsFound, 0)
      const totalAdded = successfulExecutions.reduce((sum, e) => sum + e.productsAdded, 0)

      return {
        id: scraper.id,
        name: scraper.name,
        platform: scraper.platform,
        isActive: scraper.isActive,
        performance: {
          totalExecutions: scraper.executions.length,
          successfulExecutions: successfulExecutions.length,
          successRate: scraper.executions.length > 0 
            ? (successfulExecutions.length / scraper.executions.length) * 100 
            : 0,
          averageProductsFound: successfulExecutions.length > 0 
            ? totalProducts / successfulExecutions.length 
            : 0,
          averageProductsAdded: successfulExecutions.length > 0 
            ? totalAdded / successfulExecutions.length 
            : 0
        }
      }
    })
  })
}