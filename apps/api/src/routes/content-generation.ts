import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { PrismaClient, SocialPlatform } from '@repo/database'

const prisma = new PrismaClient()

// Schemas
const generateContentSchema = z.object({
  productId: z.string(),
  platforms: z.array(z.nativeEnum(SocialPlatform)),
  templateId: z.string().optional(),
  type: z.enum(['image', 'video', 'story', 'carousel']),
  options: z.object({
    includePrice: z.boolean().default(true),
    includeDiscount: z.boolean().default(true),
    includeBrand: z.boolean().default(false),
    includeRating: z.boolean().default(false),
    style: z.enum(['modern', 'minimal', 'bold', 'elegant']).default('modern'),
    colorScheme: z.enum(['auto', 'light', 'dark', 'vibrant']).default('auto')
  }).optional()
})

const batchGenerateSchema = z.object({
  productIds: z.array(z.string()),
  platform: z.nativeEnum(SocialPlatform),
  type: z.enum(['carousel', 'collection', 'grid'])
})

export default async function contentGeneration(fastify: FastifyInstance) {
  // Generate content for a product
  fastify.post('/generate', async (request, reply) => {
    const data = generateContentSchema.parse(request.body)
    
    // Get product details
    const product = await prisma.product.findUnique({
      where: { id: data.productId }
    })

    if (!product) {
      return reply.status(404).send({ error: 'Product not found' })
    }

    // Generate content for each platform
    const generatedContent: any[] = []

    for (const platform of data.platforms) {
      let content: any = {
        platform,
        productId: product.id,
        type: data.type
      }

      // Get template if specified
      if (data.templateId) {
        const template = await prisma.template.findUnique({
          where: { id: data.templateId }
        })

        if (template) {
          content.template = template
          content.text = await processTemplate(template.content, product)
        }
      }

      // Generate media based on type
      switch (data.type) {
        case 'image':
          content.mediaUrl = await generateImage(product, platform, data.options)
          break
        case 'video':
          content.mediaUrl = await generateVideo(product, platform, data.options)
          break
        case 'story':
          content.mediaUrl = await generateStory(product, platform, data.options)
          break
        case 'carousel':
          content.mediaUrls = await generateCarousel([product], platform, data.options)
          break
      }

      // Platform-specific adjustments
      content = adjustForPlatform(content, platform)

      generatedContent.push(content)
    }

    return reply.send({ content: generatedContent })
  })

  // Generate batch content
  fastify.post('/generate-batch', async (request, reply) => {
    const data = batchGenerateSchema.parse(request.body)
    
    // Get products
    const products = await prisma.product.findMany({
      where: {
        id: { in: data.productIds }
      }
    })

    if (products.length === 0) {
      return reply.status(404).send({ error: 'No products found' })
    }

    let content: any = {
      platform: data.platform,
      type: data.type,
      products: products.map(p => ({
        id: p.id,
        title: p.title,
        price: p.price
      }))
    }

    switch (data.type) {
      case 'carousel':
        content.mediaUrls = await generateCarousel(products, data.platform)
        break
      case 'collection':
        content.mediaUrl = await generateCollection(products, data.platform)
        break
      case 'grid':
        content.mediaUrl = await generateGrid(products, data.platform)
        break
    }

    return reply.send(content)
  })

  // Generate hashtags
  fastify.post('/hashtags', async (request, reply) => {
    const { platform, category, keywords } = request.body as {
      platform: SocialPlatform
      category?: string
      keywords?: string[]
    }

    const hashtags = await generateHashtags(platform, category, keywords)
    
    return reply.send({ hashtags })
  })

  // Generate caption
  fastify.post('/caption', async (request, reply) => {
    const { productId, platform, style } = request.body as {
      productId: string
      platform: SocialPlatform
      style?: 'casual' | 'professional' | 'urgent' | 'funny'
    }

    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return reply.status(404).send({ error: 'Product not found' })
    }

    const caption = await generateCaption(product, platform, style)
    
    return reply.send({ caption })
  })

  // Get content suggestions
  fastify.get('/suggestions/:productId', async (request, reply) => {
    const { productId } = request.params as { productId: string }
    
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return reply.status(404).send({ error: 'Product not found' })
    }

    const suggestions = {
      instagram: {
        bestTime: '19:00-21:00',
        format: 'carousel',
        hashtags: await generateHashtags('INSTAGRAM', product.category),
        caption: await generateCaption(product, 'INSTAGRAM', 'casual')
      },
      tiktok: {
        bestTime: '18:00-20:00',
        format: 'video',
        hashtags: await generateHashtags('TIKTOK', product.category),
        caption: await generateCaption(product, 'TIKTOK', 'funny'),
        trending: ['tiktokmademebuyit', 'achadosdobrasil', 'promoção']
      },
      whatsapp: {
        bestTime: '10:00-12:00',
        format: 'message',
        groups: ['Ofertas Premium', 'Achados do Dia'],
        template: 'oferta-flash'
      }
    }

    return reply.send(suggestions)
  })
}

