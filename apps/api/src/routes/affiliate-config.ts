import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@repo/database'
import { authenticate } from '../middleware/auth'

const affiliateConfigSchema = z.object({
  mercadolivreId: z.string().optional().nullable(),
  amazonTag: z.string().optional().nullable(),
  shopeeId: z.string().optional().nullable(),
  aliexpressId: z.string().optional().nullable(),
  enableTracking: z.boolean().default(true),
  customUtmSource: z.string().optional().nullable(),
  customUtmMedium: z.string().optional().nullable(),
  customUtmCampaign: z.string().optional().nullable()
})

const validateAffiliateIdSchema = z.object({
  platform: z.enum(['MERCADOLIVRE', 'AMAZON', 'SHOPEE', 'ALIEXPRESS']),
  id: z.string()
})

export default async function affiliateConfigRoutes(fastify: FastifyInstance) {
  // Get current user's affiliate config
  fastify.get('/user/affiliate-config', { preHandler: [authenticate] }, async (request, reply) => {
    const user = (request as any).user
    const userId = user?.userId || user?.id

    const config = await prisma.affiliateConfig.findUnique({
      where: { userId }
    })

    if (!config) {
      return reply.code(404).send({
        message: 'Affiliate configuration not found'
      })
    }

    return config
  })

  // Create or update affiliate config
  fastify.post('/user/affiliate-config', { preHandler: [authenticate] }, async (request, reply) => {
    const user = (request as any).user
    const userId = user?.userId || user?.id
    
    if (!userId) {
      return reply.code(401).send({ error: 'User ID not found in token' })
    }
    
    const data = affiliateConfigSchema.parse(request.body)

    const config = await prisma.affiliateConfig.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data
      }
    })

    return config
  })

  // Validate affiliate ID format (public endpoint - only validates format)
  fastify.post('/user/affiliate-config/validate', async (request, reply) => {
    const { platform, id } = validateAffiliateIdSchema.parse(request.body)

    // Basic validation rules for each platform
    let isValid = false
    let message = ''

    switch (platform) {
      case 'MERCADOLIVRE':
        // Mercado Livre tracking IDs are usually alphanumeric
        isValid = /^[A-Za-z0-9_-]+$/.test(id) && id.length >= 5 && id.length <= 50
        message = isValid 
          ? 'ID válido para Mercado Livre' 
          : 'ID inválido. Deve conter apenas letras, números, hífens e underscores (5-50 caracteres)'
        break

      case 'AMAZON':
        // Amazon associate tags follow pattern: sitename-20
        isValid = /^[a-z0-9]+(-[a-z0-9]+)*-\d{2}$/.test(id)
        message = isValid 
          ? 'Tag válida para Amazon Associates' 
          : 'Tag inválida. Formato esperado: nomedosite-20'
        break

      case 'SHOPEE':
        // Shopee affiliate IDs are usually numeric or alphanumeric
        isValid = /^[A-Za-z0-9]+$/.test(id) && id.length >= 5 && id.length <= 30
        message = isValid 
          ? 'ID válido para Shopee' 
          : 'ID inválido. Deve conter apenas letras e números (5-30 caracteres)'
        break

      case 'ALIEXPRESS':
        // AliExpress affiliate IDs are usually numeric
        isValid = /^\d+$/.test(id) && id.length >= 5 && id.length <= 20
        message = isValid 
          ? 'ID válido para AliExpress' 
          : 'ID inválido. Deve conter apenas números (5-20 dígitos)'
        break
    }

    return {
      valid: isValid,
      message,
      platform,
      id
    }
  })

  // Get affiliate metrics
  fastify.get('/user/affiliate-metrics', { preHandler: [authenticate] }, async (request, reply) => {
    const user = (request as any).user
    const userId = user?.userId || user?.id

    const config = await prisma.affiliateConfig.findUnique({
      where: { userId }
    })

    if (!config) {
      return {
        totalClicks: 0,
        totalConversions: 0,
        estimatedRevenue: 0,
        conversionRate: 0
      }
    }

    const conversionRate = config.totalClicks > 0 
      ? (config.totalConversions / config.totalClicks) * 100 
      : 0

    return {
      totalClicks: config.totalClicks,
      totalConversions: config.totalConversions,
      estimatedRevenue: config.estimatedRevenue,
      conversionRate: conversionRate.toFixed(2)
    }
  })

  // Track click
  fastify.post('/tracking/click', async (request, reply) => {
    const schema = z.object({
      productId: z.string(),
      userId: z.string(),
      platform: z.enum(['MERCADOLIVRE', 'AMAZON', 'SHOPEE', 'ALIEXPRESS'])
    })

    const { productId, userId, platform } = schema.parse(request.body)

    // Update click count
    await prisma.affiliateConfig.update({
      where: { userId },
      data: {
        totalClicks: {
          increment: 1
        }
      }
    })

    // Log click for analytics
    const userAgent = request.headers['user-agent'] || ''
    const ipAddress = request.ip

    await prisma.affiliateClick.create({
      data: {
        productId,
        linkId: '', // Will be updated when we have AffiliateLink tracking
        ipAddress,
        userAgent,
        referrer: request.headers.referer || ''
      }
    })

    return { success: true }
  })

  // Track conversion (manual)
  fastify.post('/tracking/conversion', { preHandler: [authenticate] }, async (request, reply) => {
    const schema = z.object({
      productId: z.string(),
      orderValue: z.number().positive(),
      commission: z.number().positive()
    })

    const user = (request as any).user
    const userId = user?.userId || user?.id
    const { productId, orderValue, commission } = schema.parse(request.body)

    // Update conversion metrics
    await prisma.affiliateConfig.update({
      where: { userId },
      data: {
        totalConversions: {
          increment: 1
        },
        estimatedRevenue: {
          increment: commission
        }
      }
    })

    return { 
      success: true,
      commission,
      orderValue
    }
  })

  // Get affiliate setup instructions
  fastify.get('/user/affiliate-config/instructions/:platform', async (request, reply) => {
    const { platform } = request.params as { platform: string }

    const instructions = {
      MERCADOLIVRE: {
        title: 'Como obter seu ID de Afiliado do Mercado Livre',
        steps: [
          'Acesse o programa de afiliados: https://www.mercadolivre.com.br/afiliados',
          'Faça login com sua conta Mercado Livre',
          'Aceite os termos do programa',
          'Acesse "Ferramentas" no menu',
          'Copie seu ID de tracking',
          'Cole o ID no campo abaixo'
        ],
        link: 'https://www.mercadolivre.com.br/afiliados',
        commission: '3-6% por venda'
      },
      AMAZON: {
        title: 'Como obter sua Tag de Associado Amazon',
        steps: [
          'Acesse: https://associados.amazon.com.br',
          'Crie uma conta ou faça login',
          'Complete o cadastro com seus dados fiscais',
          'Aguarde aprovação (até 24h)',
          'Acesse "Conta" > "Gerenciar IDs de rastreamento"',
          'Copie sua tag (formato: seusite-20)'
        ],
        link: 'https://associados.amazon.com.br',
        commission: '4-8% por venda'
      },
      SHOPEE: {
        title: 'Como obter seu ID de Afiliado Shopee',
        steps: [
          'Acesse: https://affiliate.shopee.com.br',
          'Cadastre-se no programa',
          'Preencha informações do seu canal',
          'Aguarde aprovação',
          'Acesse Dashboard > Perfil',
          'Copie seu ID de afiliado'
        ],
        link: 'https://affiliate.shopee.com.br',
        commission: '5-7% por venda'
      },
      ALIEXPRESS: {
        title: 'Como obter seu ID de Afiliado AliExpress',
        steps: [
          'Acesse: https://portals.aliexpress.com',
          'Registre-se no programa de afiliados',
          'Complete seu perfil',
          'Acesse "Account" > "Tracking ID"',
          'Gere um novo tracking ID',
          'Copie o ID numérico'
        ],
        link: 'https://portals.aliexpress.com',
        commission: '3-5% por venda'
      }
    }

    const platformInstructions = instructions[platform as keyof typeof instructions]
    
    if (!platformInstructions) {
      return reply.code(404).send({
        error: 'Platform not found'
      })
    }

    return platformInstructions
  })
}