import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import axios from 'axios'
import { prisma } from '@repo/database'

const INSTAGRAM_GRAPH_BASE = 'https://graph.facebook.com/v18.0'

// Schema for manual token input
const manualTokenSchema = z.object({
  accessToken: z.string().min(50, 'Token deve ter pelo menos 50 caracteres'),
  pageId: z.string().optional(),
  instagramBusinessAccountId: z.string().optional(),
  forceSave: z.boolean().default(false)
})

export default async function instagramManualTokenRoutes(fastify: FastifyInstance) {
  
  // Manual token setup endpoint
  fastify.post('/setup-token', async (request, reply) => {
    const startTime = Date.now()
    
    try {
      fastify.log.info('Manual Instagram token setup started')
      
      const { accessToken, pageId, instagramBusinessAccountId, forceSave } = manualTokenSchema.parse(request.body)
      
      // Step 1: Validate token by getting basic user info
      fastify.log.info('Validating access token...')
      const userResponse = await axios.get(`${INSTAGRAM_GRAPH_BASE}/me`, {
        params: {
          fields: 'id,name,email',
          access_token: accessToken
        }
      })
      
      const userInfo = userResponse.data
      fastify.log.info('Token validated, user info retrieved', {
        userId: userInfo.id,
        userName: userInfo.name
      })
      
      // Step 2: Handle Instagram Business Account setup
      let instagramAccount = null
      let pageInfo = null
      
      if (instagramBusinessAccountId) {
        // Direct Instagram Business Account setup
        fastify.log.info('Using direct Instagram Business Account setup', {
          instagramBusinessAccountId
        })
        
        try {
          const instagramResponse = await axios.get(`${INSTAGRAM_GRAPH_BASE}/${instagramBusinessAccountId}`, {
            params: {
              fields: 'id,username,name,profile_picture_url,followers_count,media_count,biography,website',
              access_token: accessToken
            }
          })
          
          instagramAccount = {
            ...instagramResponse.data,
            pageId: null,
            pageName: null,
            pageAccessToken: null
          }
          
          fastify.log.info('Instagram Business Account accessed directly', {
            username: instagramAccount.username,
            id: instagramAccount.id
          })
          
        } catch (error: any) {
          fastify.log.warn('Direct Instagram access failed, trying pages approach...', {
            error: error.message
          })
        }
      }
      
      // Fallback: Try to get pages if direct access failed or no Instagram ID provided
      if (!instagramAccount) {
        fastify.log.info('Retrieving Facebook pages...')
        try {
          const pagesResponse = await axios.get(`${INSTAGRAM_GRAPH_BASE}/${userInfo.id}/accounts`, {
            params: {
              fields: 'id,name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}',
              access_token: accessToken
            }
          })
          
          const pages = pagesResponse.data.data || []
          fastify.log.info('Facebook pages retrieved', {
            pageCount: pages.length,
            pagesWithInstagram: pages.filter(p => p.instagram_business_account).length
          })
          
          // Find target page
          let targetPage = null
          if (pageId) {
            targetPage = pages.find(page => page.id === pageId)
          } else {
            targetPage = pages.find(page => page.instagram_business_account)
          }
          
          if (targetPage && targetPage.instagram_business_account) {
            instagramAccount = {
              ...targetPage.instagram_business_account,
              pageId: targetPage.id,
              pageName: targetPage.name,
              pageAccessToken: targetPage.access_token
            }
            pageInfo = {
              id: targetPage.id,
              name: targetPage.name,
              accessToken: targetPage.access_token
            }
          }
        } catch (pagesError: any) {
          fastify.log.warn('Pages retrieval failed', {
            error: pagesError.message
          })
        }
      }
      
      if (!instagramAccount) {
        if (forceSave) {
          // Create a minimal account with just user info for testing
          instagramAccount = {
            id: `user_${userInfo.id}`,
            username: userInfo.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown',
            name: userInfo.name || 'Unknown User',
            profile_picture_url: null,
            followers_count: null,
            media_count: null,
            biography: null,
            website: null,
            pageId: null,
            pageName: null,
            pageAccessToken: null
          }
          
          fastify.log.info('Creating minimal Instagram account for testing', {
            id: instagramAccount.id,
            username: instagramAccount.username
          })
        } else {
          throw new Error('Unable to access Instagram Business Account. Please ensure the token has proper permissions and the account is accessible.')
        }
      }
      
      fastify.log.info('Instagram Business Account identified', {
        instagramId: instagramAccount.id,
        username: instagramAccount.username,
        pageId: instagramAccount.pageId,
        pageName: instagramAccount.pageName
      })
      
      // Step 4: Verify token expiration
      const debugResponse = await axios.get(`${INSTAGRAM_GRAPH_BASE}/debug_token`, {
        params: {
          input_token: accessToken,
          access_token: `${process.env.INSTAGRAM_APP_ID}|${process.env.INSTAGRAM_APP_SECRET}`
        }
      })
      
      const tokenInfo = debugResponse.data.data
      const expiresAt = tokenInfo.expires_at ? new Date(tokenInfo.expires_at * 1000) : null
      const isLongLived = tokenInfo.expires_at > (Date.now() / 1000) + (24 * 60 * 60) // More than 24 hours
      
      fastify.log.info('Token expiration info', {
        expiresAt: expiresAt?.toISOString(),
        isLongLived,
        daysUntilExpiry: expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
      })
      
      // Step 5: Save account in database
      const account = await prisma.socialAccount.upsert({
        where: {
          platform_accountId: {
            platform: 'INSTAGRAM',
            accountId: instagramAccount.id
          }
        },
        update: {
          username: instagramAccount.username,
          accessToken: instagramAccount.pageAccessToken || accessToken,
          refreshToken: null,
          isActive: true,
          settings: {
            userId: userInfo.id,
            userName: userInfo.name,
            userEmail: userInfo.email,
            pageId: instagramAccount.pageId,
            pageName: instagramAccount.pageName,
            profilePictureUrl: instagramAccount.profile_picture_url,
            followersCount: instagramAccount.followers_count,
            mediaCount: instagramAccount.media_count,
            biography: instagramAccount.biography,
            website: instagramAccount.website,
            tokenExpiresAt: expiresAt?.toISOString(),
            tokenType: isLongLived ? 'long_lived' : 'short_lived',
            setupMethod: 'manual_token',
            setupAt: new Date().toISOString()
          }
        },
        create: {
          platform: 'INSTAGRAM',
          accountId: instagramAccount.id,
          username: instagramAccount.username,
          accessToken: instagramAccount.pageAccessToken || accessToken,
          refreshToken: null,
          isActive: true,
          settings: {
            userId: userInfo.id,
            userName: userInfo.name,
            userEmail: userInfo.email,
            pageId: instagramAccount.pageId,
            pageName: instagramAccount.pageName,
            profilePictureUrl: instagramAccount.profile_picture_url,
            followersCount: instagramAccount.followers_count,
            mediaCount: instagramAccount.media_count,
            biography: instagramAccount.biography,
            website: instagramAccount.website,
            tokenExpiresAt: expiresAt?.toISOString(),
            tokenType: isLongLived ? 'long_lived' : 'short_lived',
            setupMethod: 'manual_token',
            setupAt: new Date().toISOString()
          }
        }
      })
      
      const processingTime = Date.now() - startTime
      fastify.log.info(`Instagram account setup completed: @${instagramAccount.username}`, {
        accountId: account.id,
        processingTimeMs: processingTime
      })
      
      return {
        success: true,
        message: 'Instagram account configured successfully',
        account: {
          id: account.id,
          platform: account.platform,
          username: account.username,
          accountId: account.accountId,
          isActive: account.isActive,
          settings: account.settings
        },
        instagram: {
          id: instagramAccount.id,
          username: instagramAccount.username,
          name: instagramAccount.name,
          followersCount: instagramAccount.followers_count,
          mediaCount: instagramAccount.media_count,
          pageId: instagramAccount.pageId,
          pageName: instagramAccount.pageName
        },
        token: {
          expiresAt: expiresAt?.toISOString(),
          isLongLived,
          daysUntilExpiry: expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
        }
      }
      
    } catch (error: any) {
      const processingTime = Date.now() - startTime
      fastify.log.error('Manual Instagram token setup failed:', {
        error: error.message,
        stack: error.stack,
        processingTimeMs: processingTime
      })
      
      if (error.response) {
        // API error from Facebook/Instagram
        const apiError = error.response.data?.error
        return reply.code(400).send({
          error: 'Instagram API Error',
          message: apiError?.message || error.message,
          details: apiError?.error_user_msg || 'Please check your token and try again',
          type: apiError?.type || 'api_error'
        })
      }
      
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Invalid input',
          details: error.errors
        })
      }
      
      return reply.code(500).send({
        error: 'Setup failed',
        message: error.message || 'Failed to setup Instagram account'
      })
    }
  })

  // Get token info endpoint
  fastify.get('/token-info/:accountId', async (request, reply) => {
    try {
      const { accountId } = z.object({
        accountId: z.string()
      }).parse(request.params)

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
          error: 'Instagram account not found'
        })
      }

      // Check token validity
      try {
        const debugResponse = await axios.get(`${INSTAGRAM_GRAPH_BASE}/debug_token`, {
          params: {
            input_token: account.accessToken,
            access_token: `${process.env.INSTAGRAM_APP_ID}|${process.env.INSTAGRAM_APP_SECRET}`
          }
        })

        const tokenInfo = debugResponse.data.data
        const expiresAt = tokenInfo.expires_at ? new Date(tokenInfo.expires_at * 1000) : null
        const isValid = tokenInfo.is_valid
        const daysUntilExpiry = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null

        return {
          success: true,
          account: {
            id: account.id,
            username: account.username,
            isActive: account.isActive
          },
          token: {
            isValid,
            expiresAt: expiresAt?.toISOString(),
            daysUntilExpiry,
            needsRenewal: daysUntilExpiry !== null && daysUntilExpiry < 7
          },
          settings: account.settings
        }
      } catch (tokenError: any) {
        fastify.log.error('Token validation failed:', tokenError.message)
        
        return {
          success: true,
          account: {
            id: account.id,
            username: account.username,
            isActive: account.isActive
          },
          token: {
            isValid: false,
            error: 'Token validation failed',
            needsRenewal: true
          },
          settings: account.settings
        }
      }
    } catch (error: any) {
      fastify.log.error('Token info retrieval failed:', error)
      return reply.code(500).send({
        error: 'Failed to get token info',
        message: error.message
      })
    }
  })
}