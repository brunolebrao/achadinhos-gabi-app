import axios, { AxiosInstance } from 'axios'
import FormData from 'form-data'
import { TikTokConfig } from './types'

export class TikTokClient {
  private client: AxiosInstance
  private config: TikTokConfig
  private baseUrl = 'https://open-api.tiktok.com'

  constructor(config: TikTokConfig) {
    this.config = config
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      }
    })
  }

  async verifyToken(): Promise<boolean> {
    try {
      const response = await this.client.get('/oauth/userinfo/', {
        params: {
          open_id: this.config.openId,
          access_token: this.config.accessToken
        }
      })
      return response.status === 200
    } catch (error) {
      console.error('TikTok token verification failed:', error)
      return false
    }
  }

  async getUserInfo(): Promise<any> {
    try {
      const response = await this.client.get('/user/info/', {
        params: {
          open_id: this.config.openId,
          access_token: this.config.accessToken
        }
      })
      return response.data
    } catch (error) {
      console.error('Failed to get user info:', error)
      throw error
    }
  }

  async uploadVideo(videoPath: string, title: string): Promise<string> {
    try {
      // TikTok video upload is a multi-step process:
      // 1. Initialize upload
      const uploadId = await this.initializeUpload(videoPath)
      
      // 2. Upload video chunks
      await this.uploadVideoChunks(uploadId, videoPath)
      
      // 3. Create post with the uploaded video
      const postId = await this.createPost(uploadId, title)
      
      return postId
    } catch (error) {
      console.error('Failed to upload video:', error)
      throw error
    }
  }

  private async initializeUpload(videoPath: string): Promise<string> {
    const response = await this.client.post('/share/video/upload/init/', {
      open_id: this.config.openId,
      access_token: this.config.accessToken
    })
    
    return response.data.upload_id
  }

  private async uploadVideoChunks(uploadId: string, videoPath: string): Promise<void> {
    // In a real implementation, this would:
    // 1. Read the video file
    // 2. Split it into chunks if necessary
    // 3. Upload each chunk
    console.log('Uploading video chunks for upload ID:', uploadId)
  }

  private async createPost(uploadId: string, title: string): Promise<string> {
    const response = await this.client.post('/share/video/create/', {
      open_id: this.config.openId,
      access_token: this.config.accessToken,
      upload_id: uploadId,
      title: title
    })
    
    return response.data.share_id
  }

  async getVideoList(cursor?: string, maxCount: number = 20): Promise<any> {
    try {
      const response = await this.client.get('/video/list/', {
        params: {
          open_id: this.config.openId,
          access_token: this.config.accessToken,
          cursor: cursor || 0,
          max_count: maxCount
        }
      })
      return response.data
    } catch (error) {
      console.error('Failed to get video list:', error)
      throw error
    }
  }

  async getVideoInsights(videoIds: string[]): Promise<any> {
    try {
      const response = await this.client.post('/video/data/', {
        open_id: this.config.openId,
        access_token: this.config.accessToken,
        video_ids: videoIds
      })
      return response.data
    } catch (error) {
      console.error('Failed to get video insights:', error)
      throw error
    }
  }

  async searchHashtags(keyword: string): Promise<any> {
    try {
      const response = await this.client.get('/hashtag/search/', {
        params: {
          keyword,
          access_token: this.config.accessToken
        }
      })
      return response.data
    } catch (error) {
      console.error('Failed to search hashtags:', error)
      throw error
    }
  }

  async getTrendingHashtags(region: string = 'BR'): Promise<any> {
    try {
      const response = await this.client.get('/trending/hashtags/', {
        params: {
          region,
          access_token: this.config.accessToken
        }
      })
      return response.data
    } catch (error) {
      console.error('Failed to get trending hashtags:', error)
      throw error
    }
  }
}