import { InstagramClient } from './instagram-client'
import { InstagramReel, InstagramConfig } from './types'
import axios from 'axios'

export class ReelsPublisher {
  private client: InstagramClient
  private config: InstagramConfig
  private baseUrl = 'https://graph.facebook.com/v18.0'

  constructor(config: InstagramConfig) {
    this.client = new InstagramClient(config)
    this.config = config
  }

  async publishReel(reel: InstagramReel): Promise<string> {
    try {
      // Validate reel content
      this.validateReel(reel)

      // Build caption with hashtags
      const fullCaption = this.buildCaption(reel)

      // Create reel media container
      const containerId = await this.createReelContainer(reel, fullCaption)
      
      // Wait for container to be ready
      await this.waitForContainer(containerId)
      
      // Publish the reel
      const reelId = await this.publishContainer(containerId)
      
      console.log('Reel published successfully:', reelId)
      return reelId
    } catch (error: any) {
      console.error('Failed to publish reel:', error)
      throw new Error(`Reel publishing failed: ${error.message}`)
    }
  }

  async publishReelWithAudio(reel: InstagramReel): Promise<string> {
    try {
      if (!reel.audioName && !reel.audioId) {
        return await this.publishReel(reel)
      }

      // Validate reel with audio
      this.validateReel(reel)
      
      // Build caption
      const fullCaption = this.buildCaption(reel)
      
      // Create reel with audio metadata
      const containerId = await this.createReelWithAudio(reel, fullCaption)
      
      // Wait for container to be ready
      await this.waitForContainer(containerId)
      
      // Publish the reel
      const reelId = await this.publishContainer(containerId)
      
      console.log('Reel with audio published:', reelId)
      return reelId
    } catch (error: any) {
      console.error('Failed to publish reel with audio:', error)
      throw new Error(`Reel with audio failed: ${error.message}`)
    }
  }

