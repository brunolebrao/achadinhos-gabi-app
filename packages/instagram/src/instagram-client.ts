import axios, { AxiosInstance } from 'axios'
import FormData from 'form-data'
import { InstagramConfig } from './types'

export class InstagramClient {
  private client: AxiosInstance
  private config: InstagramConfig
  private baseUrl = 'https://graph.instagram.com/v18.0'

  constructor(config: InstagramConfig) {
    this.config = config
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.accessToken}`
      }
    })
  }

  async verifyToken(): Promise<boolean> {
    try {
      const response = await this.client.get('/me', {
        params: {
          fields: 'id,username'
        }
      })
      return response.status === 200
    } catch (error) {
      console.error('Instagram token verification failed:', error)
      return false
    }
  }

  async getBusinessAccount(): Promise<any> {
    try {
      const response = await this.client.get(`/${this.config.businessAccountId || 'me'}`, {
        params: {
          fields: 'id,username,followers_count,media_count,profile_picture_url'
        }
      })
      return response.data
    } catch (error) {
      console.error('Failed to get business account:', error)
      throw error
    }
  }

  async uploadMedia(mediaUrl: string, caption?: string): Promise<string> {
    try {
      const containerId = await this.createMediaContainer(mediaUrl, caption)
      const publishedId = await this.publishMediaContainer(containerId)
      return publishedId
    } catch (error) {
      console.error('Failed to upload media:', error)
      throw error
    }
  }

  private async createMediaContainer(mediaUrl: string, caption?: string): Promise<string> {
    const params: any = {
      image_url: mediaUrl
    }
    
    if (caption) {
      params.caption = caption
    }

    const response = await this.client.post(
      `/${this.config.businessAccountId || 'me'}/media`,
      null,
      { params }
    )

    return response.data.id
  }

  private async publishMediaContainer(containerId: string): Promise<string> {
    const response = await this.client.post(
      `/${this.config.businessAccountId || 'me'}/media_publish`,
      null,
      {
        params: {
          creation_id: containerId
        }
      }
    )

    return response.data.id
  }

  async getMediaInsights(mediaId: string): Promise<any> {
    try {
      const response = await this.client.get(`/${mediaId}/insights`, {
        params: {
          metric: 'impressions,reach,engagement,likes,comments,shares,saved'
        }
      })
      return response.data
    } catch (error) {
      console.error('Failed to get media insights:', error)
      throw error
    }
  }

  async schedulePost(mediaUrl: string, caption: string, scheduledTime: Date): Promise<string> {
    try {
      const timestamp = Math.floor(scheduledTime.getTime() / 1000)
      
      const params: any = {
        image_url: mediaUrl,
        caption,
        published: false,
        scheduled_publish_time: timestamp
      }

      const response = await this.client.post(
        `/${this.config.businessAccountId || 'me'}/media`,
        null,
        { params }
      )

      return response.data.id
    } catch (error) {
      console.error('Failed to schedule post:', error)
      throw error
    }
  }
}