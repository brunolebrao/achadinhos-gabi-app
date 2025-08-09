import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@repo/database'
import { 
  renderTemplateWithProduct, 
  suggestTemplate, 
  mapProductToVariables,
  validateTemplate,
  getAvailableVariables,
  type ProductForTemplate 
} from '../utils/template-utils'

const templateSchema = z.object({
  name: z.string().min(1),
  content: z.string().min(1),
  category: z.string().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  variables: z.record(z.string()).optional()
})

export default async function templatesRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request) => {
    const { category, isActive } = z.object({
      category: z.string().optional(),
      isActive: z.coerce.boolean().optional()
    }).parse(request.query)

    const templates = await prisma.template.findMany({
      where: {
        ...(category && { category }),
        ...(isActive !== undefined && { isActive })
      },
      orderBy: { createdAt: 'desc' }
    })

    return templates
  })

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const template = await prisma.template.findUnique({
      where: { id }
    })

    if (!template) {
      return reply.code(404).send({ error: 'Template not found' })
    }

    return template
  })

  fastify.post('/', async (request, reply) => {
    const templateData = templateSchema.parse(request.body)

    if (templateData.isDefault) {
      await prisma.template.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      })
    }

    const template = await prisma.template.create({
      data: templateData
    })

    return reply.code(201).send(template)
  })

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const templateData = templateSchema.parse(request.body)

    if (templateData.isDefault) {
      await prisma.template.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false }
      })
    }

    const template = await prisma.template.update({
      where: { id },
      data: templateData
    })

    return template
  })

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    await prisma.template.delete({
      where: { id }
    })

    return reply.code(204).send()
  })

  fastify.post('/:id/preview', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { variables } = z.object({
      variables: z.record(z.string())
    }).parse(request.body)

    const template = await prisma.template.findUnique({
      where: { id }
    })

    if (!template) {
      return reply.code(404).send({ error: 'Template not found' })
    }

    let content = template.content
    Object.entries(variables).forEach(([key, value]) => {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value)
    })

    return { preview: content }
  })

  // Apply template to specific product
  fastify.post('/apply-to-product/:productId/:templateId', async (request, reply) => {
    const { productId, templateId } = request.params as { productId: string; templateId: string }

    // Buscar produto
    const produto = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!produto) {
      return reply.code(404).send({ error: 'Product not found' })
    }

    // Buscar template
    const template = await prisma.template.findUnique({
      where: { id: templateId }
    })

    if (!template) {
      return reply.code(404).send({ error: 'Template not found' })
    }

    // Mapear produto para formato do template
    const productForTemplate: ProductForTemplate = {
      id: produto.id,
      title: produto.title,
      price: produto.price,
      originalPrice: produto.originalPrice,
      discount: produto.discount,
      productUrl: produto.productUrl,
      platform: produto.platform,
      category: produto.category || undefined,
      isNew: false // TODO: Implementar lógica de produto novo
    }

    // Renderizar template com produto
    const renderedContent = renderTemplateWithProduct(template.content, productForTemplate)
    const variables = mapProductToVariables(productForTemplate)

    return {
      template: {
        id: template.id,
        name: template.name,
        category: template.category
      },
      product: {
        id: produto.id,
        title: produto.title,
        price: produto.price,
        discount: produto.discount
      },
      variables,
      renderedMessage: renderedContent
    }
  })

  // Suggest best template for product
  fastify.get('/suggest/:productId', async (request, reply) => {
    const { productId } = request.params as { productId: string }

    // Buscar produto
    const produto = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!produto) {
      return reply.code(404).send({ error: 'Product not found' })
    }

    // Mapear produto para formato do template
    const productForTemplate: ProductForTemplate = {
      id: produto.id,
      title: produto.title,
      price: produto.price,
      originalPrice: produto.originalPrice,
      discount: produto.discount,
      productUrl: produto.productUrl,
      platform: produto.platform,
      category: produto.category || undefined,
      isNew: false
    }

    // Sugerir template
    const suggestedTemplateId = await suggestTemplate(productForTemplate)

    if (!suggestedTemplateId) {
      return reply.code(404).send({ error: 'No suitable template found' })
    }

    // Buscar template sugerido
    const template = await prisma.template.findUnique({
      where: { id: suggestedTemplateId }
    })

    if (!template) {
      return reply.code(404).send({ error: 'Suggested template not found' })
    }

    // Renderizar preview
    const renderedContent = renderTemplateWithProduct(template.content, productForTemplate)
    const variables = mapProductToVariables(productForTemplate)

    return {
      suggestion: {
        template: {
          id: template.id,
          name: template.name,
          category: template.category
        },
        reason: getSuggestionReason(productForTemplate),
        confidence: 0.9 // Placeholder
      },
      product: {
        id: produto.id,
        title: produto.title,
        price: produto.price,
        discount: produto.discount
      },
      variables,
      preview: renderedContent
    }
  })

  // Preview template with specific product
  fastify.post('/preview-with-product/:productId/:templateId', async (request, reply) => {
    const { productId, templateId } = request.params as { productId: string; templateId: string }

    // Buscar produto
    const produto = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!produto) {
      return reply.code(404).send({ error: 'Product not found' })
    }

    // Buscar template
    const template = await prisma.template.findUnique({
      where: { id: templateId }
    })

    if (!template) {
      return reply.code(404).send({ error: 'Template not found' })
    }

    // Mapear produto para formato do template
    const productForTemplate: ProductForTemplate = {
      id: produto.id,
      title: produto.title,
      price: produto.price,
      originalPrice: produto.originalPrice,
      discount: produto.discount,
      productUrl: produto.productUrl,
      platform: produto.platform,
      category: produto.category || undefined,
      isNew: false
    }

    // Renderizar preview
    const renderedContent = renderTemplateWithProduct(template.content, productForTemplate)
    const variables = mapProductToVariables(productForTemplate)
    const validation = validateTemplate(template.content, variables)

    return {
      template: {
        id: template.id,
        name: template.name,
        category: template.category
      },
      product: {
        id: produto.id,
        title: produto.title,
        price: produto.price,
        discount: produto.discount,
        platform: produto.platform
      },
      variables,
      preview: renderedContent,
      validation
    }
  })

  // Get available variables for a product
  fastify.get('/variables/:productId', async (request, reply) => {
    const { productId } = request.params as { productId: string }

    // Buscar produto
    const produto = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!produto) {
      return reply.code(404).send({ error: 'Product not found' })
    }

    // Mapear produto para formato do template
    const productForTemplate: ProductForTemplate = {
      id: produto.id,
      title: produto.title,
      price: produto.price,
      originalPrice: produto.originalPrice,
      discount: produto.discount,
      productUrl: produto.productUrl,
      platform: produto.platform,
      category: produto.category || undefined,
      isNew: false
    }

    const variables = getAvailableVariables(productForTemplate)

    return {
      product: {
        id: produto.id,
        title: produto.title
      },
      variables,
      variableDescriptions: {
        product_name: "Nome do produto",
        price: "Preço atual",
        original_price: "Preço original",
        discount: "Porcentagem de desconto",
        product_link: "Link do produto",
        affiliate_url: "Link afiliado",
        platform_emoji: "Emoji da plataforma",
        discount_emoji: "Emoji baseado no desconto",
        urgency_text: "Texto de urgência",
        category_emoji: "Emoji da categoria",
        platform: "Nome da plataforma",
        category: "Categoria do produto"
      }
    }
  })
}

// Função auxiliar para explicar sugestão de template
function getSuggestionReason(produto: ProductForTemplate): string {
  const discount = produto.discount ? parseInt(produto.discount.replace('%', '')) : 0
  
  if (discount >= 50) {
    return `Desconto alto (${discount}%) - ideal para template de super oferta`
  }
  if (discount >= 30) {
    return `Bom desconto (${discount}%) - ideal para template de promoção`
  }
  if (produto.isNew) {
    return 'Produto novo - ideal para template de novidade'
  }
  return 'Produto padrão - usando template básico'
}