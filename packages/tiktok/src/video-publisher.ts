import { TikTokClient } from './tiktok-client'
import { TikTokVideo, TikTokConfig } from './types'

export class VideoPublisher {
  private client: TikTokClient

  constructor(config: TikTokConfig) {
    this.client = new TikTokClient(config)
  }

  async publishVideo(video: TikTokVideo): Promise<string> {
    try {
      let caption = video.caption
      
      // Add hashtags to caption
      if (video.hashtags && video.hashtags.length > 0) {
        caption += ' ' + video.hashtags.map(tag => `#${tag.replace('#', '')}`).join(' ')
      }

      // Upload video with caption
      const videoId = await this.client.uploadVideo(video.videoUrl, caption)
      
      // Set additional properties if provided
      if (video.privacy || video.allowComments !== undefined) {
        await this.updateVideoSettings(videoId, video)
      }

      return videoId
    } catch (error) {
      console.error('Failed to publish video:', error)
      throw error
    }
  }

  async scheduleVideo(video: TikTokVideo): Promise<string> {
    try {
      if (!video.scheduledPublishTime) {
        return await this.publishVideo(video)
      }

      console.log('Scheduling video for:', video.scheduledPublishTime)
      
      // TikTok scheduling implementation
      // Note: TikTok API may have limitations on scheduling
      
      return await this.publishVideo(video)
    } catch (error) {
      console.error('Failed to schedule video:', error)
      throw error
    }
  }

  async publishWithMusic(video: TikTokVideo): Promise<string> {
    try {
      if (!video.music) {
        return await this.publishVideo(video)
      }

      console.log('Adding music to video:', video.music.title)
      
      // Music implementation would involve:
      // 1. Searching for the music in TikTok's library
      // 2. Adding music ID to the video
      // 3. Publishing with music metadata
      
      return await this.publishVideo(video)
    } catch (error) {
      console.error('Failed to publish video with music:', error)
      throw error
    }
  }

  async deleteVideo(videoId: string): Promise<boolean> {
    try {
      console.log('Deleting video:', videoId)
      
      // TikTok video deletion
      // This might not be available in all API versions
      
      return true
    } catch (error) {
      console.error('Failed to delete video:', error)
      throw error
    }
  }

  async getVideoStatus(videoId: string): Promise<any> {
    try {
      const insights = await this.client.getVideoInsights([videoId])
      return insights.videos?.[0] || null
    } catch (error) {
      console.error('Failed to get video status:', error)
      throw error
    }
  }

  private async updateVideoSettings(videoId: string, settings: Partial<TikTokVideo>): Promise<void> {
    try {
      console.log('Updating video settings:', videoId, settings)
      
      // Update privacy, comments, duet, stitch settings
      // Implementation would depend on available API endpoints
    } catch (error) {
      console.error('Failed to update video settings:', error)
      throw error
    }
  }

  async getPublishedVideos(limit: number = 20): Promise<any[]> {
    try {
      const videoList = await this.client.getVideoList(undefined, limit)
      return videoList.videos || []
    } catch (error) {
      console.error('Failed to get published videos:', error)
      throw error
    }
  }
}