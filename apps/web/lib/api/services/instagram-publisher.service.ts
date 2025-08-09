import { apiClient } from '../client'

export interface PublishRequest {
  accountId: string
  caption: string
  mediaType?: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS'
  imageUrl?: string
  videoUrl?: string
  carouselMedia?: Array<{
    imageUrl?: string
    videoUrl?: string
    mediaType: 'IMAGE' | 'VIDEO'
  }>
  coverUrl?: string
  audioName?: string
  shareToFeed?: boolean
}

export interface ScheduleRequest extends PublishRequest {
  scheduledFor: string | Date
}

export interface PublishResponse {
  success: boolean
  postId?: string
  scheduledPostId?: string
  message?: string
  error?: string
}

export interface ScheduledPost {
  id: string
  accountId: string
  platform: 'INSTAGRAM'
  content: string
  mediaType?: string
  mediaUrls: string[]
  status: 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED' | 'CANCELLED'
  scheduledFor?: string
  publishedAt?: string
  error?: string
  createdAt: string
  updatedAt: string
}

export interface MediaUploadResponse {
  url: string
  type: 'image' | 'video'
  size: number
  filename: string
}

class InstagramPublisherService {
  /**
   * Publish content immediately to Instagram
   */
  async publish(data: PublishRequest): Promise<PublishResponse> {
    return apiClient.post('/instagram/publish', data)
  }

  /**
   * Schedule content for later publishing
   */
  async schedule(data: ScheduleRequest): Promise<PublishResponse> {
    return apiClient.post('/instagram/schedule', data)
  }

  /**
   * Upload media file for Instagram post
   */
  async uploadMedia(file: File): Promise<MediaUploadResponse> {
    const formData = new FormData()
    formData.append('media', file)
    
    const response = await fetch('/api/instagram/media/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to upload media')
    }
    
    return response.json()
  }

  /**
   * Get scheduled posts
   */
  async getScheduledPosts(accountId?: string, status?: string): Promise<{ posts: ScheduledPost[], total: number }> {
    const params = new URLSearchParams()
    if (accountId) params.set('accountId', accountId)
    if (status) params.set('status', status)
    
    return apiClient.get(`/instagram/scheduled?${params.toString()}`)
  }

  /**
   * Cancel a scheduled post
   */
  async cancelScheduledPost(postId: string): Promise<PublishResponse> {
    return apiClient.delete(`/instagram/scheduled/${postId}`)
  }

  /**
   * Get post insights
   */
  async getPostInsights(postId: string, accountId: string): Promise<any> {
    return apiClient.get(`/instagram/insights/${postId}?accountId=${accountId}`)
  }

  /**
   * Delete a published post
   */
  async deletePost(postId: string, accountId: string): Promise<PublishResponse> {
    return apiClient.delete(`/instagram/post/${postId}?accountId=${accountId}`)
  }

  /**
   * Refresh Instagram access token
   */
  async refreshToken(accountId: string): Promise<PublishResponse> {
    return apiClient.post('/instagram/refresh-token', { accountId })
  }

  /**
   * Generate caption with hashtags
   */
  generateCaption(
    description: string,
    hashtags: string[],
    callToAction?: string,
    link?: string
  ): string {
    let caption = description.trim()
    
    if (callToAction) {
      caption += `\n\n${callToAction}`
    }
    
    if (link) {
      caption += `\n\n🔗 ${link}`
    }
    
    if (hashtags.length > 0) {
      // Ensure hashtags start with #
      const formattedHashtags = hashtags.map(tag => 
        tag.startsWith('#') ? tag : `#${tag}`
      )
      caption += `\n\n${formattedHashtags.join(' ')}`
    }
    
    // Trim to Instagram's 2200 character limit
    if (caption.length > 2200) {
      caption = caption.substring(0, 2197) + '...'
    }
    
    return caption
  }

  /**
   * Validate media requirements
   */
  validateMedia(file: File, type: 'image' | 'video' | 'reel'): { valid: boolean, error?: string } {
    const maxSizes = {
      image: 8 * 1024 * 1024, // 8MB
      video: 100 * 1024 * 1024, // 100MB
      reel: 250 * 1024 * 1024 // 250MB
    }
    
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
    const allowedVideoTypes = ['video/mp4', 'video/mov', 'video/avi']
    
    if (type === 'image') {
      if (!allowedImageTypes.includes(file.type)) {
        return { valid: false, error: 'Formato de imagem inválido. Use JPG, PNG ou GIF.' }
      }
      if (file.size > maxSizes.image) {
        return { valid: false, error: 'Imagem muito grande. Máximo: 8MB' }
      }
    } else {
      if (!allowedVideoTypes.includes(file.type)) {
        return { valid: false, error: 'Formato de vídeo inválido. Use MP4, MOV ou AVI.' }
      }
      const maxSize = type === 'reel' ? maxSizes.reel : maxSizes.video
      if (file.size > maxSize) {
        return { valid: false, error: `Vídeo muito grande. Máximo: ${maxSize / (1024 * 1024)}MB` }
      }
    }
    
    return { valid: true }
  }

  /**
   * Generate preview URL for uploaded file
   */
  generatePreviewUrl(file: File): string {
    return URL.createObjectURL(file)
  }

  /**
   * Revoke preview URL to free memory
   */
  revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url)
  }
}

export const instagramPublisherService = new InstagramPublisherService()