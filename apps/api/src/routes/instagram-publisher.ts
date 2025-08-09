import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { instagramPublisherService } from '../services/instagram-publisher.service'
import { prisma } from '@repo/database'
import multer from 'fastify-multer'
import path from 'path'
import fs from 'fs'

// Schema for publishing
const publishSchema = z.object({
  accountId: z.string(),
  caption: z.string().max(2200), // Instagram caption limit
  mediaType: z.enum(['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM', 'REELS']).optional(),
  imageUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  carouselMedia: z.array(z.object({
    imageUrl: z.string().url().optional(),
    videoUrl: z.string().url().optional(),
    mediaType: z.enum(['IMAGE', 'VIDEO'])
  })).optional(),
  coverUrl: z.string().url().optional(),
  audioName: z.string().optional(),
  shareToFeed: z.boolean().optional()
})

// Schema for scheduling
const scheduleSchema = publishSchema.extend({
  scheduledFor: z.string().transform(str => new Date(str))
})

// Schema for media upload
const uploadResponseSchema = z.object({
  url: z.string().url(),
  type: z.enum(['image', 'video']),
  size: z.number(),
  filename: z.string()
})

export default async function instagramPublisherRoutes(fastify: FastifyInstance) {
  // Configure multer for file uploads
  const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads', 'instagram')
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }
      cb(null, uploadDir)
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
    }
  })
  
  const upload = multer({
    storage,
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB max
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
      const mimetype = allowedTypes.test(file.mimetype)
      
      if (mimetype && extname) {
        return cb(null, true)
      } else {
        cb(new Error('Invalid file type. Only images and videos are allowed.'))
      }
    }
  })
  
  // Publish content immediately
  fastify.post('/publish', async (request, reply) => {
    try {
      const data = publishSchema.parse(request.body)
      
      // Check if account exists and is active
      const account = await prisma.socialAccount.findUnique({
        where: {
          platform_accountId: {
            platform: 'INSTAGRAM',
            accountId: data.accountId
          }
        }
      })
      
      if (!account) {
        return reply.code(404).send({
          error: 'Instagram account not found'
        })
      }
      
      if (!account.isActive) {
        return reply.code(400).send({
          error: 'Instagram account is not active'
        })
      }
      
      // Publish to Instagram
      const result = await instagramPublisherService.publish({
        accountId: data.accountId,
        caption: data.caption,
        mediaType: data.mediaType,
        imageUrl: data.imageUrl,
        videoUrl: data.videoUrl,
        carouselMedia: data.carouselMedia,
        coverUrl: data.coverUrl,
        audioName: data.audioName,
        shareToFeed: data.shareToFeed
      })
      
      if (result.success) {
        fastify.log.info(`Published to Instagram: ${result.postId}`)
        return {
          success: true,
          postId: result.postId,
          message: 'Content published successfully to Instagram'
        }
      } else {
        return reply.code(400).send({
          success: false,
          error: result.error || 'Failed to publish content'
        })
      }
    } catch (error: any) {
      fastify.log.error('Instagram publish error:', error)
      
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors
        })
      }
      
      return reply.code(500).send({
        error: 'Failed to publish to Instagram',
        message: error.message
      })
    }
  })
  
  // Schedule content for later
  fastify.post('/schedule', async (request, reply) => {
    try {
      const data = scheduleSchema.parse(request.body)
      
      // Check if account exists
      const account = await prisma.socialAccount.findUnique({
        where: {
          platform_accountId: {
            platform: 'INSTAGRAM',
            accountId: data.accountId
          }
        }
      })
      
      if (!account) {
        return reply.code(404).send({
          error: 'Instagram account not found'
        })
      }
      
      // Schedule the post
      const result = await instagramPublisherService.schedule({
        accountId: data.accountId,
        caption: data.caption,
        mediaType: data.mediaType,
        imageUrl: data.imageUrl,
        videoUrl: data.videoUrl,
        carouselMedia: data.carouselMedia,
        coverUrl: data.coverUrl,
        audioName: data.audioName,
        shareToFeed: data.shareToFeed,
        scheduledFor: data.scheduledFor
      })
      
      if (result.success) {
        return {
          success: true,
          scheduledPostId: result.scheduledPostId,
          message: 'Content scheduled successfully'
        }
      } else {
        return reply.code(400).send({
          success: false,
          error: result.error || 'Failed to schedule content'
        })
      }
    } catch (error: any) {
      fastify.log.error('Instagram schedule error:', error)
      
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors
        })
      }
      
      return reply.code(500).send({
        error: 'Failed to schedule Instagram post',
        message: error.message
      })
    }
  })
  
  // Upload media file
  fastify.post('/media/upload', { preHandler: upload.single('media') }, async (request: any, reply) => {
    try {
      if (!request.file) {
        return reply.code(400).send({
          error: 'No file uploaded'
        })
      }
      
      const file = request.file
      const fileUrl = `${request.protocol}://${request.hostname}/uploads/instagram/${file.filename}`
      
      // Determine file type
      const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video'
      
      const response = {
        url: fileUrl,
        type: fileType,
        size: file.size,
        filename: file.filename
      }
      
      return response
    } catch (error: any) {
      fastify.log.error('Media upload error:', error)
      return reply.code(500).send({
        error: 'Failed to upload media',
        message: error.message
      })
    }
  })
  
  // Get scheduled posts
  fastify.get('/scheduled', async (request, reply) => {
    try {
      const { accountId, status } = z.object({
        accountId: z.string().optional(),
        status: z.enum(['SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED']).optional()
      }).parse(request.query)
      
      const where: any = {
        platform: 'INSTAGRAM'
      }
      
      if (accountId) where.accountId = accountId
      if (status) where.status = status
      
      const posts = await prisma.socialPost.findMany({
        where,
        orderBy: {
          scheduledFor: 'asc'
        },
        take: 50
      })
      
      return {
        posts,
        total: posts.length
      }
    } catch (error: any) {
      fastify.log.error('Get scheduled posts error:', error)
      return reply.code(500).send({
        error: 'Failed to fetch scheduled posts',
        message: error.message
      })
    }
  })
  
  // Cancel scheduled post
  fastify.delete('/scheduled/:postId', async (request, reply) => {
    try {
      const { postId } = z.object({
        postId: z.string()
      }).parse(request.params)
      
      const post = await prisma.socialPost.findUnique({
        where: { id: postId }
      })
      
      if (!post) {
        return reply.code(404).send({
          error: 'Scheduled post not found'
        })
      }
      
      if (post.status !== 'SCHEDULED') {
        return reply.code(400).send({
          error: `Cannot cancel post with status: ${post.status}`
        })
      }
      
      // Update status to cancelled
      await prisma.socialPost.update({
        where: { id: postId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date()
        }
      })
      
      return {
        success: true,
        message: 'Scheduled post cancelled'
      }
    } catch (error: any) {
      fastify.log.error('Cancel scheduled post error:', error)
      return reply.code(500).send({
        error: 'Failed to cancel scheduled post',
        message: error.message
      })
    }
  })
  
  // Get post insights
  fastify.get('/insights/:postId', async (request, reply) => {
    try {
      const { postId } = z.object({
        postId: z.string()
      }).parse(request.params)
      
      const { accountId } = z.object({
        accountId: z.string()
      }).parse(request.query)
      
      const insights = await instagramPublisherService.getPostInsights(postId, accountId)
      
      return {
        success: true,
        insights
      }
    } catch (error: any) {
      fastify.log.error('Get insights error:', error)
      return reply.code(500).send({
        error: 'Failed to fetch post insights',
        message: error.message
      })
    }
  })
  
  // Delete published post
  fastify.delete('/post/:postId', async (request, reply) => {
    try {
      const { postId } = z.object({
        postId: z.string()
      }).parse(request.params)
      
      const { accountId } = z.object({
        accountId: z.string()
      }).parse(request.query)
      
      const success = await instagramPublisherService.deletePost(postId, accountId)
      
      if (success) {
        return {
          success: true,
          message: 'Post deleted successfully'
        }
      } else {
        return reply.code(400).send({
          success: false,
          error: 'Failed to delete post'
        })
      }
    } catch (error: any) {
      fastify.log.error('Delete post error:', error)
      return reply.code(500).send({
        error: 'Failed to delete post',
        message: error.message
      })
    }
  })
  
  // Refresh access token
  fastify.post('/refresh-token', async (request, reply) => {
    try {
      const { accountId } = z.object({
        accountId: z.string()
      }).parse(request.body)
      
      const newToken = await instagramPublisherService.refreshAccessToken(accountId)
      
      return {
        success: true,
        message: 'Token refreshed successfully'
      }
    } catch (error: any) {
      fastify.log.error('Refresh token error:', error)
      return reply.code(500).send({
        error: 'Failed to refresh access token',
        message: error.message
      })
    }
  })
  
  // Process scheduled posts (called by worker or cron)
  fastify.post('/process-scheduled', async (request, reply) => {
    try {
      await instagramPublisherService.processScheduledPosts()
      
      return {
        success: true,
        message: 'Scheduled posts processed'
      }
    } catch (error: any) {
      fastify.log.error('Process scheduled posts error:', error)
      return reply.code(500).send({
        error: 'Failed to process scheduled posts',
        message: error.message
      })
    }
  })
}