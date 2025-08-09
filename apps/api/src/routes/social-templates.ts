import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { PrismaClient, SocialPlatform, TemplateType } from '@repo/database'

const prisma = new PrismaClient()

// Schemas
const createTemplateSchema = z.object({
  name: z.string(),
  platform: z.nativeEnum(SocialPlatform),
  type: z.nativeEnum(TemplateType),
  content: z.string(),
  category: z.string().optional(),
  variables: z.record(z.any()).optional()
})

const updateTemplateSchema = createTemplateSchema.partial()

const querySchema = z.object({
  platform: z.nativeEnum(SocialPlatform).optional(),
  type: z.nativeEnum(TemplateType).optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional()
})

export default async function socialTemplates(fastify: FastifyInstance) {
  // Get all templates
  fastify.get('/', async (request, reply) => {
    const query = querySchema.parse(request.query)
    
    const templates = await prisma.template.findMany({
      where: {
        ...(query.platform && { platform: query.platform }),
        ...(query.type && { type: query.type }),
        ...(query.category && { category: query.category }),
        ...(query.isActive !== undefined && { isActive: query.isActive })
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return reply.send(templates)
  })

  // Get template by ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    
    const template = await prisma.template.findUnique({
      where: { id }
    })

    if (!template) {
      return reply.status(404).send({ error: 'Template not found' })
    }

    return reply.send(template)
  })

  // Create template
  fastify.post('/', async (request, reply) => {
    const data = createTemplateSchema.parse(request.body)
    
    const template = await prisma.template.create({
      data: {
        ...data,
        isActive: true
      }
    })

    return reply.status(201).send(template)
  })

  // Update template
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const data = updateTemplateSchema.parse(request.body)
    
    const template = await prisma.template.update({
      where: { id },
      data
    })

    return reply.send(template)
  })

  // Delete template
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    
    await prisma.template.delete({
      where: { id }
    })

    return reply.status(204).send()
  })

  // Clone template
  fastify.post('/:id/clone', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { name } = request.body as { name?: string }
    
    const original = await prisma.template.findUnique({
      where: { id }
    })

    if (!original) {
      return reply.status(404).send({ error: 'Template not found' })
    }

    const template = await prisma.template.create({
      data: {
        name: name || `${original.name} (Copy)`,
        platform: original.platform,
        type: original.type,
        content: original.content,
        category: original.category,
        variables: original.variables,
        isDefault: false,
        isActive: true
      }
    })

    return reply.status(201).send(template)
  })

  // Get template categories
  fastify.get('/categories/list', async (request, reply) => {
    const categories = await prisma.template.findMany({
      where: {
        category: { not: null }
      },
      select: {
        category: true
      },
      distinct: ['category']
    })

    return reply.send(categories.map(c => c.category).filter(Boolean))
  })

  // Preview template with data
  fastify.post('/:id/preview', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { data } = request.body as { data: Record<string, any> }
    
    const template = await prisma.template.findUnique({
      where: { id }
    })

    if (!template) {
      return reply.status(404).send({ error: 'Template not found' })
    }

    // Replace variables in template content
    let content = template.content
    const variables = template.variables as Record<string, any> || {}

    // Replace standard variables
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      content = content.replace(regex, data[key])
    })

    // Replace custom variables
    Object.keys(variables).forEach(key => {
      if (!data[key] && variables[key].default) {
        const regex = new RegExp(`{{${key}}}`, 'g')
        content = content.replace(regex, variables[key].default)
      }
    })

    return reply.send({
      ...template,
      content,
      preview: true
    })
  })

  // Get default templates for platform
  fastify.get('/platform/:platform/defaults', async (request, reply) => {
    const { platform } = request.params as { platform: SocialPlatform }
    
    const templates = await prisma.template.findMany({
      where: {
        platform,
        isDefault: true,
        isActive: true
      }
    })

    if (templates.length === 0) {
      // Create default templates if none exist
      await createDefaultTemplates(platform)
      
      const newTemplates = await prisma.template.findMany({
        where: {
          platform,
          isDefault: true,
          isActive: true
        }
      })
      
      return reply.send(newTemplates)
    }

    return reply.send(templates)
  })
}

async function createDefaultTemplates(platform: SocialPlatform) {
  const defaultTemplates = {
    INSTAGRAM: [
      {
        name: 'Instagram - Oferta Flash',
        type: TemplateType.FEED_POST,
        content: '🔥 OFERTA FLASH 🔥\n\n{{title}}\n\n💰 De R$ {{originalPrice}} por apenas R$ {{price}}!\n📍 {{discount}} de desconto\n\n⏰ Oferta por tempo limitado!\n🛒 Link na bio\n\n#oferta #desconto #promoção #{{category}}',
        category: 'Promoção',
        variables: {
          title: { type: 'string', required: true },
          price: { type: 'number', required: true },
          originalPrice: { type: 'number', required: true },
          discount: { type: 'string', required: true },
          category: { type: 'string', default: 'ofertas' }
        }
      },
      {
        name: 'Instagram - Story Countdown',
        type: TemplateType.STORY,
        content: '⏰ ÚLTIMAS HORAS!\n\n{{title}}\n\n🏷️ R$ {{price}}\n\n👆 Arrasta pra cima',
        category: 'Urgência',
        variables: {
          title: { type: 'string', required: true },
          price: { type: 'number', required: true }
        }
      }
    ],
    TIKTOK: [
      {
        name: 'TikTok - Produto Viral',
        type: TemplateType.VIDEO,
        content: 'POV: Você encontra {{title}} com {{discount}} de desconto 🤯\n\n✨ Apenas R$ {{price}}\n🔗 Link na bio\n\n#tiktokmademebuyit #achados #promoção #{{category}}',
        category: 'Viral',
        variables: {
          title: { type: 'string', required: true },
          price: { type: 'number', required: true },
          discount: { type: 'string', required: true },
          category: { type: 'string', default: 'compras' }
        }
      }
    ],
    WHATSAPP: [
      {
        name: 'WhatsApp - Oferta do Dia',
        type: TemplateType.MESSAGE,
        content: '*🎯 OFERTA DO DIA*\n\n{{title}}\n\n💵 *Preço:* ~R$ {{originalPrice}}~ *R$ {{price}}*\n📍 *Desconto:* {{discount}}\n🏪 *Loja:* {{platform}}\n\n🔗 *Link para comprar:*\n{{affiliateUrl}}\n\n_Oferta por tempo limitado!_',
        category: 'Diária',
        variables: {
          title: { type: 'string', required: true },
          price: { type: 'number', required: true },
          originalPrice: { type: 'number', required: true },
          discount: { type: 'string', required: true },
          platform: { type: 'string', required: true },
          affiliateUrl: { type: 'string', required: true }
        }
      }
    ]
  }

  const templates = defaultTemplates[platform] || []
  
  for (const template of templates) {
    await prisma.template.create({
      data: {
        ...template,
        platform,
        isDefault: true,
        isActive: true
      }
    })
  }
}