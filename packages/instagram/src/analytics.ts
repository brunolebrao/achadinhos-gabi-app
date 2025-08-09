import { InstagramClient } from './instagram-client'
import { InstagramConfig, InstagramAnalytics } from './types'

export class InstagramAnalyticsService {
  private client: InstagramClient

  constructor(config: InstagramConfig) {
    this.client = new InstagramClient(config)
  }

  async getPostAnalytics(postId: string): Promise<InstagramAnalytics> {
    try {
      const insights = await this.client.getMediaInsights(postId)
      
      return this.parseInsights(postId, insights)
    } catch (error) {
      console.error('Failed to get post analytics:', error)
      throw error
    }
  }

  async getAccountAnalytics(startDate: Date, endDate: Date): Promise<any> {
    try {
      const account = await this.client.getBusinessAccount()
      
      // Get account-level insights
      console.log('Fetching account analytics for period:', startDate, '-', endDate)
      
      // This would involve fetching:
      // - Follower count changes
      // - Profile visits
      // - Website clicks
      // - Email/phone contacts
      
      return {
        accountId: account.id,
        username: account.username,
        followersCount: account.followers_count,
        mediaCount: account.media_count,
        period: {
          start: startDate,
          end: endDate
        }
      }
    } catch (error) {
      console.error('Failed to get account analytics:', error)
      throw error
    }
  }

  async getTopPerformingPosts(limit: number = 10): Promise<any[]> {
    try {
      console.log('Fetching top performing posts, limit:', limit)
      
      // This would involve:
      // 1. Getting recent posts
      // 2. Fetching insights for each
      // 3. Sorting by engagement rate
      
      return []
    } catch (error) {
      console.error('Failed to get top performing posts:', error)
      throw error
    }
  }

  async getHashtagPerformance(hashtags: string[]): Promise<any> {
    try {
      console.log('Analyzing hashtag performance:', hashtags)
      
      // This would analyze posts with specific hashtags
      // and compare their performance
      
      return {
        hashtags,
        averageReach: 0,
        averageEngagement: 0,
        topPosts: []
      }
    } catch (error) {
      console.error('Failed to get hashtag performance:', error)
      throw error
    }
  }

  async getOptimalPostingTimes(): Promise<any> {
    try {
      console.log('Calculating optimal posting times')
      
      // This would analyze historical post performance
      // to determine best times to post
      
      return {
        weekdays: {
          morning: '09:00',
          afternoon: '14:00',
          evening: '19:00'
        },
        weekends: {
          morning: '10:00',
          afternoon: '15:00',
          evening: '20:00'
        }
      }
    } catch (error) {
      console.error('Failed to get optimal posting times:', error)
      throw error
    }
  }

  private parseInsights(postId: string, insights: any): InstagramAnalytics {
    const metrics: any = {}
    
    if (insights.data) {
      insights.data.forEach((metric: any) => {
        metrics[metric.name] = metric.values[0].value
      })
    }

    return {
      postId,
      impressions: metrics.impressions || 0,
      reach: metrics.reach || 0,
      engagement: metrics.engagement || 0,
      likes: metrics.likes || 0,
      comments: metrics.comments || 0,
      shares: metrics.shares || 0,
      saves: metrics.saved || 0,
      profileVisits: metrics.profile_visits || 0,
      websiteClicks: metrics.website_clicks
    }
  }
}