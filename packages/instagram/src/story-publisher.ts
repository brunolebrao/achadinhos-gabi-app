import { InstagramClient } from './instagram-client'
import { InstagramStory, InstagramConfig } from './types'
import axios from 'axios'

export class StoryPublisher {
  private client: InstagramClient
  private config: InstagramConfig
  private baseUrl = 'https://graph.facebook.com/v18.0'

  constructor(config: InstagramConfig) {
    this.client = new InstagramClient(config)
    this.config = config
  }

  async publishStory(story: InstagramStory): Promise<string> {
    try {
      // Validate story content
      this.validateStory(story)

      // Create story media container
      const containerId = await this.createStoryContainer(story)
      
      // Wait for container to be ready
      await this.waitForContainer(containerId)
      
      // Publish the story
      const storyId = await this.publishContainer(containerId)
      
      console.log('Story published successfully:', storyId)
      return storyId
    } catch (error: any) {
      console.error('Failed to publish story:', error)
      throw new Error(`Story publishing failed: ${error.message}`)
    }
  }

  async publishStoryWithSticker(story: InstagramStory): Promise<string> {
    try {
      if (!story.stickerAssets || story.stickerAssets.length === 0) {
        return await this.publishStory(story)
      }

      // Validate stickers
      this.validateStickers(story.stickerAssets)
      
      // Create story with sticker metadata
      const containerId = await this.createStoryWithStickers(story)
      
      // Wait for container to be ready
      await this.waitForContainer(containerId)
      
      // Publish the story
      const storyId = await this.publishContainer(containerId)
      
      console.log('Story with stickers published:', storyId)
      return storyId
    } catch (error: any) {
      console.error('Failed to publish story with stickers:', error)
      throw new Error(`Story with stickers failed: ${error.message}`)
    }
  }

  private validateStory(story: InstagramStory): void {
    if (!story.mediaUrl) {
      throw new Error('Story must have a media URL')
    }

    if (!['IMAGE', 'VIDEO'].includes(story.mediaType)) {
      throw new Error('Story media type must be IMAGE or VIDEO')
    }

    // Validate video duration if applicable
    if (story.mediaType === 'VIDEO' && story.duration) {
      if (story.duration < 1 || story.duration > 60) {
        throw new Error('Story video duration must be between 1 and 60 seconds')
      }
    }
  }

  private validateStickers(stickers: any[]): void {
    if (stickers.length > 1) {
      throw new Error('Instagram Stories support only one sticker at a time')
    }

    const validTypes = ['location', 'hashtag', 'mention', 'poll', 'question', 'quiz', 'slider']
    for (const sticker of stickers) {
      if (!validTypes.includes(sticker.type)) {
        throw new Error(`Invalid sticker type: ${sticker.type}`)
      }
    }
  }

  private async createStoryContainer(story: InstagramStory): Promise<string> {
    const endpoint = `/${this.config.businessAccountId || 'me'}/media`
    const url = `${this.baseUrl}${endpoint}`

    const params: any = {
      access_token: this.config.accessToken,
      media_type: 'STORIES'
    }

    if (story.mediaType === 'IMAGE') {
      params.image_url = story.mediaUrl
    } else {
      params.video_url = story.mediaUrl
    }

    const response = await axios.post(url, null, { params })
    return response.data.id
  }

  private async createStoryWithStickers(story: InstagramStory): Promise<string> {
    const endpoint = `/${this.config.businessAccountId || 'me'}/media`
    const url = `${this.baseUrl}${endpoint}`

    const params: any = {
      access_token: this.config.accessToken,
      media_type: 'STORIES'
    }

    if (story.mediaType === 'IMAGE') {
      params.image_url = story.mediaUrl
    } else {
      params.video_url = story.mediaUrl
    }

    // Add sticker metadata
    if (story.stickerAssets && story.stickerAssets.length > 0) {
      const sticker = story.stickerAssets[0]
      
      switch (sticker.type) {
        case 'LOCATION':
          params.location_id = (sticker as any).locationId
          break
        case 'HASHTAG':
          params.hashtag = (sticker as any).hashtag
          break
        case 'MENTION':
          params.user_tags = JSON.stringify([{
            username: (sticker as any).username,
            x: (sticker as any).x || 0.5,
            y: (sticker as any).y || 0.5
          }])
          break
        case 'POLL':
          params.interactive_media_poll = JSON.stringify({
            question: (sticker as any).question,
            options: (sticker as any).options || ['Yes', 'No']
          })
          break
        case 'QUESTION':
          params.interactive_media_question = JSON.stringify({
            question: (sticker as any).question,
            text_color: (sticker as any).textColor || '#000000',
            background_color: (sticker as any).backgroundColor || '#FFFFFF'
          })
          break
        case 'QUIZ':
          params.interactive_media_quiz = JSON.stringify({
            question: (sticker as any).question,
            options: (sticker as any).options,
            correct_answer: (sticker as any).correctAnswer
          })
          break
        case 'SLIDER':
          params.interactive_media_slider = JSON.stringify({
            question: (sticker as any).question,
            emoji: (sticker as any).emoji || '😍'
          })
          break
      }
    }

    const response = await axios.post(url, null, { params })
    return response.data.id
  }

  private async waitForContainer(containerId: string, maxAttempts: number = 10): Promise<void> {
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
        throw new Error('Story container processing failed')
      }

      // Wait 2 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    throw new Error('Story container processing timeout')
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

  async getActiveStories(): Promise<any[]> {
    try {
      const endpoint = `/${this.config.businessAccountId || 'me'}/stories`
      const url = `${this.baseUrl}${endpoint}`

      const response = await axios.get(url, {
        params: {
          fields: 'id,media_type,media_url,thumbnail_url,timestamp,insights.metric(impressions,reach,taps_forward,taps_back,exits,replies)',
          access_token: this.config.accessToken
        }
      })

      return response.data.data || []
    } catch (error) {
      console.error('Failed to get active stories:', error)
      return []
    }
  }

  async getStoryInsights(storyId: string): Promise<any> {
    try {
      const endpoint = `/${storyId}/insights`
      const url = `${this.baseUrl}${endpoint}`

      const response = await axios.get(url, {
        params: {
          metric: 'impressions,reach,taps_forward,taps_back,exits,replies',
          access_token: this.config.accessToken
        }
      })

      return response.data
    } catch (error) {
      console.error('Failed to get story insights:', error)
      throw error
    }
  }

  async deleteStory(storyId: string): Promise<boolean> {
    try {
      const endpoint = `/${storyId}`
      const url = `${this.baseUrl}${endpoint}`

      const response = await axios.delete(url, {
        params: {
          access_token: this.config.accessToken
        }
      })

      return response.data.success === true
    } catch (error) {
      console.error('Failed to delete story:', error)
      return false
    }
  }
}