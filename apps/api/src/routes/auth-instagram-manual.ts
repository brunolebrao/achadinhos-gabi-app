import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@repo/database'
import axios from 'axios'

// Validation schema for manual token save
const saveTokenSchema = z.object({
  accessToken: z.string().min(1),
  accountId: z.string().min(1),
  username: z.string().optional(),
  settings: z.object({
    userId: z.string().optional(),
    appId: z.string().optional(),
    permissions: z.array(z.string()).optional(),
    pageId: z.string().optional(),
    pageName: z.string().optional()
  }).optional()
})

export default async function authInstagramManualRoutes(fastify: FastifyInstance) {
  // Save Instagram token manually (for development/testing)
  fastify.post('/save-token', async (request, reply) => {
    try {
      const data = saveTokenSchema.parse(request.body)
      
      // If username not provided, try to fetch from Instagram API
      let username = data.username
      let profileData: any = {}
      let finalToken = data.accessToken
      let tokenType = 'user'
      
      // First, check if this is a user token that needs to be converted to page token
      if (data.accessToken) {
        try {
          // Check if token works directly with Instagram
          const directTest = await axios.get(
            `https://graph.instagram.com/v18.0/${data.accountId}`,
            {
              params: {
                fields: 'id,username',
                access_token: data.accessToken
              }
            }
          )
          
          // If direct test works, use this token
          profileData = directTest.data
          username = profileData.username || profileData.name
          fastify.log.info('Token works directly with Instagram API')
        } catch (directError: any) {
          fastify.log.info('Direct token failed, trying to get Page Access Token...')
          
          // Try to get Page Access Token
          try {
            const pagesResponse = await axios.get(
              'https://graph.facebook.com/v18.0/me/accounts',
              {
                params: {
                  access_token: data.accessToken
                }
              }
            )
            
            if (pagesResponse.data?.data?.length > 0) {
              // Use the first page's token
              const page = pagesResponse.data.data[0]
              finalToken = page.access_token
              tokenType = 'page'
              
              fastify.log.info(`Found Facebook page: ${page.name}, trying Page Access Token...`)
              
              // Test the page token with Instagram
              const pageTokenTest = await axios.get(
                `https://graph.instagram.com/v18.0/${data.accountId}`,
                {
                  params: {
                    fields: 'id,username,name,followers_count,media_count,profile_picture_url',
                    access_token: finalToken
                  }
                }
              )
              
              profileData = pageTokenTest.data
              username = profileData.username || profileData.name
              fastify.log.info('Page Access Token works with Instagram!')
            } else {
              throw new Error('No Facebook pages found')
            }
          } catch (pageError: any) {
            fastify.log.warn('Could not get Page Access Token:', pageError.response?.data || pageError.message)
            username = `instagram_${data.accountId}`
          }
        }
      }
      
      // Check if account already exists
      const existingAccount = await prisma.socialAccount.findUnique({
        where: {
          platform_accountId: {
            platform: 'INSTAGRAM',
            accountId: data.accountId
          }
        }
      })
      
      const settings = {
        ...data.settings,
        instagramAccountId: data.accountId,
        tokenSavedAt: new Date().toISOString(),
        tokenType,
        tokenSource: 'manual',
        ...(profileData.followers_count && { followersCount: profileData.followers_count }),
        ...(profileData.media_count && { mediaCount: profileData.media_count }),
        ...(profileData.profile_picture_url && { profilePictureUrl: profileData.profile_picture_url })
      }
      
      let savedAccount
      
      if (existingAccount) {
        // Update existing account
        savedAccount = await prisma.socialAccount.update({
          where: { id: existingAccount.id },
          data: {
            username,
            accessToken: finalToken, // Use the final token (might be page token)
            settings,
            isActive: true,
            updatedAt: new Date()
          }
        })
        
        fastify.log.info(`Updated Instagram account: ${username}`)
      } else {
        // Create new account
        savedAccount = await prisma.socialAccount.create({
          data: {
            platform: 'INSTAGRAM',
            accountId: data.accountId,
            username,
            accessToken: finalToken, // Use the final token (might be page token)
            settings,
            isActive: true
          }
        })
        
        fastify.log.info(`Created new Instagram account: ${username}`)
      }
      
      return {
        success: true,
        account: {
          id: savedAccount.id,
          platform: savedAccount.platform,
          username: savedAccount.username,
          accountId: savedAccount.accountId,
          isActive: savedAccount.isActive,
          settings: savedAccount.settings
        }
      }
    } catch (error: any) {
      fastify.log.error('Save token error:', error)
      
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors
        })
      }
      
      reply.code(500).send({
        error: 'Failed to save token',
        message: error.message || 'An error occurred while saving the token'
      })
    }
  })
  
  // Verify saved token
  fastify.post('/verify-token', async (request, reply) => {
    try {
      const { accountId } = z.object({ accountId: z.string() }).parse(request.body)
      
      // Get account from database
      const account = await prisma.socialAccount.findUnique({
        where: {
          platform_accountId: {
            platform: 'INSTAGRAM',
            accountId
          }
        }
      })
      
      if (!account) {
        return reply.code(404).send({
          error: 'Account not found'
        })
      }
      
      // Test token with Instagram API
      try {
        const response = await axios.get(
          `https://graph.instagram.com/v18.0/${accountId}`,
          {
            params: {
              fields: 'id,username,name,followers_count,media_count',
              access_token: account.accessToken
            }
          }
        )
        
        return {
          success: true,
          valid: true,
          account: {
            id: account.id,
            username: response.data.username || account.username,
            accountId: response.data.id,
            followers: response.data.followers_count,
            mediaCount: response.data.media_count
          }
        }
      } catch (error: any) {
        fastify.log.error('Token verification failed:', error.response?.data || error)
        
        return {
          success: false,
          valid: false,
          error: error.response?.data?.error?.message || 'Token is invalid or expired'
        }
      }
    } catch (error: any) {
      fastify.log.error('Verify token error:', error)
      reply.code(500).send({
        error: 'Verification failed',
        message: error.message
      })
    }
  })
  
  // Get account media (test endpoint)
  fastify.get('/test-media/:accountId', async (request, reply) => {
    try {
      const { accountId } = z.object({ accountId: z.string() }).parse(request.params)
      
      // Get account from database
      const account = await prisma.socialAccount.findUnique({
        where: {
          platform_accountId: {
            platform: 'INSTAGRAM',
            accountId
          }
        }
      })
      
      if (!account) {
        return reply.code(404).send({
          error: 'Account not found'
        })
      }
      
      // Get media from Instagram API
      try {
        const response = await axios.get(
          `https://graph.instagram.com/v18.0/${accountId}/media`,
          {
            params: {
              fields: 'id,caption,media_type,media_url,timestamp,like_count,comments_count',
              access_token: account.accessToken,
              limit: 10
            }
          }
        )
        
        return {
          success: true,
          media: response.data.data,
          paging: response.data.paging
        }
      } catch (error: any) {
        fastify.log.error('Failed to fetch media:', error.response?.data || error)
        
        return reply.code(400).send({
          error: 'Failed to fetch media',
          message: error.response?.data?.error?.message || 'Could not retrieve media'
        })
      }
    } catch (error: any) {
      fastify.log.error('Test media error:', error)
      reply.code(500).send({
        error: 'Test failed',
        message: error.message
      })
    }
  })
}