import axios from 'axios'
import { prisma } from '@repo/database'

const INSTAGRAM_GRAPH_URL = 'https://graph.instagram.com'
const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com/v18.0'

export interface InstagramProfile {
  id: string
  username: string
  account_type: string
  media_count: number
  followers_count?: number
  follows_count?: number
  profile_picture_url?: string
  biography?: string
  website?: string
}

export interface InstagramMedia {
  id: string
  caption?: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url: string
  thumbnail_url?: string
  permalink: string
  timestamp: string
  like_count?: number
  comments_count?: number
}

export interface InstagramInsights {
  impressions: number
  reach: number
  profile_views: number
  website_clicks: number
  follower_count: number
  email_contacts?: number
  phone_call_clicks?: number
  text_message_clicks?: number
  get_directions_clicks?: number
}

class InstagramAuthService {
  /**
   * Get Instagram Business Account ID from Facebook Page
   */
  async getBusinessAccountId(accessToken: string, pageId: string): Promise<string | null> {
    try {
      const response = await axios.get(`${FACEBOOK_GRAPH_URL}/${pageId}`, {
        params: {
          fields: 'instagram_business_account',
          access_token: accessToken
        }
      })
      
      return response.data.instagram_business_account?.id || null
    } catch (error) {
      console.error('Error getting Instagram Business Account ID:', error)
      return null
    }
  }

  /**
   * Get user's Facebook pages (needed for Instagram Business API)
   */
  async getFacebookPages(accessToken: string) {
    try {
      const response = await axios.get(`${FACEBOOK_GRAPH_URL}/me/accounts`, {
        params: {
          access_token: accessToken
        }
      })
      
      return response.data.data || []
    } catch (error) {
      console.error('Error getting Facebook pages:', error)
      return []
    }
  }

  /**
   * Get Instagram profile information
   */
  async getProfile(accountId: string, accessToken: string): Promise<InstagramProfile | null> {
    try {
      const response = await axios.get(`${INSTAGRAM_GRAPH_URL}/${accountId}`, {
        params: {
          fields: 'id,username,account_type,media_count,followers_count,follows_count,profile_picture_url,biography,website',
          access_token: accessToken
        }
      })
      
      return response.data
    } catch (error) {
      console.error('Error getting Instagram profile:', error)
      return null
    }
  }

  /**
   * Get recent media from Instagram account
   */
  async getMedia(accountId: string, accessToken: string, limit: number = 25): Promise<InstagramMedia[]> {
    try {
      const response = await axios.get(`${INSTAGRAM_GRAPH_URL}/${accountId}/media`, {
        params: {
          fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
          limit,
          access_token: accessToken
        }
      })
      
      return response.data.data || []
    } catch (error) {
      console.error('Error getting Instagram media:', error)
      return []
    }
  }

  /**
   * Get Instagram insights (requires Business account)
   */
  async getInsights(accountId: string, accessToken: string, period: string = 'day'): Promise<InstagramInsights | null> {
    try {
      const metrics = [
        'impressions',
        'reach',
        'profile_views',
        'website_clicks',
        'follower_count',
        'email_contacts',
        'phone_call_clicks',
        'text_message_clicks',
        'get_directions_clicks'
      ]
      
      const response = await axios.get(`${INSTAGRAM_GRAPH_URL}/${accountId}/insights`, {
        params: {
          metric: metrics.join(','),
          period,
          access_token: accessToken
        }
      })
      
      // Parse insights data
      const insights: any = {}
      response.data.data.forEach((metric: any) => {
        insights[metric.name] = metric.values[0]?.value || 0
      })
      
      return insights
    } catch (error) {
      console.error('Error getting Instagram insights:', error)
      return null
    }
  }

  /**
   * Publish a photo to Instagram (requires Business account)
   */
  async publishPhoto(
    accountId: string,
    accessToken: string,
    imageUrl: string,
    caption?: string
  ): Promise<{ id: string } | null> {
    try {
      // Step 1: Create media container
      const containerResponse = await axios.post(
        `${INSTAGRAM_GRAPH_URL}/${accountId}/media`,
        {
          image_url: imageUrl,
          caption: caption || '',
          access_token: accessToken
        }
      )
      
      const creationId = containerResponse.data.id
      
      // Step 2: Publish the container
      const publishResponse = await axios.post(
        `${INSTAGRAM_GRAPH_URL}/${accountId}/media_publish`,
        {
          creation_id: creationId,
          access_token: accessToken
        }
      )
      
      return { id: publishResponse.data.id }
    } catch (error: any) {
      console.error('Error publishing to Instagram:', error.response?.data || error)
      return null
    }
  }

  /**
   * Check if access token is still valid
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await axios.get(`${INSTAGRAM_GRAPH_URL}/me`, {
        params: {
          fields: 'id',
          access_token: accessToken
        }
      })
      
      return !!response.data.id
    } catch (error) {
      return false
    }
  }

  /**
   * Get token expiration info
   */
  async getTokenInfo(accessToken: string): Promise<{ expires_at: number; scopes: string[] } | null> {
    try {
      const response = await axios.get(`${FACEBOOK_GRAPH_URL}/debug_token`, {
        params: {
          input_token: accessToken,
          access_token: `${process.env.INSTAGRAM_APP_ID}|${process.env.INSTAGRAM_APP_SECRET}`
        }
      })
      
      return {
        expires_at: response.data.data.expires_at,
        scopes: response.data.data.scopes || []
      }
    } catch (error) {
      console.error('Error getting token info:', error)
      return null
    }
  }

  /**
   * Schedule token refresh (should be called daily for tokens nearing expiry)
   */
  async scheduleTokenRefresh() {
    try {
      // Get all Instagram accounts
      const accounts = await prisma.socialAccount.findMany({
        where: {
          platform: 'INSTAGRAM',
          isActive: true
        }
      })
      
      for (const account of accounts) {
        const settings = account.settings as any
        if (settings?.tokenExpiresAt) {
          const expiresAt = new Date(settings.tokenExpiresAt)
          const daysUntilExpiry = Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          
          // Refresh if token expires in less than 10 days
          if (daysUntilExpiry < 10) {
            try {
              const response = await axios.get(`${INSTAGRAM_GRAPH_URL}/refresh_access_token`, {
                params: {
                  grant_type: 'ig_refresh_token',
                  access_token: account.accessToken
                }
              })
              
              // Update token in database
              await prisma.socialAccount.update({
                where: { id: account.id },
                data: {
                  accessToken: response.data.access_token,
                  settings: {
                    ...settings,
                    tokenExpiresAt: new Date(Date.now() + response.data.expires_in * 1000).toISOString()
                  }
                }
              })
              
              console.log(`Refreshed token for Instagram account: ${account.username}`)
            } catch (error) {
              console.error(`Failed to refresh token for account ${account.username}:`, error)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in token refresh schedule:', error)
    }
  }
}

export const instagramAuthService = new InstagramAuthService()