import { InstagramClient } from './instagram-client'
import { InstagramStory, InstagramConfig } from './types'

export class StoryPublisher {
  private client: InstagramClient

  constructor(config: InstagramConfig) {
    this.client = new InstagramClient(config)
  }

  async publishStory(story: InstagramStory): Promise<string> {
    try {
      // Stories require different endpoint and parameters
      console.log('Publishing story:', story.mediaType)
      
      // Instagram Stories API implementation would go here
      // Note: Stories API has more restrictions and requires specific permissions
      
      return await this.client.uploadMedia(story.mediaUrl)
    } catch (error) {
      console.error('Failed to publish story:', error)
      throw error
    }
  }

  async publishStoryWithSticker(story: InstagramStory): Promise<string> {
    try {
      if (!story.stickerAssets || story.stickerAssets.length === 0) {
        return await this.publishStory(story)
      }

      // Process stickers
      console.log('Adding stickers to story:', story.stickerAssets.length)
      
      // Sticker implementation would involve:
      // 1. Creating the story media container
      // 2. Adding sticker metadata
      // 3. Publishing the story
      
      return await this.publishStory(story)
    } catch (error) {
      console.error('Failed to publish story with stickers:', error)
      throw error
    }
  }

  async getActiveStories(): Promise<any[]> {
    try {
      // Get currently active stories
      console.log('Fetching active stories')
      
      // Placeholder for getting active stories
      return []
    } catch (error) {
      console.error('Failed to get active stories:', error)
      throw error
    }
  }

  async getStoryInsights(storyId: string): Promise<any> {
    try {
      return await this.client.getMediaInsights(storyId)
    } catch (error) {
      console.error('Failed to get story insights:', error)
      throw error
    }
  }
}