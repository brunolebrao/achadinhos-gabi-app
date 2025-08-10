import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import axios from 'axios'
import { prisma } from '@repo/database'

const INSTAGRAM_OAUTH_BASE = 'https://api.instagram.com/oauth'
const INSTAGRAM_GRAPH_BASE = 'https://graph.facebook.com/v18.0'

// Schema for OAuth callback
const callbackSchema = z.object({
  code: z.string(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_reason: z.string().optional(),
  error_description: z.string().optional()
})

// Schema for token refresh
const refreshSchema = z.object({
  accountId: z.string()
})

export default async function instagramOAuthRoutes(fastify: FastifyInstance) {
  // Initiate OAuth flow
  fastify.get('/authorize', async (request, reply) => {
    try {
      const { userId, redirectUri } = z.object({
        userId: z.string().optional(),
        redirectUri: z.string().optional()
      }).parse(request.query)

      const clientId = process.env.INSTAGRAM_APP_ID
      const clientSecret = process.env.INSTAGRAM_APP_SECRET
      const callbackUrl = process.env.INSTAGRAM_CALLBACK_URL
      
      if (!clientId) {
        fastify.log.error('Instagram App ID not configured in environment')
        return reply.code(500).send({
          error: 'Instagram App ID not configured',
          details: 'Please set INSTAGRAM_APP_ID in your environment variables'
        })
      }
      
      if (!clientSecret) {
        fastify.log.error('Instagram App Secret not configured in environment')
        return reply.code(500).send({
          error: 'Instagram App Secret not configured',
          details: 'Please set INSTAGRAM_APP_SECRET in your environment variables'
        })
      }
      
      if (!callbackUrl) {
        fastify.log.error('Instagram Callback URL not configured in environment')
        return reply.code(500).send({
          error: 'Instagram Callback URL not configured',
          details: 'Please set INSTAGRAM_CALLBACK_URL in your environment variables'
        })
      }
      
      fastify.log.info('Instagram OAuth authorization started', {
        userId: userId || 'anonymous',
        redirectUri: redirectUri || callbackUrl
      })

      // Generate state for CSRF protection
      const state = Buffer.from(JSON.stringify({
        userId: userId || 'default',
        timestamp: Date.now()
      })).toString('base64')

      // Build authorization URL
      const authUrl = new URL(`${INSTAGRAM_OAUTH_BASE}/authorize`)
      authUrl.searchParams.append('client_id', clientId)
      authUrl.searchParams.append('redirect_uri', callbackUrl)
      authUrl.searchParams.append('scope', 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management')
      authUrl.searchParams.append('response_type', 'code')
      authUrl.searchParams.append('state', state)

      const finalAuthUrl = authUrl.toString()
      fastify.log.info('Redirecting to Instagram OAuth', {
        url: finalAuthUrl.substring(0, 100) + '...',
        state: state.substring(0, 20) + '...'
      })

      return reply.redirect(finalAuthUrl)
    } catch (error: any) {
      fastify.log.error('Instagram OAuth authorize error:', error)
      return reply.code(500).send({
        error: 'Failed to initiate Instagram OAuth',
        message: error.message
      })
    }
  })

  // OAuth callback handler
  fastify.get('/callback', async (request, reply) => {
    const startTime = Date.now()
    
    try {
      fastify.log.info('Instagram OAuth callback received', {
        query: Object.keys(request.query),
        ip: request.ip
      })
      
      const params = callbackSchema.parse(request.query)

      // Check for errors from Instagram
      if (params.error) {
        fastify.log.error('Instagram OAuth error:', {
          error: params.error,
          reason: params.error_reason,
          description: params.error_description
        })

        // Redirect to frontend with error
        const errorUrl = new URL(`${process.env.CORS_ORIGIN}/social-accounts`)
        errorUrl.searchParams.append('error', params.error)
        errorUrl.searchParams.append('message', params.error_description || 'Instagram authorization failed')
        
        return reply.redirect(errorUrl.toString())
      }

      fastify.log.info('Starting token exchange process')
      
      // Exchange code for short-lived token
      const tokenResponse = await exchangeCodeForToken(params.code)
      fastify.log.info('Short-lived token obtained')
      
      // Exchange short-lived token for long-lived token
      const longLivedToken = await getLongLivedToken(tokenResponse.access_token)
      fastify.log.info('Long-lived token obtained', {
        expiresIn: longLivedToken.expires_in
      })
      
      // Get user info and pages
      const userInfo = await getUserInfo(longLivedToken.access_token)
      fastify.log.info('User info retrieved', {
        userId: userInfo.id,
        userName: userInfo.name
      })
      
      const pages = await getPages(longLivedToken.access_token, userInfo.id)
      fastify.log.info('Facebook pages retrieved', {
        pageCount: pages.length,
        hasInstagram: pages.some(p => p.instagram_business_account)
      })
      
      // Get Instagram Business Account from pages
      const instagramAccount = await getInstagramBusinessAccount(pages, longLivedToken.access_token)

      if (!instagramAccount) {
        fastify.log.error('No Instagram Business Account found', {
          pageCount: pages.length,
          pagesWithInstagram: pages.filter(p => p.instagram_business_account).length
        })
        throw new Error('No Instagram Business Account found. Please ensure your Instagram account is connected to a Facebook Page and is a Business/Creator account.')
      }
      
      fastify.log.info('Instagram Business Account found', {
        instagramId: instagramAccount.id,
        username: instagramAccount.username,
        pageId: instagramAccount.pageId
      })

      // Save or update account in database
      const account = await prisma.socialAccount.upsert({
        where: {
          platform_accountId: {
            platform: 'INSTAGRAM',
            accountId: instagramAccount.id
          }
        },
        update: {
          username: instagramAccount.username,
          accessToken: longLivedToken.access_token,
          refreshToken: null, // Instagram doesn't provide refresh tokens, we use long-lived tokens
          isActive: true,
          settings: {
            userId: userInfo.id,
            userName: userInfo.name,
            pageId: instagramAccount.pageId,
            pageName: instagramAccount.pageName,
            profilePictureUrl: instagramAccount.profile_picture_url,
            followersCount: instagramAccount.followers_count,
            mediaCount: instagramAccount.media_count,
            tokenExpiresAt: new Date(Date.now() + (longLivedToken.expires_in * 1000)).toISOString()
          }
        },
        create: {
          platform: 'INSTAGRAM',
          accountId: instagramAccount.id,
          username: instagramAccount.username,
          accessToken: longLivedToken.access_token,
          refreshToken: null,
          isActive: true,
          settings: {
            userId: userInfo.id,
            userName: userInfo.name,
            pageId: instagramAccount.pageId,
            pageName: instagramAccount.pageName,
            profilePictureUrl: instagramAccount.profile_picture_url,
            followersCount: instagramAccount.followers_count,
            mediaCount: instagramAccount.media_count,
            tokenExpiresAt: new Date(Date.now() + (longLivedToken.expires_in * 1000)).toISOString()
          }
        }
      })

      const processingTime = Date.now() - startTime
      fastify.log.info(`Instagram account connected successfully: @${instagramAccount.username}`, {
        accountId: account.id,
        processingTimeMs: processingTime
      })

      // Redirect to frontend with success
      const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000'
      const successUrl = new URL(`${corsOrigin}/social-accounts`)
      successUrl.searchParams.append('success', 'true')
      successUrl.searchParams.append('platform', 'instagram')
      successUrl.searchParams.append('username', instagramAccount.username)
      
      fastify.log.info('Redirecting to frontend with success', {
        redirectUrl: successUrl.toString()
      })
      
      return reply.redirect(successUrl.toString())
    } catch (error: any) {
      const processingTime = Date.now() - startTime
      fastify.log.error('Instagram OAuth callback error:', {
        error: error.message,
        stack: error.stack,
        processingTimeMs: processingTime
      })
      
      // Redirect to frontend with error
      const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000'
      const errorUrl = new URL(`${corsOrigin}/social-accounts`)
      errorUrl.searchParams.append('error', 'callback_failed')
      errorUrl.searchParams.append('message', error.message || 'Failed to connect Instagram account')
      
      fastify.log.info('Redirecting to frontend with error', {
        redirectUrl: errorUrl.toString(),
        errorMessage: error.message
      })
      
      return reply.redirect(errorUrl.toString())
    }
  })

  // Refresh long-lived token (should be called periodically)
  fastify.post('/refresh-token', async (request, reply) => {
    try {
      const { accountId } = refreshSchema.parse(request.body)

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

      // Refresh the long-lived token (valid for 60 days)
      const refreshUrl = `${INSTAGRAM_GRAPH_BASE}/refresh_access_token`
      const response = await axios.get(refreshUrl, {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: account.accessToken
        }
      })

      const newToken = response.data

      // Update token in database
      await prisma.socialAccount.update({
        where: {
          id: account.id
        },
        data: {
          accessToken: newToken.access_token,
          settings: {
            ...(account.settings as any),
            tokenExpiresAt: new Date(Date.now() + (newToken.expires_in * 1000)).toISOString(),
            tokenRefreshedAt: new Date().toISOString()
          }
        }
      })

      return {
        success: true,
        message: 'Instagram token refreshed successfully',
        expiresIn: newToken.expires_in
      }
    } catch (error: any) {
      fastify.log.error('Instagram token refresh error:', error)
      return reply.code(500).send({
        error: 'Failed to refresh Instagram token',
        message: error.message
      })
    }
  })

  // Disconnect Instagram account
  fastify.delete('/disconnect/:accountId', async (request, reply) => {
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

      // Mark account as inactive instead of deleting
      await prisma.socialAccount.update({
        where: {
          id: account.id
        },
        data: {
          isActive: false
        }
      })

      return {
        success: true,
        message: 'Instagram account disconnected successfully'
      }
    } catch (error: any) {
      fastify.log.error('Instagram disconnect error:', error)
      return reply.code(500).send({
        error: 'Failed to disconnect Instagram account',
        message: error.message
      })
    }
  })
}

