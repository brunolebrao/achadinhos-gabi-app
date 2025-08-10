import { InstagramClient } from './instagram-client'
import { InstagramConfig } from './types'
import axios from 'axios'

export interface CarouselMedia {
  mediaUrl: string
  mediaType: 'IMAGE' | 'VIDEO'
  caption?: string
  userTags?: Array<{ username: string; x?: number; y?: number }>
}

export interface CarouselPost {
  media: CarouselMedia[]
  caption: string
  hashtags?: string[]
  locationId?: string
  locationTag?: string
}

export class CarouselPublisher {
  private client: InstagramClient
  private config: InstagramConfig
  private baseUrl = 'https://graph.facebook.com/v18.0'

  constructor(config: InstagramConfig) {
    this.client = new InstagramClient(config)
    this.config = config
  }

  async publishCarousel(carousel: CarouselPost): Promise<string> {
    try {
      // Validate carousel content
      this.validateCarousel(carousel)

      // Build caption with hashtags
      const fullCaption = this.buildCaption(carousel)

      // Create carousel media containers
      const mediaIds = await this.createCarouselContainers(carousel.media)
      
      // Create carousel container
      const carouselId = await this.createCarouselContainer(mediaIds, fullCaption, carousel.locationId)
      
      // Wait for carousel to be ready
      await this.waitForContainer(carouselId)
      
      // Publish the carousel
      const postId = await this.publishContainer(carouselId)
      
      console.log('Carousel published successfully:', postId)
      return postId
    } catch (error: any) {
      console.error('Failed to publish carousel:', error)
      throw new Error(`Carousel publishing failed: ${error.message}`)
    }
  }

