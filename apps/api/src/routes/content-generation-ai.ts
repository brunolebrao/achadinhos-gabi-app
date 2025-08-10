import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { OpenAIService } from '@repo/shared/ai/openai-service'
import { prisma } from '@repo/database'

const generateCaptionSchema = z.object({
  productId: z.string(),
  platform: z.enum(['whatsapp', 'instagram', 'tiktok', 'telegram']),
  contentType: z.enum(['post', 'story', 'reel', 'message']),
  tone: z.enum(['casual', 'professional', 'enthusiastic', 'urgent']).optional(),
  includeEmojis: z.boolean().optional(),
  maxLength: z.number().optional(),
  language: z.string().optional()
})

const generateHashtagsSchema = z.object({
  productId: z.string(),
  platform: z.enum(['instagram', 'tiktok']),
  maxHashtags: z.number().min(1).max(30).optional(),
  includeTrending: z.boolean().optional(),
  category: z.string().optional()
})

const optimizeContentSchema = z.object({
  content: z.string(),
  fromPlatform: z.string(),
  toPlatform: z.string()
})

const suggestTimingSchema = z.object({
  platform: z.enum(['instagram', 'tiktok', 'whatsapp', 'telegram']),
  targetAudience: z.string().optional(),
  timezone: z.string().optional()
})

const batchGenerateSchema = z.object({
  productIds: z.array(z.string()).min(1).max(10),
  platforms: z.array(z.enum(['whatsapp', 'instagram', 'tiktok', 'telegram'])),
  generateHashtags: z.boolean().optional()
})