// Helper functions
async function exchangeCodeForToken(code: string): Promise<any> {
  const url = `${INSTAGRAM_OAUTH_BASE}/access_token`
  
  const response = await axios.post(url, new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    grant_type: 'authorization_code',
    redirect_uri: process.env.INSTAGRAM_CALLBACK_URL!,
    code
  }), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })

  return response.data
}

async function getLongLivedToken(shortLivedToken: string): Promise<any> {
  const url = `${INSTAGRAM_GRAPH_BASE}/access_token`
  
  const response = await axios.get(url, {
    params: {
      grant_type: 'ig_exchange_token',
      client_secret: process.env.INSTAGRAM_APP_SECRET!,
      access_token: shortLivedToken
    }
  })

  return response.data
}

async function getUserInfo(accessToken: string): Promise<any> {
  const url = `${INSTAGRAM_GRAPH_BASE}/me`
  
  const response = await axios.get(url, {
    params: {
      fields: 'id,name,email',
      access_token: accessToken
    }
  })

  return response.data
}

async function getPages(accessToken: string, userId: string): Promise<any[]> {
  const url = `${INSTAGRAM_GRAPH_BASE}/${userId}/accounts`
  
  const response = await axios.get(url, {
    params: {
      fields: 'id,name,access_token,instagram_business_account',
      access_token: accessToken
    }
  })

  return response.data.data || []
}

async function getInstagramBusinessAccount(pages: any[], accessToken: string): Promise<any> {
  for (const page of pages) {
    if (page.instagram_business_account) {
      // Get Instagram account details
      const url = `${INSTAGRAM_GRAPH_BASE}/${page.instagram_business_account.id}`
      
      const response = await axios.get(url, {
        params: {
          fields: 'id,username,name,profile_picture_url,followers_count,media_count,biography,website',
          access_token: page.access_token || accessToken
        }
      })

      return {
        ...response.data,
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: page.access_token
      }
    }
  }

  return null
}