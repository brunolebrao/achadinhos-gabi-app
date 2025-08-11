import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@repo/database'
import { URLShortenerService } from '@repo/shared/services/url-shortener'
import crypto from 'crypto'

const shortenSchema = z.object({
  url: z.string().url(),
  customCode: z.string().optional(),
  expiresAt: z.string().datetime().optional()
})

const batchShortenSchema = z.object({
  urls: z.array(z.string().url()).max(100)
})

export default async function urlShortenerRoutes(fastify: FastifyInstance) {
  // Initialize URL shortener service
  const urlShortener = new URLShortenerService({
    provider: process.env.URL_SHORTENER_PROVIDER as any || 'custom',
    apiKey: process.env.BITLY_API_KEY,
    customDomain: process.env.SHORT_URL_DOMAIN || 'achadin.ho'
  })
  
  // Create shortened URL
  fastify.post('/shorten', async (request, reply) => {
    const { url, customCode, expiresAt } = shortenSchema.parse(request.body)
    
    try {
      // Check if URL already exists in database
      const existing = await prisma.shortUrl.findFirst({
        where: { originalUrl: url }
      })
      
      if (existing && !existing.expiresAt) {
        return {
          id: existing.id,
          shortUrl: existing.shortUrl,
          originalUrl: existing.originalUrl,
          shortCode: existing.shortCode,
          clicks: existing.clicks,
          createdAt: existing.createdAt
        }
      }
      
      // Generate short code
      let shortCode = customCode
      if (!shortCode) {
        // Use service to generate or try custom generation
        const result = await urlShortener.shorten(url)
        shortCode = result.shortCode
      }
      
      // Ensure uniqueness
      let attempts = 0
      while (attempts < 5) {
        const exists = await prisma.shortUrl.findUnique({
          where: { shortCode }
        })
        
        if (!exists) break
        
        // Generate new code if collision
        shortCode = crypto.randomBytes(4).toString('hex')
        attempts++
      }
      
      // Save to database
      const shortUrl = await prisma.shortUrl.create({
        data: {
          originalUrl: url,
          shortUrl: `https://${process.env.SHORT_URL_DOMAIN || 'achadin.ho'}/${shortCode}`,
          shortCode,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          userId: (request as any).user?.id
        }
      })
      
      return {
        id: shortUrl.id,
        shortUrl: shortUrl.shortUrl,
        originalUrl: shortUrl.originalUrl,
        shortCode: shortUrl.shortCode,
        clicks: 0,
        createdAt: shortUrl.createdAt
      }
    } catch (error) {
      console.error('Error shortening URL:', error)
      reply.status(500).send({ error: 'Failed to shorten URL' })
    }
  })
  
  // Batch shorten URLs
  fastify.post('/shorten/batch', async (request, reply) => {
    const { urls } = batchShortenSchema.parse(request.body)
    
    try {
      const results = await Promise.all(
        urls.map(async (url) => {
          // Check existing
          const existing = await prisma.shortUrl.findFirst({
            where: { originalUrl: url }
          })
          
          if (existing) {
            return {
              originalUrl: existing.originalUrl,
              shortUrl: existing.shortUrl,
              shortCode: existing.shortCode
            }
          }
          
          // Create new
          const result = await urlShortener.shorten(url)
          
          // Save to database
          await prisma.shortUrl.create({
            data: {
              originalUrl: url,
              shortUrl: result.shortUrl,
              shortCode: result.shortCode,
              userId: (request as any).user?.id
            }
          })
          
          return {
            originalUrl: url,
            shortUrl: result.shortUrl,
            shortCode: result.shortCode
          }
        })
      )
      
      return { urls: results }
    } catch (error) {
      console.error('Error batch shortening URLs:', error)
      reply.status(500).send({ error: 'Failed to shorten URLs' })
    }
  })
  
  // Redirect short URL
  fastify.get('/:shortCode', async (request, reply) => {
    const { shortCode } = z.object({
      shortCode: z.string()
    }).parse(request.params)
    
    try {
      const shortUrl = await prisma.shortUrl.findUnique({
        where: { shortCode }
      })
      
      if (!shortUrl) {
        return reply.status(404).send({ error: 'Short URL not found' })
      }
      
      // Check if expired
      if (shortUrl.expiresAt && shortUrl.expiresAt < new Date()) {
        return reply.status(410).send({ error: 'Short URL has expired' })
      }
      
      // Increment click count
      await prisma.shortUrl.update({
        where: { id: shortUrl.id },
        data: {
          clicks: { increment: 1 },
          lastClickedAt: new Date()
        }
      })
      
      // Record click analytics
      await prisma.urlClick.create({
        data: {
          shortUrlId: shortUrl.id,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] || '',
          referer: request.headers.referer || ''
        }
      })
      
      // Redirect to original URL
      return reply.redirect(301, shortUrl.originalUrl)
    } catch (error) {
      console.error('Error redirecting short URL:', error)
      reply.status(500).send({ error: 'Failed to redirect' })
    }
  })
  
  // Get URL stats
  fastify.get('/:shortCode/stats', async (request, reply) => {
    const { shortCode } = z.object({
      shortCode: z.string()
    }).parse(request.params)
    
    try {
      const shortUrl = await prisma.shortUrl.findUnique({
        where: { shortCode },
        include: {
          clicks: {
            orderBy: { clickedAt: 'desc' },
            take: 100
          }
        }
      })
      
      if (!shortUrl) {
        return reply.status(404).send({ error: 'Short URL not found' })
      }
      
      // Calculate stats
      const stats = {
        url: shortUrl.shortUrl,
        originalUrl: shortUrl.originalUrl,
        clicks: shortUrl.clicks,
        createdAt: shortUrl.createdAt,
        lastClickedAt: shortUrl.lastClickedAt,
        expiresAt: shortUrl.expiresAt,
        recentClicks: shortUrl.clicks.map(click => ({
          timestamp: click.clickedAt,
          ipAddress: click.ipAddress,
          userAgent: click.userAgent,
          referer: click.referer
        }))
      }
      
      return stats
    } catch (error) {
      console.error('Error getting URL stats:', error)
      reply.status(500).send({ error: 'Failed to get stats' })
    }
  })
  
  // List user's shortened URLs
  fastify.get('/my-urls', async (request, reply) => {
    const userId = (request as any).user?.id
    
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
    
    try {
      const urls = await prisma.shortUrl.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100
      })
      
      return {
        urls: urls.map(url => ({
          id: url.id,
          shortUrl: url.shortUrl,
          originalUrl: url.originalUrl,
          shortCode: url.shortCode,
          clicks: url.clicks,
          createdAt: url.createdAt,
          expiresAt: url.expiresAt,
          lastClickedAt: url.lastClickedAt
        }))
      }
    } catch (error) {
      console.error('Error listing URLs:', error)
      reply.status(500).send({ error: 'Failed to list URLs' })
    }
  })
  
  // Delete shortened URL
  fastify.delete('/:shortCode', async (request, reply) => {
    const { shortCode } = z.object({
      shortCode: z.string()
    }).parse(request.params)
    
    const userId = (request as any).user?.id
    
    try {
      const shortUrl = await prisma.shortUrl.findUnique({
        where: { shortCode }
      })
      
      if (!shortUrl) {
        return reply.status(404).send({ error: 'Short URL not found' })
      }
      
      // Check ownership
      if (shortUrl.userId && shortUrl.userId !== userId) {
        return reply.status(403).send({ error: 'Forbidden' })
      }
      
      // Delete URL and related clicks
      await prisma.urlClick.deleteMany({
        where: { shortUrlId: shortUrl.id }
      })
      
      await prisma.shortUrl.delete({
        where: { id: shortUrl.id }
      })
      
      return { success: true }
    } catch (error) {
      console.error('Error deleting URL:', error)
      reply.status(500).send({ error: 'Failed to delete URL' })
    }
  })
}