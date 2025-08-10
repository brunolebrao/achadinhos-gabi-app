import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@repo/database'

export default async function socialAccountsRoutes(fastify: FastifyInstance) {
  // Get all social accounts
  fastify.get('/', async (request, reply) => {
    try {
      const accounts = await prisma.socialAccount.findMany({
        orderBy: {
          createdAt: 'desc'
        }
      })

      return {
        success: true,
        data: accounts
      }
    } catch (error: any) {
      fastify.log.error('Failed to fetch social accounts:', error)
      return reply.code(500).send({
        error: 'Failed to fetch social accounts',
        message: error.message
      })
    }
  })

  // Get accounts by platform
  fastify.get('/platform/:platform', async (request, reply) => {
    try {
      const { platform } = z.object({
        platform: z.enum(['INSTAGRAM', 'TIKTOK', 'WHATSAPP'])
      }).parse(request.params)

      const accounts = await prisma.socialAccount.findMany({
        where: {
          platform,
          isActive: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return {
        success: true,
        data: accounts
      }
    } catch (error: any) {
      fastify.log.error('Failed to fetch platform accounts:', error)
      return reply.code(500).send({
        error: 'Failed to fetch platform accounts',
        message: error.message
      })
    }
  })

  // Get single account
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = z.object({
        id: z.string()
      }).parse(request.params)

      const account = await prisma.socialAccount.findUnique({
        where: { id }
      })

      if (!account) {
        return reply.code(404).send({
          error: 'Account not found'
        })
      }

      return {
        success: true,
        data: account
      }
    } catch (error: any) {
      fastify.log.error('Failed to fetch account:', error)
      return reply.code(500).send({
        error: 'Failed to fetch account',
        message: error.message
      })
    }
  })

  // Update account status
  fastify.patch('/:id/status', async (request, reply) => {
    try {
      const { id } = z.object({
        id: z.string()
      }).parse(request.params)

      const { isActive } = z.object({
        isActive: z.boolean()
      }).parse(request.body)

      const account = await prisma.socialAccount.update({
        where: { id },
        data: { isActive }
      })

      return {
        success: true,
        data: account,
        message: `Account ${isActive ? 'activated' : 'deactivated'} successfully`
      }
    } catch (error: any) {
      fastify.log.error('Failed to update account status:', error)
      return reply.code(500).send({
        error: 'Failed to update account status',
        message: error.message
      })
    }
  })

  // Delete account
  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = z.object({
        id: z.string()
      }).parse(request.params)

      // Soft delete by setting isActive to false
      const account = await prisma.socialAccount.update({
        where: { id },
        data: { isActive: false }
      })

      return {
        success: true,
        message: 'Account disconnected successfully'
      }
    } catch (error: any) {
      fastify.log.error('Failed to delete account:', error)
      return reply.code(500).send({
        error: 'Failed to delete account',
        message: error.message
      })
    }
  })

  // Get account analytics
  fastify.get('/:id/analytics', async (request, reply) => {
    try {
      const { id } = z.object({
        id: z.string()
      }).parse(request.params)

      const account = await prisma.socialAccount.findUnique({
        where: { id },
        include: {
          posts: {
            where: {
              status: 'PUBLISHED'
            },
            orderBy: {
              publishedAt: 'desc'
            },
            take: 10
          }
        }
      })

      if (!account) {
        return reply.code(404).send({
          error: 'Account not found'
        })
      }

      // Calculate basic analytics
      const totalPosts = account.posts.length
      const thisMonth = new Date()
      thisMonth.setDate(1)
      
      const postsThisMonth = account.posts.filter(
        post => post.publishedAt && post.publishedAt >= thisMonth
      ).length

      const analytics = {
        totalPosts,
        postsThisMonth,
        followers: account.settings?.followersCount || 0,
        following: account.settings?.followingCount || 0,
        engagement: account.settings?.engagementRate || 0,
        lastPostDate: account.posts[0]?.publishedAt || null
      }

      return {
        success: true,
        data: analytics
      }
    } catch (error: any) {
      fastify.log.error('Failed to fetch account analytics:', error)
      return reply.code(500).send({
        error: 'Failed to fetch account analytics',
        message: error.message
      })
    }
  })
}