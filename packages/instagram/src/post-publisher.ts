import { InstagramClient } from './instagram-client'
import { InstagramPost, InstagramConfig } from './types'

export class PostPublisher {
  private client: InstagramClient

  constructor(config: InstagramConfig) {
    this.client = new InstagramClient(config)
  }

  async publishPost(post: InstagramPost): Promise<string> {
    try {
      let caption = post.caption
      
      if (post.hashtags && post.hashtags.length > 0) {
        caption += '\n\n' + post.hashtags.map(tag => `#${tag.replace('#', '')}`).join(' ')
      }

      if (post.scheduledPublishTime) {
        return await this.client.schedulePost(post.mediaUrl, caption, post.scheduledPublishTime)
      }

      return await this.client.uploadMedia(post.mediaUrl, caption)
    } catch (error) {
      console.error('Failed to publish post:', error)
      throw error
    }
  }

  async publishCarousel(posts: InstagramPost[]): Promise<string> {
    try {
      // Instagram carousel implementation
      // This would require creating multiple media containers and then publishing them as a carousel
      console.log('Publishing carousel with', posts.length, 'items')
      
      // Placeholder for carousel implementation
      throw new Error('Carousel publishing not yet implemented')
    } catch (error) {
      console.error('Failed to publish carousel:', error)
      throw error
    }
  }

  async updatePost(postId: string, caption: string): Promise<boolean> {
    try {
      // Instagram doesn't allow editing published posts via API
      console.warn('Instagram API does not support editing published posts')
      return false
    } catch (error) {
      console.error('Failed to update post:', error)
      throw error
    }
  }

  async deletePost(postId: string): Promise<boolean> {
    try {
      // Delete post implementation
      console.log('Deleting post:', postId)
      
      // Placeholder for delete implementation
      throw new Error('Post deletion not yet implemented')
    } catch (error) {
      console.error('Failed to delete post:', error)
      throw error
    }
  }

  async getPostAnalytics(postId: string): Promise<any> {
    try {
      return await this.client.getMediaInsights(postId)
    } catch (error) {
      console.error('Failed to get post analytics:', error)
      throw error
    }
  }
}