export default async function contentGenerationAIRoutes(fastify: FastifyInstance) {
  const aiService = new OpenAIService()

  // Generate AI-powered caption
  fastify.post('/generate-caption', async (request, reply) => {
    try {
      const data = generateCaptionSchema.parse(request.body)
      
      // Get product from database
      const product = await prisma.product.findUnique({
        where: { id: data.productId }
      })
      
      if (!product) {
        return reply.code(404).send({
          error: 'Product not found'
        })
      }
      
      // Generate caption using AI
      const caption = await aiService.generateCaption({
        product: {
          title: product.title,
          price: product.price,
          originalPrice: product.originalPrice || undefined,
          discount: product.discount || undefined,
          category: product.category,
          platform: product.platform.toLowerCase(),
          imageUrl: product.imageUrl
        },
        platform: data.platform,
        contentType: data.contentType,
        tone: data.tone,
        includeEmojis: data.includeEmojis,
        maxLength: data.maxLength,
        language: data.language
      })
      
      // Save generated caption as a template for reuse
      await prisma.template.create({
        data: {
          name: `AI: ${product.title.substring(0, 30)}... - ${data.platform}`,
          content: caption,
          platform: data.platform.toUpperCase() as any,
          type: data.contentType === 'message' ? 'MESSAGE' : 
                data.contentType === 'story' ? 'STORY' :
                data.contentType === 'reel' ? 'REEL' : 'FEED_POST',
          category: product.category,
          variables: {
            productId: product.id,
            generatedBy: 'AI',
            timestamp: new Date().toISOString()
          }
        }
      })
      
      return {
        success: true,
        caption,
        characterCount: caption.length,
        product: {
          id: product.id,
          title: product.title,
          price: product.price
        }
      }
    } catch (error: any) {
      fastify.log.error('Caption generation error:', error)
      
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors
        })
      }
      
      return reply.code(500).send({
        error: 'Failed to generate caption',
        message: error.message
      })
    }
  })

  // Generate hashtags
  fastify.post('/generate-hashtags', async (request, reply) => {
    try {
      const data = generateHashtagsSchema.parse(request.body)
      
      // Get product from database
      const product = await prisma.product.findUnique({
        where: { id: data.productId }
      })
      
      if (!product) {
        return reply.code(404).send({
          error: 'Product not found'
        })
      }
      
      // Generate hashtags using AI
      const hashtags = await aiService.generateHashtags({
        product: {
          title: product.title,
          price: product.price,
          originalPrice: product.originalPrice || undefined,
          discount: product.discount || undefined,
          category: product.category,
          platform: product.platform.toLowerCase()
        },
        platform: data.platform,
        maxHashtags: data.maxHashtags,
        includeTrending: data.includeTrending,
        category: data.category
      })
      
      return {
        success: true,
        hashtags,
        count: hashtags.length,
        formatted: hashtags.map(tag => `#${tag}`).join(' ')
      }
    } catch (error: any) {
      fastify.log.error('Hashtag generation error:', error)
      
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors
        })
      }
      
      return reply.code(500).send({
        error: 'Failed to generate hashtags',
        message: error.message
      })
    }
  })

  // Optimize content for different platform
  fastify.post('/optimize-content', async (request, reply) => {
    try {
      const data = optimizeContentSchema.parse(request.body)
      
      const optimizedContent = await aiService.optimizeContentForPlatform(
        data.content,
        data.fromPlatform,
        data.toPlatform
      )
      
      return {
        success: true,
        originalContent: data.content,
        optimizedContent,
        fromPlatform: data.fromPlatform,
        toPlatform: data.toPlatform,
        changes: {
          lengthBefore: data.content.length,
          lengthAfter: optimizedContent.length
        }
      }
    } catch (error: any) {
      fastify.log.error('Content optimization error:', error)
      
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors
        })
      }
      
      return reply.code(500).send({
        error: 'Failed to optimize content',
        message: error.message
      })
    }
  })

  // Suggest best posting times
  fastify.post('/suggest-timing', async (request, reply) => {
    try {
      const data = suggestTimingSchema.parse(request.body)
      
      const times = await aiService.suggestBestPostingTime(
        data.platform,
        data.targetAudience || 'general Brazilian audience',
        data.timezone || 'America/Sao_Paulo'
      )
      
      return {
        success: true,
        platform: data.platform,
        suggestedTimes: times,
        timezone: data.timezone || 'America/Sao_Paulo',
        recommendation: `Post at these times for maximum engagement on ${data.platform}`
      }
    } catch (error: any) {
      fastify.log.error('Timing suggestion error:', error)
      
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors
        })
      }
      
      return reply.code(500).send({
        error: 'Failed to suggest timing',
        message: error.message
      })
    }
  })

  // Analyze product virality potential
  fastify.get('/analyze-virality/:productId', async (request, reply) => {
    try {
      const { productId } = z.object({
        productId: z.string()
      }).parse(request.params)
      
      const product = await prisma.product.findUnique({
        where: { id: productId }
      })
      
      if (!product) {
        return reply.code(404).send({
          error: 'Product not found'
        })
      }
      
      const viralityScore = await aiService.analyzeProductForVirality({
        title: product.title,
        price: product.price,
        originalPrice: product.originalPrice || undefined,
        discount: product.discount || undefined,
        category: product.category,
        platform: product.platform.toLowerCase()
      })
      
      return {
        success: true,
        product: {
          id: product.id,
          title: product.title
        },
        viralityScore,
        rating: viralityScore >= 80 ? 'High' : 
                viralityScore >= 60 ? 'Medium' : 
                viralityScore >= 40 ? 'Low' : 'Very Low',
        recommendation: viralityScore >= 70 ? 
          'This product has high viral potential. Prioritize it for promotion!' :
          viralityScore >= 50 ?
          'This product has moderate potential. Consider bundling with other deals.' :
          'This product has low viral potential. Focus on targeted audiences.'
      }
    } catch (error: any) {
      fastify.log.error('Virality analysis error:', error)
      return reply.code(500).send({
        error: 'Failed to analyze virality',
        message: error.message
      })
    }
  })

  // Batch generate content for multiple products and platforms
  fastify.post('/batch-generate', async (request, reply) => {
    try {
      const data = batchGenerateSchema.parse(request.body)
      
      // Get products from database
      const products = await prisma.product.findMany({
        where: {
          id: { in: data.productIds }
        }
      })
      
      if (products.length === 0) {
        return reply.code(404).send({
          error: 'No products found'
        })
      }
      
      const results = []
      
      for (const product of products) {
        for (const platform of data.platforms) {
          try {
            // Generate caption
            const caption = await aiService.generateCaption({
              product: {
                title: product.title,
                price: product.price,
                originalPrice: product.originalPrice || undefined,
                discount: product.discount || undefined,
                category: product.category,
                platform: product.platform.toLowerCase(),
                imageUrl: product.imageUrl
              },
              platform: platform as any,
              contentType: platform === 'whatsapp' || platform === 'telegram' ? 'message' : 'post',
              includeEmojis: true
            })
            
            // Generate hashtags if requested and platform supports them
            let hashtags: string[] = []
            if (data.generateHashtags && (platform === 'instagram' || platform === 'tiktok')) {
              hashtags = await aiService.generateHashtags({
                product: {
                  title: product.title,
                  price: product.price,
                  originalPrice: product.originalPrice || undefined,
                  discount: product.discount || undefined,
                  category: product.category,
                  platform: product.platform.toLowerCase()
                },
                platform: platform as any,
                maxHashtags: 10
              })
            }
            
            results.push({
              productId: product.id,
              productTitle: product.title,
              platform,
              caption,
              hashtags,
              success: true
            })
          } catch (error: any) {
            results.push({
              productId: product.id,
              productTitle: product.title,
              platform,
              success: false,
              error: error.message
            })
          }
        }
      }
      
      const successCount = results.filter(r => r.success).length
      const failureCount = results.filter(r => !r.success).length
      
      return {
        success: true,
        totalGenerated: successCount,
        totalFailed: failureCount,
        results
      }
    } catch (error: any) {
      fastify.log.error('Batch generation error:', error)
      
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors
        })
      }
      
      return reply.code(500).send({
        error: 'Failed to batch generate content',
        message: error.message
      })
    }
  })

  // Generate product description for SEO
  fastify.post('/generate-description', async (request, reply) => {
    try {
      const { productId } = z.object({
        productId: z.string()
      }).parse(request.body)
      
      const product = await prisma.product.findUnique({
        where: { id: productId }
      })
      
      if (!product) {
        return reply.code(404).send({
          error: 'Product not found'
        })
      }
      
      const description = await aiService.generateProductDescription({
        title: product.title,
        price: product.price,
        originalPrice: product.originalPrice || undefined,
        discount: product.discount || undefined,
        category: product.category,
        platform: product.platform.toLowerCase()
      })
      
      // Update product with generated description
      await prisma.product.update({
        where: { id: productId },
        data: {
          // Add a description field to your Product model if not exists
          // description: description
        }
      })
      
      return {
        success: true,
        productId,
        description,
        wordCount: description.split(' ').length
      }
    } catch (error: any) {
      fastify.log.error('Description generation error:', error)
      return reply.code(500).send({
        error: 'Failed to generate description',
        message: error.message
      })
    }
  })
}