// Helper functions
async function processTemplate(template: string, product: any): Promise<string> {
  let content = template

  // Replace product variables
  content = content.replace(/{{title}}/g, product.title)
  content = content.replace(/{{price}}/g, product.price.toFixed(2))
  content = content.replace(/{{originalPrice}}/g, product.originalPrice?.toFixed(2) || '')
  content = content.replace(/{{discount}}/g, product.discount || '')
  content = content.replace(/{{platform}}/g, product.platform)
  content = content.replace(/{{category}}/g, product.category)
  content = content.replace(/{{affiliateUrl}}/g, product.affiliateUrl || product.productUrl)

  return content
}

async function generateImage(product: any, platform: SocialPlatform, options?: any): Promise<string> {
  // In production, this would call the content-generator package
  // For now, return a placeholder URL
  return `https://api.placeholder.com/generate/image/${platform}/${product.id}`
}

async function generateVideo(product: any, platform: SocialPlatform, options?: any): Promise<string> {
  return `https://api.placeholder.com/generate/video/${platform}/${product.id}`
}

async function generateStory(product: any, platform: SocialPlatform, options?: any): Promise<string> {
  return `https://api.placeholder.com/generate/story/${platform}/${product.id}`
}

async function generateCarousel(products: any[], platform: SocialPlatform, options?: any): Promise<string[]> {
  return products.map(p => 
    `https://api.placeholder.com/generate/carousel/${platform}/${p.id}`
  )
}

async function generateCollection(products: any[], platform: SocialPlatform): Promise<string> {
  return `https://api.placeholder.com/generate/collection/${platform}`
}

async function generateGrid(products: any[], platform: SocialPlatform): Promise<string> {
  return `https://api.placeholder.com/generate/grid/${platform}`
}

async function generateHashtags(
  platform: SocialPlatform,
  category?: string,
  keywords?: string[]
): Promise<string[]> {
  const baseHashtags = {
    INSTAGRAM: ['ofertas', 'desconto', 'promoção', 'achados', 'compras'],
    TIKTOK: ['tiktokmademebuyit', 'achados', 'promoção', 'desconto', 'comprinhas'],
    WHATSAPP: []
  }

  const categoryHashtags: Record<string, string[]> = {
    'Eletrônicos': ['tech', 'tecnologia', 'gadgets', 'eletrônicos'],
    'Moda': ['moda', 'fashion', 'style', 'look', 'outfit'],
    'Beleza': ['beleza', 'skincare', 'makeup', 'beauty', 'autocuidado'],
    'Casa': ['casa', 'decoração', 'home', 'organização']
  }

  const hashtags = [...(baseHashtags[platform] || [])]
  
  if (category && categoryHashtags[category]) {
    hashtags.push(...categoryHashtags[category])
  }

  if (keywords) {
    hashtags.push(...keywords)
  }

  // Remove duplicates and limit
  return [...new Set(hashtags)].slice(0, 30)
}

async function generateCaption(
  product: any,
  platform: SocialPlatform,
  style: string = 'casual'
): Promise<string> {
  const styles = {
    casual: `Gente, olha que achado! 😍 ${product.title} com ${product.discount} de desconto! Corre que é por tempo limitado! 🏃‍♀️`,
    professional: `Oportunidade especial: ${product.title} disponível com desconto de ${product.discount}. Aproveite esta oferta exclusiva.`,
    urgent: `🚨 ÚLTIMAS UNIDADES! ${product.title} com ${product.discount} OFF! Não perca essa chance! ⏰`,
    funny: `POV: Você vê ${product.title} com ${product.discount} de desconto e sua carteira chora 😭💳 Mas vale a pena! 🤪`
  }

  return styles[style] || styles.casual
}

function adjustForPlatform(content: any, platform: SocialPlatform): any {
  switch (platform) {
    case 'INSTAGRAM':
      // Instagram specific adjustments
      content.allowComments = true
      content.allowLikes = true
      content.showOnProfile = true
      break
    
    case 'TIKTOK':
      // TikTok specific adjustments
      content.allowDuet = true
      content.allowStitch = true
      content.privacy = 'PUBLIC'
      break
    
    case 'WHATSAPP':
      // WhatsApp specific adjustments
      content.readReceipts = false
      content.forwardingScore = 0
      break
  }

  return content
}