import axios from 'axios'
import { prisma } from '@repo/database'
import FormData from 'form-data'
import fs from 'fs'
import path from 'path'

interface InstagramMediaContainer {
  id: string
  status?: string
  status_code?: string
  upload_url?: string
  error_message?: string
}

interface InstagramPublishResponse {
  id: string
}

interface PublishOptions {
  imageUrl?: string
  imagePath?: string
  videoUrl?: string
  videoPath?: string
  caption: string
  accountId: string
  mediaType?: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS'
  carouselMedia?: Array<{
    imageUrl?: string
    videoUrl?: string
    mediaType: 'IMAGE' | 'VIDEO'
  }>
  coverUrl?: string // For reels
  audioName?: string // For reels
  shareToFeed?: boolean // For reels - default true
}

export class InstagramPublisherService {
  private readonly graphApiUrl = 'https://graph.facebook.com/v18.0'
  private readonly appId = process.env.INSTAGRAM_APP_ID
  private readonly appSecret = process.env.INSTAGRAM_APP_SECRET
  
  /**
   * Get access token for an Instagram account
   */
  private async getAccessToken(accountId: string): Promise<string> {
    const account = await prisma.socialAccount.findUnique({
      where: {
        platform_accountId: {
          platform: 'INSTAGRAM',
          accountId
        }
      }
    })
    
    if (!account || !account.accessToken) {
      throw new Error('Instagram account not found or no access token')
    }
    
    return account.accessToken
  }
  