  private validateCarousel(carousel: CarouselPost): void {
    if (!carousel.media || carousel.media.length === 0) {
      throw new Error('Carousel must have at least one media item')
    }

    if (carousel.media.length > 10) {
      throw new Error('Carousel cannot have more than 10 media items')
    }

    // Validate each media item
    for (let i = 0; i < carousel.media.length; i++) {
      const media = carousel.media[i]
      
      if (!media.mediaUrl) {
        throw new Error(`Media item ${i + 1} must have a URL`)
      }

      if (!['IMAGE', 'VIDEO'].includes(media.mediaType)) {
        throw new Error(`Media item ${i + 1} must be IMAGE or VIDEO`)
      }

      if (!this.isValidUrl(media.mediaUrl)) {
        throw new Error(`Media item ${i + 1} has invalid URL`)
      }
    }

    // Validate caption length
    if (carousel.caption && carousel.caption.length > 2200) {
      throw new Error('Caption cannot exceed 2200 characters')
    }

    // Instagram requires at least 2 items for carousel
    if (carousel.media.length < 2) {
      throw new Error('Carousel must have at least 2 media items')
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  private buildCaption(carousel: CarouselPost): string {
    let caption = carousel.caption || ''
    
    // Add hashtags if provided
    if (carousel.hashtags && carousel.hashtags.length > 0) {
      const hashtags = carousel.hashtags
        .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
        .join(' ')
      
      caption = caption ? `${caption}\n\n${hashtags}` : hashtags
    }

    // Add location tag if provided
    if (carousel.locationTag) {
      caption += `\n📍 ${carousel.locationTag}`
    }

    return caption
  }

  private async createCarouselContainers(media: CarouselMedia[]): Promise<string[]> {
    const containerIds: string[] = []

    for (const item of media) {
      const containerId = await this.createMediaContainer(item)
      containerIds.push(containerId)
      
      // Wait for each container to be ready before creating the next
      await this.waitForContainer(containerId)
    }

    return containerIds
  }

  private async createMediaContainer(media: CarouselMedia): Promise<string> {
    const endpoint = `/${this.config.businessAccountId || 'me'}/media`
    const url = `${this.baseUrl}${endpoint}`

    const params: any = {
      access_token: this.config.accessToken,
      is_carousel_item: true
    }

    if (media.mediaType === 'IMAGE') {
      params.image_url = media.mediaUrl
    } else {
      params.video_url = media.mediaUrl
      params.media_type = 'VIDEO'
    }

    // Add user tags if provided
    if (media.userTags && media.userTags.length > 0) {
      params.user_tags = JSON.stringify(media.userTags.map(tag => ({
        username: tag.username,
        x: tag.x || 0.5,
        y: tag.y || 0.5
      })))
    }

    const response = await axios.post(url, null, { params })
    
    if (!response.data.id) {
      throw new Error('Failed to create carousel media container')
    }

    return response.data.id
  }

  private async createCarouselContainer(
    mediaIds: string[], 
    caption: string, 
    locationId?: string
  ): Promise<string> {
    const endpoint = `/${this.config.businessAccountId || 'me'}/media`
    const url = `${this.baseUrl}${endpoint}`

    const params: any = {
      access_token: this.config.accessToken,
      media_type: 'CAROUSEL',
      children: mediaIds.join(','),
      caption: caption
    }

    // Add location if provided
    if (locationId) {
      params.location_id = locationId
    }

    const response = await axios.post(url, null, { params })
    
    if (!response.data.id) {
      throw new Error('Failed to create carousel container')
    }

    return response.data.id
  }

  private async waitForContainer(containerId: string, maxAttempts: number = 10): Promise<void> {
    const endpoint = `/${containerId}`
    const url = `${this.baseUrl}${endpoint}`

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await axios.get(url, {
          params: {
            fields: 'status_code',
            access_token: this.config.accessToken
          }
        })

        if (response.data.status_code === 'FINISHED') {
          return
        }

        if (response.data.status_code === 'ERROR') {
          throw new Error(`Container ${containerId} processing failed`)
        }
      } catch (error: any) {
        // If we get a 400 error with code 9, the container is still processing
        if (error.response?.status === 400 && error.response?.data?.error?.code === 9) {
          // Continue waiting
        } else {
          throw error
        }
      }

      // Wait 2 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    // If we've exhausted attempts, assume it's ready (sometimes status_code is not available)
    console.log(`Container ${containerId} status check timed out, proceeding anyway`)
  }

  private async publishContainer(containerId: string): Promise<string> {
    const endpoint = `/${this.config.businessAccountId || 'me'}/media_publish`
    const url = `${this.baseUrl}${endpoint}`

    const response = await axios.post(url, null, {
      params: {
        creation_id: containerId,
        access_token: this.config.accessToken
      }
    })

    if (!response.data.id) {
      throw new Error('Failed to publish carousel')
    }

    return response.data.id
  }

  async getCarouselInsights(carouselId: string): Promise<any> {
    try {
      const endpoint = `/${carouselId}/insights`
      const url = `${this.baseUrl}${endpoint}`

      const response = await axios.get(url, {
        params: {
          metric: 'carousel_album_engagement,carousel_album_impressions,carousel_album_reach,carousel_album_saved,carousel_album_video_views',
          access_token: this.config.accessToken
        }
      })

      return response.data
    } catch (error) {
      console.error('Failed to get carousel insights:', error)
      
      // Fallback to general media insights
      return await this.client.getMediaInsights(carouselId)
    }
  }

  async getCarouselChildren(carouselId: string): Promise<any[]> {
    try {
      const endpoint = `/${carouselId}/children`
      const url = `${this.baseUrl}${endpoint}`

      const response = await axios.get(url, {
        params: {
          fields: 'id,media_type,media_url,thumbnail_url,timestamp',
          access_token: this.config.accessToken
        }
      })

      return response.data.data || []
    } catch (error) {
      console.error('Failed to get carousel children:', error)
      return []
    }
  }

  async deleteCarousel(carouselId: string): Promise<boolean> {
    try {
      const endpoint = `/${carouselId}`
      const url = `${this.baseUrl}${endpoint}`

      const response = await axios.delete(url, {
        params: {
          access_token: this.config.accessToken
        }
      })

      return response.data.success === true
    } catch (error) {
      console.error('Failed to delete carousel:', error)
      return false
    }
  }
}