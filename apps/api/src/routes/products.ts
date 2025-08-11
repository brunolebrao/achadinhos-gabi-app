import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@repo/database'
import { ProductFilter } from '@repo/shared'
import { authenticate, authorize } from '../middleware/auth'

const productFilterSchema = z.object({
  platform: z.enum(['MERCADOLIVRE', 'SHOPEE', 'AMAZON']).optional(),
  category: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SENT']).optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  minDiscount: z.coerce.number().min(0).max(100).optional(),
  searchTerm: z.string().optional(),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20)
})

const productSchema = z.object({
  title: z.string(),
  price: z.number().positive(),
  originalPrice: z.number().positive().optional(),
  discount: z.string().optional(),
  imageUrl: z.string().url(),
  productUrl: z.string().url(),
  affiliateUrl: z.string().url().optional(),
  platform: z.enum(['MERCADOLIVRE', 'SHOPEE', 'AMAZON']),
  category: z.string(),
  cupom: z.string().optional(),
  ratings: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().nonnegative().optional(),
  salesCount: z.number().int().nonnegative().optional()
})

export default async function productsRoutes(fastify: FastifyInstance) {
  // Test endpoint - list all products grouped by platform
  fastify.get('/test/all', async (request, reply) => {
    try {
      const productsByPlatform = await prisma.product.groupBy({
        by: ['platform'],
        _count: true
      })
      
      const samples = await Promise.all([
        prisma.product.findFirst({
          where: { platform: 'MERCADOLIVRE' },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.product.findFirst({
          where: { platform: 'AMAZON' },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.product.findFirst({
          where: { platform: 'SHOPEE' },
          orderBy: { createdAt: 'desc' }
        })
      ])
      
      return {
        summary: productsByPlatform.map(p => ({
          platform: p.platform,
          count: p._count
        })),
        samples: samples.filter(s => s !== null).map(s => ({
          platform: s!.platform,
          title: s!.title.substring(0, 60),
          price: s!.price,
          createdAt: s!.createdAt
        })),
        total: productsByPlatform.reduce((sum, p) => sum + p._count, 0)
      }
    } catch (error) {
      console.error('Test endpoint error:', error)
      return reply.status(500).send({ error: String(error) })
    }
  })
  
  // Get user's products (from their scrapers)
  fastify.get('/user', { preHandler: [authenticate] }, async (request, reply) => {
    const user = (request as any).user
    const userId = user?.userId || user?.id

    if (!userId) {
      return reply.code(401).send({ error: 'User ID not found in token' })
    }

    const filters = productFilterSchema.parse(request.query)
    const { page, limit, ...where } = filters

    // First get user's scrapers
    const userScrapers = await prisma.scraperConfig.findMany({
      where: { userId },
      select: { id: true }
    })

    const scraperIds = userScrapers.map(s => s.id)

    // Get products from any scraper, but that have user's affiliate URLs
    // For now, we'll get all products and filter on the frontend side
    // In a production system, we'd want to add a userId field to Product table
    const products = await prisma.product.findMany({
      where: {
        ...(where.platform && { platform: where.platform }),
        ...(where.category && { category: where.category }),
        ...(where.status && { status: where.status }),
        ...(where.minPrice && { price: { gte: where.minPrice } }),
        ...(where.maxPrice && { price: { lte: where.maxPrice } }),
        ...(where.searchTerm && {
          OR: [
            { title: { contains: where.searchTerm, mode: 'insensitive' } },
            { category: { contains: where.searchTerm, mode: 'insensitive' } }
          ]
        }),
        // Filter by creation date to get recent products that might be from user's scrapers
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        priceHistory: {
          orderBy: { recordedAt: 'desc' },
          take: 3
        }
      }
    })

    // Get user's affiliate config to match URLs
    const affiliateConfig = await prisma.affiliateConfig.findUnique({
      where: { userId }
    })

    // Filter products that contain user's affiliate ID
    const userProducts = products.filter(product => {
      if (!affiliateConfig) return false
      
      const affiliateUrl = product.affiliateUrl || ''
      
      // Check if the affiliate URL contains any of user's affiliate IDs
      return (
        (affiliateConfig.mercadolivreId && affiliateUrl.includes(affiliateConfig.mercadolivreId)) ||
        (affiliateConfig.amazonTag && affiliateUrl.includes(affiliateConfig.amazonTag)) ||
        (affiliateConfig.shopeeId && affiliateUrl.includes(affiliateConfig.shopeeId)) ||
        (affiliateConfig.aliexpressId && affiliateUrl.includes(affiliateConfig.aliexpressId))
      )
    })

    const total = userProducts.length

    return {
      products: userProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      userScrapers: userScrapers.length,
      affiliateConfig: !!affiliateConfig
    }
  })

  // Get product statistics
  fastify.get('/stats', async () => {
    const [pending, approved, rejected, sent, total] = await Promise.all([
      prisma.product.count({ where: { status: 'PENDING' } }),
      prisma.product.count({ where: { status: 'APPROVED' } }),
      prisma.product.count({ where: { status: 'REJECTED' } }),
      prisma.product.count({ where: { status: 'SENT' } }),
      prisma.product.count()
    ])

    return {
      pending,
      approved,
      rejected,
      sent,
      total
    }
  })

  fastify.get('/', async (request, reply) => {
    const filters = productFilterSchema.parse(request.query)
    const { page, limit, ...where } = filters

    const products = await prisma.product.findMany({
      where: {
        ...(where.platform && { platform: where.platform }),
        ...(where.category && { category: where.category }),
        ...(where.status && { status: where.status }),
        ...(where.minPrice && { price: { gte: where.minPrice } }),
        ...(where.maxPrice && { price: { lte: where.maxPrice } }),
        ...(where.searchTerm && {
          OR: [
            { title: { contains: where.searchTerm, mode: 'insensitive' } },
            { category: { contains: where.searchTerm, mode: 'insensitive' } }
          ]
        })
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' }
    })

    const total = await prisma.product.count({ where })

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  })

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        priceHistory: {
          orderBy: { recordedAt: 'desc' },
          take: 10
        }
      }
    })

    if (!product) {
      return reply.code(404).send({ error: 'Product not found' })
    }

    return product
  })

  fastify.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const productData = productSchema.parse(request.body)

    const product = await prisma.product.create({
      data: productData
    })

    return reply.code(201).send(product)
  })

  fastify.patch('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const updates = productSchema.partial().parse(request.body)

    const product = await prisma.product.update({
      where: { id },
      data: updates
    })

    return product
  })

  fastify.patch('/:id/status', { preHandler: [authorize('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { status } = z.object({
      status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SENT'])
    }).parse(request.body)

    const product = await prisma.product.update({
      where: { id },
      data: { status }
    })

    return product
  })

  fastify.delete('/:id', { preHandler: [authorize('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    await prisma.product.delete({
      where: { id }
    })

    return reply.code(204).send()
  })

  // Bulk delete products
  fastify.post('/bulk-delete', { preHandler: [authenticate] }, async (request, reply) => {
    const user = (request as any).user
    const userId = user?.userId || user?.id

    if (!userId) {
      return reply.code(401).send({ error: 'User ID not found in token' })
    }

    const { ids } = z.object({
      ids: z.array(z.string()).min(1)
    }).parse(request.body)

    // For user products, we should verify they own them
    // Since we don't have direct user ownership in Product table,
    // we'll allow deletion of any products for now
    // In production, add ownership verification
    
    try {
      const result = await prisma.product.deleteMany({
        where: {
          id: { in: ids }
        }
      })

      return {
        deleted: result.count,
        message: `${result.count} produto(s) excluído(s) com sucesso`
      }
    } catch (error) {
      console.error('Bulk delete error:', error)
      return reply.code(500).send({ 
        error: 'Erro ao excluir produtos',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  // Bulk status update
  fastify.post('/bulk-status', { preHandler: [authenticate] }, async (request, reply) => {
    const user = (request as any).user
    const userId = user?.userId || user?.id

    if (!userId) {
      return reply.code(401).send({ error: 'User ID not found in token' })
    }

    const { ids, status } = z.object({
      ids: z.array(z.string()).min(1),
      status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SENT'])
    }).parse(request.body)

    try {
      const result = await prisma.product.updateMany({
        where: {
          id: { in: ids }
        },
        data: { status }
      })

      return {
        updated: result.count,
        message: `${result.count} produto(s) atualizado(s) com sucesso`
      }
    } catch (error) {
      console.error('Bulk status update error:', error)
      return reply.code(500).send({ 
        error: 'Erro ao atualizar status dos produtos',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
}