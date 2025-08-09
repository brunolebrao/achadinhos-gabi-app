import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@repo/database'
import { authenticate } from '../middleware/auth'

const scraperConfigSchema = z.object({
  platform: z.enum(['MERCADOLIVRE', 'SHOPEE', 'AMAZON', 'ALIEXPRESS']),
  name: z.string().min(1),
  isActive: z.boolean().default(true),
  categories: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  minDiscount: z.number().min(0).max(100).optional(),
  frequency: z.string(),
  proxyRotation: z.boolean().default(false),
  maxProducts: z.number().positive().default(100),
  config: z.record(z.any()).optional()
})

export default async function scrapersRoutes(fastify: FastifyInstance) {
  // Get all scrapers (admin only)
  fastify.get('/', async (request) => {
    const { platform, isActive } = z.object({
      platform: z.enum(['MERCADOLIVRE', 'SHOPEE', 'AMAZON', 'ALIEXPRESS']).optional(),
      isActive: z.coerce.boolean().optional()
    }).parse(request.query)

    const scrapers = await prisma.scraperConfig.findMany({
      where: {
        ...(platform && { platform }),
        ...(isActive !== undefined && { isActive })
      },
      include: {
        _count: {
          select: { executions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return scrapers
  })

  // Get user's scrapers
  fastify.get('/user', { preHandler: [authenticate] }, async (request, reply) => {
    const user = (request as any).user
    const userId = user?.userId || user?.id

    if (!userId) {
      return reply.code(401).send({ error: 'User ID not found in token' })
    }

    const { platform, isActive } = z.object({
      platform: z.enum(['MERCADOLIVRE', 'SHOPEE', 'AMAZON', 'ALIEXPRESS']).optional(),
      isActive: z.coerce.boolean().optional()
    }).parse(request.query)

    const scrapers = await prisma.scraperConfig.findMany({
      where: {
        userId,
        ...(platform && { platform }),
        ...(isActive !== undefined && { isActive })
      },
      include: {
        _count: {
          select: { executions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return scrapers
  })

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const scraper = await prisma.scraperConfig.findUnique({
      where: { id },
      include: {
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 10
        }
      }
    })

    if (!scraper) {
      return reply.code(404).send({ error: 'Scraper not found' })
    }

    return scraper
  })

  // Create user scraper
  fastify.post('/user', { preHandler: [authenticate] }, async (request, reply) => {
    const user = (request as any).user
    const userId = user?.userId || user?.id

    if (!userId) {
      return reply.code(401).send({ error: 'User ID not found in token' })
    }

    const scraperData = scraperConfigSchema.parse(request.body)

    const scraper = await prisma.scraperConfig.create({
      data: {
        ...scraperData,
        userId
      }
    })

    return reply.code(201).send(scraper)
  })

  fastify.post('/', async (request, reply) => {
    const scraperData = scraperConfigSchema.parse(request.body)

    const scraper = await prisma.scraperConfig.create({
      data: scraperData
    })

    return reply.code(201).send(scraper)
  })

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const scraperData = scraperConfigSchema.parse(request.body)

    const scraper = await prisma.scraperConfig.update({
      where: { id },
      data: scraperData
    })

    return scraper
  })

  // Toggle scraper status (with user verification)
  fastify.patch('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = (request as any).user
    const userId = user?.userId || user?.id

    if (!userId) {
      return reply.code(401).send({ error: 'User ID not found in token' })
    }

    const scraper = await prisma.scraperConfig.findUnique({
      where: { id }
    })

    if (!scraper) {
      return reply.code(404).send({ error: 'Scraper not found' })
    }

    // Check if user owns this scraper
    if (scraper.userId !== userId) {
      return reply.code(403).send({ error: 'Access denied: not your scraper' })
    }

    const updates = z.object({
      isActive: z.boolean().optional(),
      name: z.string().min(1).optional(),
      keywords: z.array(z.string()).optional(),
      categories: z.array(z.string()).optional(),
      minPrice: z.number().positive().optional(),
      maxPrice: z.number().positive().optional(),
      minDiscount: z.number().min(0).max(100).optional(),
      frequency: z.string().optional()
    }).parse(request.body)

    const updatedScraper = await prisma.scraperConfig.update({
      where: { id },
      data: updates
    })

    return updatedScraper
  })

  fastify.patch('/:id/toggle', async (request, reply) => {
    const { id } = request.params as { id: string }

    const scraper = await prisma.scraperConfig.findUnique({
      where: { id }
    })

    if (!scraper) {
      return reply.code(404).send({ error: 'Scraper not found' })
    }

    const updatedScraper = await prisma.scraperConfig.update({
      where: { id },
      data: { isActive: !scraper.isActive }
    })

    return updatedScraper
  })

  fastify.delete('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = (request as any).user
    const userId = user?.userId || user?.id

    if (!userId) {
      return reply.code(401).send({ error: 'User ID not found in token' })
    }

    const scraper = await prisma.scraperConfig.findUnique({
      where: { id }
    })

    if (!scraper) {
      return reply.code(404).send({ error: 'Scraper not found' })
    }

    // Check if user owns this scraper
    if (scraper.userId !== userId) {
      return reply.code(403).send({ error: 'Access denied: not your scraper' })
    }

    await prisma.scraperConfig.delete({
      where: { id }
    })

    return reply.code(204).send()
  })

  fastify.post('/:id/run', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = (request as any).user
    const userId = user?.userId || user?.id

    if (!userId) {
      return reply.code(401).send({ error: 'User ID not found in token' })
    }

    const scraper = await prisma.scraperConfig.findUnique({
      where: { id }
    })

    if (!scraper) {
      return reply.code(404).send({ error: 'Scraper not found' })
    }

    // Check if user owns this scraper
    if (scraper.userId !== userId) {
      return reply.code(403).send({ error: 'Access denied: not your scraper' })
    }

    const execution = await prisma.scraperExecution.create({
      data: {
        scraperId: id,
        status: 'PENDING'
      }
    })

    return reply.code(202).send({
      message: 'Scraper execution started',
      executionId: execution.id
    })
  })

  fastify.get('/executions', async (request) => {
    const { status, scraperId } = z.object({
      status: z.enum(['PENDING', 'RUNNING', 'SUCCESS', 'FAILED']).optional(),
      scraperId: z.string().optional()
    }).parse(request.query)

    const executions = await prisma.scraperExecution.findMany({
      where: {
        ...(status && { status }),
        ...(scraperId && { scraperId })
      },
      include: {
        scraper: true
      },
      orderBy: { startedAt: 'desc' },
      take: 50
    })

    return executions
  })
}