import { InstagramClient } from './instagram-client'
import { InstagramReel, InstagramConfig } from './types'

export class ReelsPublisher {
  private client: InstagramClient

  constructor(config: InstagramConfig) {
    this.client = new InstagramClient(config)
  }

  async publishReel(reel: InstagramReel): Promise<string> {
    try {
      let caption = reel.caption
      
      if (reel.hashtags && reel.hashtags.length > 0) {
        caption += '\n\n' + reel.hashtags.map(tag => `#${tag.replace('#', '')}`).join(' ')
      }

      // Reels require video upload
      console.log('Publishing reel with video:', reel.videoUrl)
      
      // Instagram Reels API implementation
      // This would involve:
      // 1. Uploading video to Instagram's servers
      // 2. Setting cover image if provided
      // 3. Adding audio if provided
      // 4. Publishing to Reels (and optionally to feed)
      
      return await this.client.uploadMedia(reel.videoUrl, caption)
    } catch (error) {
      console.error('Failed to publish reel:', error)
      throw error
    }
  }

  async publishReelWithAudio(reel: InstagramReel): Promise<string> {
    try {
      if (!reel.audioUrl) {
        return await this.publishReel(reel)
      }

      console.log('Adding audio to reel:', reel.audioUrl)
      
      // Audio implementation would involve:
      // 1. Uploading the video
      // 2. Attaching audio track
      // 3. Syncing audio with video
      
      return await this.publishReel(reel)
    } catch (error) {
      console.error('Failed to publish reel with audio:', error)
      throw error
    }
  }

  async getReelInsights(reelId: string): Promise<any> {
    try {
      // Reels have additional metrics like plays, replays, etc.
      return await this.client.getMediaInsights(reelId)
    } catch (error) {
      console.error('Failed to get reel insights:', error)
      throw error
    }
  }

  async getTrendingAudio(): Promise<any[]> {
    try {
      // Get trending audio for Reels
      console.log('Fetching trending audio')
      
      // This would require accessing Instagram's music library API
      // Placeholder implementation
      return []
    } catch (error) {
      console.error('Failed to get trending audio:', error)
      throw error
    }
  }
}