  private validateReel(reel: InstagramReel): void {
    if (!reel.videoUrl) {
      throw new Error('Reel must have a video URL')
    }

    // Validate video duration (Reels can be up to 90 seconds)
    if (reel.duration) {
      if (reel.duration < 3 || reel.duration > 90) {
        throw new Error('Reel duration must be between 3 and 90 seconds')
      }
    }

    // Validate cover image if provided
    if (reel.coverUrl && !this.isValidUrl(reel.coverUrl)) {
      throw new Error('Invalid cover image URL')
    }

    // Validate caption length
    if (reel.caption && reel.caption.length > 2200) {
      throw new Error('Caption cannot exceed 2200 characters')
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

  private buildCaption(reel: InstagramReel): string {
    let caption = reel.caption || ''
    
    // Add hashtags if provided
    if (reel.hashtags && reel.hashtags.length > 0) {
      const hashtags = reel.hashtags
        .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
        .join(' ')
      
      caption = caption ? `${caption}\n\n${hashtags}` : hashtags
    }

    // Add location tag if provided
    if (reel.locationTag) {
      caption += `\n📍 ${reel.locationTag}`
    }

    return caption
  }

  private async createReelContainer(reel: InstagramReel, caption: string): Promise<string> {
    const endpoint = `/${this.config.businessAccountId || 'me'}/media`
    const url = `${this.baseUrl}${endpoint}`

    const params: any = {
      access_token: this.config.accessToken,
      media_type: 'REELS',
      video_url: reel.videoUrl,
      caption: caption
    }

    // Add cover image if provided
    if (reel.coverUrl) {
      params.cover_url = reel.coverUrl
    }

    // Add share to feed option (Reels are automatically shared to Reels tab)
    if (reel.shareToFeed !== false) {
      params.share_to_feed = true
    }

    // Add location if provided
    if (reel.locationId) {
      params.location_id = reel.locationId
    }

    // Add user tags if provided
    if (reel.userTags && reel.userTags.length > 0) {
      params.user_tags = JSON.stringify(reel.userTags.map(tag => ({
        username: tag.username,
        x: tag.x || 0.5,
        y: tag.y || 0.5
      })))
    }

    const response = await axios.post(url, null, { params })
    return response.data.id
  }

  private async createReelWithAudio(reel: InstagramReel, caption: string): Promise<string> {
    const endpoint = `/${this.config.businessAccountId || 'me'}/media`
    const url = `${this.baseUrl}${endpoint}`

    const params: any = {
      access_token: this.config.accessToken,
      media_type: 'REELS',
      video_url: reel.videoUrl,
      caption: caption
    }

    // Add audio information
    if (reel.audioId) {
      params.audio_id = reel.audioId
    } else if (reel.audioName) {
      params.audio_name = reel.audioName
    }

    // Add cover image if provided
    if (reel.coverUrl) {
      params.cover_url = reel.coverUrl
    }

    // Add share to feed option
    if (reel.shareToFeed !== false) {
      params.share_to_feed = true
    }

    // Add location if provided
    if (reel.locationId) {
      params.location_id = reel.locationId
    }

    // Add user tags if provided
    if (reel.userTags && reel.userTags.length > 0) {
      params.user_tags = JSON.stringify(reel.userTags.map(tag => ({
        username: tag.username,
        x: tag.x || 0.5,
        y: tag.y || 0.5
      })))
    }

    const response = await axios.post(url, null, { params })
    return response.data.id
  }

  private async waitForContainer(containerId: string, maxAttempts: number = 20): Promise<void> {
    const endpoint = `/${containerId}`
    const url = `${this.baseUrl}${endpoint}`

    for (let i = 0; i < maxAttempts; i++) {
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
        throw new Error('Reel container processing failed')
      }

      // Wait 3 seconds before next check (videos take longer)
      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    throw new Error('Reel container processing timeout')
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

    return response.data.id
  }

  async getReelInsights(reelId: string): Promise<any> {
    try {
      const endpoint = `/${reelId}/insights`
      const url = `${this.baseUrl}${endpoint}`

      const response = await axios.get(url, {
        params: {
          metric: 'plays,reach,likes,comments,shares,saved,total_interactions',
          access_token: this.config.accessToken
        }
      })

      return response.data
    } catch (error) {
      console.error('Failed to get reel insights:', error)
      throw error
    }
  }

  async getTrendingAudio(): Promise<any[]> {
    try {
      // Note: Instagram doesn't provide a direct API for trending audio
      // This would typically require:
      // 1. Monitoring popular Reels
      // 2. Extracting audio information
      // 3. Building a trending list based on usage
      
      console.log('Fetching trending audio (simulated)')
      
      // Return mock trending audio for demonstration
      return [
        {
          id: 'audio_1',
          name: 'Trending Song 1',
          artist: 'Artist 1',
          uses: 1000000
        },
        {
          id: 'audio_2',
          name: 'Trending Song 2',
          artist: 'Artist 2',
          uses: 800000
        },
        {
          id: 'audio_3',
          name: 'Trending Sound Effect',
          artist: 'Original Audio',
          uses: 600000
        }
      ]
    } catch (error) {
      console.error('Failed to get trending audio:', error)
      return []
    }
  }

  async searchAudio(query: string): Promise<any[]> {
    try {
      // Search for audio tracks
      // This would require Instagram Music Library API access
      console.log('Searching audio:', query)
      
      // Mock implementation
      return []
    } catch (error) {
      console.error('Failed to search audio:', error)
      return []
    }
  }

  async deleteReel(reelId: string): Promise<boolean> {
    try {
      const endpoint = `/${reelId}`
      const url = `${this.baseUrl}${endpoint}`

      const response = await axios.delete(url, {
        params: {
          access_token: this.config.accessToken
        }
      })

      return response.data.success === true
    } catch (error) {
      console.error('Failed to delete reel:', error)
      return false
    }
  }
}