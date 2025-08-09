import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@repo/database'
import axios from 'axios'
import crypto from 'crypto'

// Mock mode for development
const MOCK_MODE = process.env.INSTAGRAM_MOCK_MODE === 'true'

// Instagram/Threads OAuth URLs
// Para Threads App, usamos a URL do Facebook OAuth
const INSTAGRAM_OAUTH_URL = 'https://www.facebook.com/v18.0/dialog/oauth'
const INSTAGRAM_TOKEN_URL = 'https://graph.facebook.com/v18.0/oauth/access_token'
const INSTAGRAM_GRAPH_URL = 'https://graph.instagram.com'

// Validation schemas
const connectSchema = z.object({
  userId: z.string().optional(),
  state: z.string().optional()
})

const callbackSchema = z.object({
  code: z.string(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_reason: z.string().optional(),
  error_description: z.string().optional()
})

const exchangeTokenSchema = z.object({
  code: z.string(),
  userId: z.string()
})

export default async function authInstagramRoutes(fastify: FastifyInstance) {
  // Generate OAuth URL for Instagram connection
  fastify.get('/connect', async (request, reply) => {
    try {
      const { userId, state } = connectSchema.parse(request.query)
      
      // Generate state for CSRF protection
      const stateData = {
        userId: userId || 'anonymous',
        timestamp: Date.now(),
        random: crypto.randomBytes(16).toString('hex')
      }
      const encodedState = Buffer.from(JSON.stringify(stateData)).toString('base64')
      
      // In mock mode, return a special URL that simulates OAuth
      if (MOCK_MODE) {
        const mockParams = new URLSearchParams({
          code: 'mock_auth_code_' + Date.now(),
          state: encodedState
        })
        const authUrl = `${process.env.INSTAGRAM_REDIRECT_URI}?${mockParams.toString()}`
        
        return {
          authUrl,
          state: encodedState,
          mockMode: true
        }
      }
      
      // Build OAuth URL for Threads/Instagram
      // Para Threads App, precisamos usar os escopos do Facebook
      const params = new URLSearchParams({
        client_id: process.env.INSTAGRAM_APP_ID!,
        redirect_uri: process.env.INSTAGRAM_REDIRECT_URI!,
        scope: 'instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement',
        response_type: 'code',
        state: encodedState
      })
      
      const authUrl = `${INSTAGRAM_OAUTH_URL}?${params.toString()}`
      
      return {
        authUrl,
        state: encodedState
      }
    } catch (error) {
      fastify.log.error('Instagram connect error:', error)
      reply.code(400).send({
        error: 'Invalid request',
        message: error instanceof Error ? error.message : 'Failed to generate auth URL'
      })
    }
  })

  // Handle Instagram OAuth callback
  fastify.get('/callback', async (request, reply) => {
    try {
      const params = callbackSchema.parse(request.query)
      
      // Check for errors from Instagram
      if (params.error) {
        fastify.log.error('Instagram OAuth error:', params)
        return reply.redirect(`http://localhost:3006/social-accounts?error=${params.error_description || params.error}`)
      }
      
      // Decode and validate state
      let stateData: any = {}
      if (params.state) {
        try {
          stateData = JSON.parse(Buffer.from(params.state, 'base64').toString())
        } catch (err) {
          fastify.log.error('Invalid state parameter:', err)
        }
      }
      
      // Redirect to frontend with code
      const redirectUrl = new URL('http://localhost:3006/social-accounts')
      redirectUrl.searchParams.set('instagram_code', params.code)
      redirectUrl.searchParams.set('state', params.state || '')
      if (stateData.userId) {
        redirectUrl.searchParams.set('userId', stateData.userId)
      }
      
      return reply.redirect(redirectUrl.toString())
    } catch (error) {
      fastify.log.error('Instagram callback error:', error)
      return reply.redirect('http://localhost:3006/social-accounts?error=callback_failed')
    }
  })

  // Exchange authorization code for access token
  fastify.post('/exchange-token', async (request, reply) => {
    try {
      const { code, userId } = exchangeTokenSchema.parse(request.body)
      
      // In mock mode, simulate successful token exchange
      if (MOCK_MODE && code.startsWith('mock_auth_code_')) {
        const mockAccountId = 'mock_ig_' + Date.now()
        const mockUsername = 'achadinhos_gabi_demo'
        
        // Save mock account to database
        const socialAccount = await prisma.socialAccount.upsert({
          where: {
            platform_accountId: {
              platform: 'INSTAGRAM',
              accountId: mockAccountId
            }
          },
          update: {
            username: mockUsername,
            accessToken: 'mock_access_token_' + Date.now(),
            settings: {
              mockMode: true,
              instagramAccountId: mockAccountId,
              followersCount: 1234,
              mediaCount: 56,
              profilePictureUrl: 'https://via.placeholder.com/150'
            },
            isActive: true,
            updatedAt: new Date()
          },
          create: {
            platform: 'INSTAGRAM',
            accountId: mockAccountId,
            username: mockUsername,
            accessToken: 'mock_access_token_' + Date.now(),
            settings: {
              mockMode: true,
              instagramAccountId: mockAccountId,
              followersCount: 1234,
              mediaCount: 56,
              profilePictureUrl: 'https://via.placeholder.com/150'
            },
            isActive: true
          }
        })
        
        return {
          success: true,
          account: {
            id: socialAccount.id,
            platform: socialAccount.platform,
            username: socialAccount.username,
            accountId: socialAccount.accountId,
            isActive: socialAccount.isActive
          },
          mockMode: true
        }
      }
      
      // Exchange code for access token using Facebook Graph API
      const tokenResponse = await axios.get(INSTAGRAM_TOKEN_URL, {
        params: {
          client_id: process.env.INSTAGRAM_APP_ID,
          client_secret: process.env.INSTAGRAM_APP_SECRET,
          redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
          code
        }
      })
      
      const { access_token } = tokenResponse.data
      
      // Get Facebook pages to find Instagram Business Account
      const pagesResponse = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
        params: {
          access_token
        }
      })
      
      if (!pagesResponse.data.data || pagesResponse.data.data.length === 0) {
        throw new Error('No Facebook pages found. Instagram connection requires a Facebook page.')
      }
      
      const page = pagesResponse.data.data[0]
      const pageAccessToken = page.access_token
      
      // Get Instagram Business Account ID from the page
      const igAccountResponse = await axios.get(`https://graph.facebook.com/v18.0/${page.id}`, {
        params: {
          fields: 'instagram_business_account',
          access_token: pageAccessToken
        }
      })
      
      if (!igAccountResponse.data.instagram_business_account) {
        throw new Error('No Instagram Business Account connected to this Facebook page.')
      }
      
      const instagramAccountId = igAccountResponse.data.instagram_business_account.id
      
      // Get Instagram account details
      const profileResponse = await axios.get(`https://graph.facebook.com/v18.0/${instagramAccountId}`, {
        params: {
          fields: 'id,username,name,followers_count,media_count,profile_picture_url',
          access_token: pageAccessToken
        }
      })
      
      const profile = profileResponse.data
      
      // Save to database
      const socialAccount = await prisma.socialAccount.upsert({
        where: {
          platform_accountId: {
            platform: 'INSTAGRAM',
            accountId: instagramAccountId
          }
        },
        update: {
          username: profile.username || profile.name,
          accessToken: pageAccessToken,
          settings: {
            instagramAccountId,
            facebookPageId: page.id,
            facebookPageName: page.name,
            followersCount: profile.followers_count,
            mediaCount: profile.media_count,
            profilePictureUrl: profile.profile_picture_url
          },
          isActive: true,
          updatedAt: new Date()
        },
        create: {
          platform: 'INSTAGRAM',
          accountId: instagramAccountId,
          username: profile.username || profile.name,
          accessToken: pageAccessToken,
          settings: {
            instagramAccountId,
            facebookPageId: page.id,
            facebookPageName: page.name,
            followersCount: profile.followers_count,
            mediaCount: profile.media_count,
            profilePictureUrl: profile.profile_picture_url
          },
          isActive: true
        }
      })
      
      return {
        success: true,
        account: {
          id: socialAccount.id,
          platform: socialAccount.platform,
          username: socialAccount.username,
          accountId: socialAccount.accountId,
          isActive: socialAccount.isActive
        }
      }
    } catch (error: any) {
      fastify.log.error('Token exchange error:', error.response?.data || error)
      
      if (error.response?.data) {
        return reply.code(400).send({
          error: 'Instagram API error',
          message: error.response.data.error_message || 'Failed to exchange token',
          details: error.response.data
        })
      }
      
      reply.code(500).send({
        error: 'Token exchange failed',
        message: error.message || 'Failed to exchange authorization code'
      })
    }
  })

  // Refresh access token (Facebook tokens are long-lived by default)
  fastify.post('/refresh-token', async (request, reply) => {
    try {
      const { accountId } = z.object({ accountId: z.string() }).parse(request.body)
      
      // Get current account
      const account = await prisma.socialAccount.findUnique({
        where: { id: accountId }
      })
      
      if (!account) {
        return reply.code(404).send({ error: 'Account not found' })
      }
      
      // Facebook Page tokens are long-lived (no expiration) when generated from long-lived user tokens
      // So we just return success
      return {
        success: true,
        message: 'Facebook Page tokens do not expire'
      }
    } catch (error: any) {
      fastify.log.error('Token refresh error:', error.response?.data || error)
      reply.code(500).send({
        error: 'Token refresh failed',
        message: error.message || 'Failed to refresh access token'
      })
    }
  })

  // Disconnect Instagram account
  fastify.delete('/disconnect/:accountId', async (request, reply) => {
    try {
      const { accountId } = z.object({ accountId: z.string() }).parse(request.params)
      
      // Soft delete - just mark as inactive
      await prisma.socialAccount.update({
        where: { id: accountId },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      })
      
      return { success: true }
    } catch (error) {
      fastify.log.error('Disconnect error:', error)
      reply.code(500).send({
        error: 'Disconnect failed',
        message: 'Failed to disconnect Instagram account'
      })
    }
  })

  // Get connected Instagram accounts
  fastify.get('/accounts', async (request, reply) => {
    try {
      const accounts = await prisma.socialAccount.findMany({
        where: {
          platform: 'INSTAGRAM',
          isActive: true
        },
        select: {
          id: true,
          platform: true,
          username: true,
          accountId: true,
          isActive: true,
          createdAt: true,
          settings: true
        }
      })
      
      return { accounts }
    } catch (error) {
      fastify.log.error('Get accounts error:', error)
      reply.code(500).send({
        error: 'Failed to fetch accounts',
        message: 'Could not retrieve Instagram accounts'
      })
    }
  })
}