  /**
   * Refresh long-lived access token
   */
  async refreshAccessToken(accountId: string): Promise<string> {
    const currentToken = await this.getAccessToken(accountId)
    
    try {
      const response = await axios.get(`${this.graphApiUrl}/refresh_access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: this.appId,
          client_secret: this.appSecret,
          fb_exchange_token: currentToken
        }
      })
      
      const newToken = response.data.access_token
      const expiresIn = response.data.expires_in // Seconds until expiration
      
      // Update token in database
      await prisma.socialAccount.update({
        where: {
          platform_accountId: {
            platform: 'INSTAGRAM',
            accountId
          }
        },
        data: {
          accessToken: newToken,
          settings: {
            tokenRefreshedAt: new Date().toISOString(),
            tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
          }
        }
      })
      
      return newToken
    } catch (error: any) {
      console.error('Failed to refresh token:', error.response?.data || error)
      throw new Error('Failed to refresh Instagram access token')
    }
  }
  
  /**
   * Create media container for single image
   */
  private async createImageContainer(
    accountId: string,
    imageUrl: string,
    caption: string,
    accessToken: string
  ): Promise<InstagramMediaContainer> {
    try {
      const response = await axios.post(
        `${this.graphApiUrl}/${accountId}/media`,
        {
          image_url: imageUrl,
          caption,
          access_token: accessToken
        }
      )
      
      return response.data
    } catch (error: any) {
      console.error('Failed to create image container:', error.response?.data || error)
      throw new Error(error.response?.data?.error?.message || 'Failed to create media container')
    }
  }
  
  /**
   * Create media container for video/reel
   */
  private async createVideoContainer(
    accountId: string,
    videoUrl: string,
    caption: string,
    accessToken: string,
    mediaType: 'VIDEO' | 'REELS' = 'REELS',
    coverUrl?: string,
    audioName?: string,
    shareToFeed: boolean = true
  ): Promise<InstagramMediaContainer> {
    try {
      const params: any = {
        video_url: videoUrl,
        caption,
        access_token: accessToken,
        media_type: mediaType
      }
      
      // Additional params for Reels
      if (mediaType === 'REELS') {
        params.share_to_feed = shareToFeed
        if (coverUrl) params.cover_url = coverUrl
        if (audioName) params.audio_name = audioName
      }
      
      const response = await axios.post(
        `${this.graphApiUrl}/${accountId}/media`,
        params
      )
      
      return response.data
    } catch (error: any) {
      console.error('Failed to create video container:', error.response?.data || error)
      throw new Error(error.response?.data?.error?.message || 'Failed to create video container')
    }
  }
  
  /**
   * Create carousel container (multiple images/videos)
   */
  private async createCarouselContainer(
    accountId: string,
    carouselMedia: PublishOptions['carouselMedia'],
    caption: string,
    accessToken: string
  ): Promise<InstagramMediaContainer> {
    if (!carouselMedia || carouselMedia.length < 2 || carouselMedia.length > 10) {
      throw new Error('Carousel must have between 2 and 10 media items')
    }
    
    try {
      // First, create containers for each media item
      const childContainers = await Promise.all(
        carouselMedia.map(async (media) => {
          const params: any = {
            access_token: accessToken,
            is_carousel_item: true
          }
          
          if (media.mediaType === 'IMAGE' && media.imageUrl) {
            params.image_url = media.imageUrl
          } else if (media.mediaType === 'VIDEO' && media.videoUrl) {
            params.video_url = media.videoUrl
            params.media_type = 'VIDEO'
          }
          
          const response = await axios.post(
            `${this.graphApiUrl}/${accountId}/media`,
            params
          )
          
          return response.data.id
        })
      )
      
      // Then create the carousel container with children
      const response = await axios.post(
        `${this.graphApiUrl}/${accountId}/media`,
        {
          media_type: 'CAROUSEL',
          children: childContainers.join(','),
          caption,
          access_token: accessToken
        }
      )
      
      return response.data
    } catch (error: any) {
      console.error('Failed to create carousel container:', error.response?.data || error)
      throw new Error(error.response?.data?.error?.message || 'Failed to create carousel container')
    }
  }
  
  /**
   * Check media container status
   */
  private async checkContainerStatus(
    containerId: string,
    accessToken: string
  ): Promise<InstagramMediaContainer> {
    try {
      const response = await axios.get(
        `${this.graphApiUrl}/${containerId}`,
        {
          params: {
            fields: 'id,status,status_code,error_message',
            access_token: accessToken
          }
        }
      )
      
      return response.data
    } catch (error: any) {
      console.error('Failed to check container status:', error.response?.data || error)
      throw new Error('Failed to check media container status')
    }
  }
  
  /**
   * Wait for container to be ready
   */
  private async waitForContainer(
    containerId: string,
    accessToken: string,
    maxAttempts: number = 30,
    delayMs: number = 2000
  ): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.checkContainerStatus(containerId, accessToken)
      
      if (status.status_code === 'FINISHED') {
        return
      }
      
      if (status.status_code === 'ERROR' || status.error_message) {
        throw new Error(status.error_message || 'Media container processing failed')
      }
      
      // Status is still IN_PROGRESS
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
    
    throw new Error('Timeout waiting for media container to be ready')
  }
  
  /**
   * Publish media container to Instagram
   */
  private async publishContainer(
    accountId: string,
    containerId: string,
    accessToken: string
  ): Promise<InstagramPublishResponse> {
    try {
      const response = await axios.post(
        `${this.graphApiUrl}/${accountId}/media_publish`,
        {
          creation_id: containerId,
          access_token: accessToken
        }
      )
      
      return response.data
    } catch (error: any) {
      console.error('Failed to publish container:', error.response?.data || error)
      throw new Error(error.response?.data?.error?.message || 'Failed to publish to Instagram')
    }
  }
  
  /**
   * Main publish method
   */
  async publish(options: PublishOptions): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      const accessToken = await this.getAccessToken(options.accountId)
      let container: InstagramMediaContainer
      
      // Determine media type and create appropriate container
      if (options.carouselMedia && options.carouselMedia.length > 0) {
        // Carousel post
        container = await this.createCarouselContainer(
          options.accountId,
          options.carouselMedia,
          options.caption,
          accessToken
        )
      } else if (options.videoUrl || options.videoPath) {
        // Video or Reel
        const videoUrl = options.videoUrl || await this.uploadVideo(options.videoPath!)
        container = await this.createVideoContainer(
          options.accountId,
          videoUrl,
          options.caption,
          accessToken,
          options.mediaType as 'VIDEO' | 'REELS' || 'REELS',
          options.coverUrl,
          options.audioName,
          options.shareToFeed
        )
      } else if (options.imageUrl || options.imagePath) {
        // Single image
        const imageUrl = options.imageUrl || await this.uploadImage(options.imagePath!)
        container = await this.createImageContainer(
          options.accountId,
          imageUrl,
          options.caption,
          accessToken
        )
      } else {
        throw new Error('No media provided for publishing')
      }
      
      // Wait for container to be ready (for videos/reels)
      if (options.videoUrl || options.videoPath || options.carouselMedia) {
        await this.waitForContainer(container.id, accessToken)
      }
      
      // Publish the container
      const published = await this.publishContainer(
        options.accountId,
        container.id,
        accessToken
      )
      
      // Store published post in database
      await prisma.socialPost.create({
        data: {
          platform: 'INSTAGRAM',
          postId: published.id,
          accountId: options.accountId,
          content: options.caption,
          mediaType: options.mediaType || 'IMAGE',
          mediaUrls: options.imageUrl ? [options.imageUrl] : options.videoUrl ? [options.videoUrl] : [],
          status: 'PUBLISHED',
          publishedAt: new Date()
        }
      })
      
      return {
        success: true,
        postId: published.id
      }
    } catch (error: any) {
      console.error('Instagram publish error:', error)
      
      // Store failed attempt in database
      await prisma.socialPost.create({
        data: {
          platform: 'INSTAGRAM',
          accountId: options.accountId,
          content: options.caption,
          mediaType: options.mediaType || 'IMAGE',
          mediaUrls: options.imageUrl ? [options.imageUrl] : options.videoUrl ? [options.videoUrl] : [],
          status: 'FAILED',
          error: error.message || 'Unknown error',
          scheduledFor: new Date()
        }
      })
      
      return {
        success: false,
        error: error.message || 'Failed to publish to Instagram'
      }
    }
  }
  
  /**
   * Schedule a post for later
   */
  async schedule(options: PublishOptions & { scheduledFor: Date }): Promise<{ success: boolean; scheduledPostId?: string; error?: string }> {
    try {
      // Validate account exists
      await this.getAccessToken(options.accountId)
      
      // Store scheduled post in database
      const scheduledPost = await prisma.socialPost.create({
        data: {
          platform: 'INSTAGRAM',
          accountId: options.accountId,
          content: options.caption,
          mediaType: options.mediaType || 'IMAGE',
          mediaUrls: options.imageUrl ? [options.imageUrl] : options.videoUrl ? [options.videoUrl] : [],
          status: 'SCHEDULED',
          scheduledFor: options.scheduledFor,
          metadata: {
            coverUrl: options.coverUrl,
            audioName: options.audioName,
            shareToFeed: options.shareToFeed,
            carouselMedia: options.carouselMedia
          }
        }
      })
      
      return {
        success: true,
        scheduledPostId: scheduledPost.id
      }
    } catch (error: any) {
      console.error('Instagram schedule error:', error)
      return {
        success: false,
        error: error.message || 'Failed to schedule Instagram post'
      }
    }
  }
  
  /**
   * Process scheduled posts (called by worker)
   */
  async processScheduledPosts(): Promise<void> {
    const now = new Date()
    
    const scheduledPosts = await prisma.socialPost.findMany({
      where: {
        platform: 'INSTAGRAM',
        status: 'SCHEDULED',
        scheduledFor: {
          lte: now
        }
      }
    })
    
    for (const post of scheduledPosts) {
      // Update status to publishing
      await prisma.socialPost.update({
        where: { id: post.id },
        data: { status: 'PUBLISHING' }
      })
      
      // Prepare publish options
      const options: PublishOptions = {
        accountId: post.accountId,
        caption: post.content,
        mediaType: post.mediaType as PublishOptions['mediaType'],
        imageUrl: post.mediaUrls[0],
        ...(post.metadata as any)
      }
      
      // Attempt to publish
      const result = await this.publish(options)
      
      // Update post status based on result
      await prisma.socialPost.update({
        where: { id: post.id },
        data: {
          status: result.success ? 'PUBLISHED' : 'FAILED',
          postId: result.postId,
          error: result.error,
          publishedAt: result.success ? new Date() : undefined
        }
      })
    }
  }
  
  /**
   * Upload image to temporary storage (implement based on your storage solution)
   */
  private async uploadImage(imagePath: string): Promise<string> {
    // TODO: Implement image upload to S3, Cloudinary, or other storage
    // For now, throw an error indicating this needs implementation
    throw new Error('Image upload not implemented. Please provide imageUrl instead of imagePath')
  }
  
  /**
   * Upload video to temporary storage (implement based on your storage solution)
   */
  private async uploadVideo(videoPath: string): Promise<string> {
    // TODO: Implement video upload to S3, Cloudinary, or other storage
    // For now, throw an error indicating this needs implementation
    throw new Error('Video upload not implemented. Please provide videoUrl instead of videoPath')
  }
  
  /**
   * Get insights for a published post
   */
  async getPostInsights(postId: string, accountId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken(accountId)
      
      const response = await axios.get(
        `${this.graphApiUrl}/${postId}/insights`,
        {
          params: {
            metric: 'engagement,impressions,reach,saved,video_views',
            access_token: accessToken
          }
        }
      )
      
      return response.data
    } catch (error: any) {
      console.error('Failed to get post insights:', error.response?.data || error)
      throw new Error('Failed to get Instagram post insights')
    }
  }
  
  /**
   * Delete a published post
   */
  async deletePost(postId: string, accountId: string): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken(accountId)
      
      await axios.delete(
        `${this.graphApiUrl}/${postId}`,
        {
          params: {
            access_token: accessToken
          }
        }
      )
      
      // Update database
      await prisma.socialPost.updateMany({
        where: {
          postId,
          platform: 'INSTAGRAM'
        },
        data: {
          status: 'DELETED',
          deletedAt: new Date()
        }
      })
      
      return true
    } catch (error: any) {
      console.error('Failed to delete post:', error.response?.data || error)
      return false
    }
  }
}

// Export singleton instance
export const instagramPublisherService = new InstagramPublisherService()