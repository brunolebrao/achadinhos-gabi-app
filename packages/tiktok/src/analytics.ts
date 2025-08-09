import { TikTokClient } from './tiktok-client'
import { TikTokConfig, TikTokAnalytics } from './types'

export class TikTokAnalyticsService {
  private client: TikTokClient

  constructor(config: TikTokConfig) {
    this.client = new TikTokClient(config)
  }

  async getVideoAnalytics(videoId: string): Promise<TikTokAnalytics> {
    try {
      const insights = await this.client.getVideoInsights([videoId])
      
      if (!insights.videos || insights.videos.length === 0) {
        throw new Error('No analytics data found for video')
      }

      return this.parseVideoInsights(insights.videos[0])
    } catch (error) {
      console.error('Failed to get video analytics:', error)
      throw error
    }
  }

  async getBatchVideoAnalytics(videoIds: string[]): Promise<TikTokAnalytics[]> {
    try {
      const insights = await this.client.getVideoInsights(videoIds)
      
      return (insights.videos || []).map((video: any) => 
        this.parseVideoInsights(video)
      )
    } catch (error) {
      console.error('Failed to get batch video analytics:', error)
      throw error
    }
  }

  async getAccountAnalytics(startDate: Date, endDate: Date): Promise<any> {
    try {
      const userInfo = await this.client.getUserInfo()
      
      console.log('Fetching account analytics for period:', startDate, '-', endDate)
      
      // Account-level analytics would include:
      // - Total views across all videos
      // - Follower growth
      // - Engagement rate
      // - Top performing content
      
      return {
        userId: userInfo.open_id,
        username: userInfo.display_name,
        followersCount: userInfo.follower_count,
        followingCount: userInfo.following_count,
        videoCount: userInfo.video_count,
        likeCount: userInfo.like_count,
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

  async getTopPerformingVideos(limit: number = 10): Promise<any[]> {
    try {
      const videos = await this.client.getVideoList(undefined, 50)
      
      if (!videos.videos || videos.videos.length === 0) {
        return []
      }

      // Get analytics for all videos
      const videoIds = videos.videos.map((v: any) => v.video_id)
      const analytics = await this.getBatchVideoAnalytics(videoIds)
      
      // Sort by engagement (views + likes + comments + shares)
      const sorted = analytics.sort((a, b) => {
        const engagementA = a.views + a.likes + a.comments + a.shares
        const engagementB = b.views + b.likes + b.comments + b.shares
        return engagementB - engagementA
      })

      return sorted.slice(0, limit)
    } catch (error) {
      console.error('Failed to get top performing videos:', error)
      throw error
    }
  }

  async getOptimalPostingTimes(): Promise<any> {
    try {
      console.log('Calculating optimal posting times for TikTok')
      
      // This would analyze:
      // 1. Historical video performance by posting time
      // 2. Audience online patterns
      // 3. Regional considerations
      
      return {
        bestTimes: [
          { day: 'Monday', times: ['06:00', '10:00', '19:00'] },
          { day: 'Tuesday', times: ['06:00', '10:00', '19:00'] },
          { day: 'Wednesday', times: ['06:00', '10:00', '19:00'] },
          { day: 'Thursday', times: ['06:00', '10:00', '19:00'] },
          { day: 'Friday', times: ['06:00', '10:00', '19:00'] },
          { day: 'Saturday', times: ['11:00', '19:00', '20:00'] },
          { day: 'Sunday', times: ['11:00', '16:00', '20:00'] }
        ],
        timezone: 'America/Sao_Paulo'
      }
    } catch (error) {
      console.error('Failed to get optimal posting times:', error)
      throw error
    }
  }

  async getEngagementRate(videoId?: string): Promise<number> {
    try {
      if (videoId) {
        const analytics = await this.getVideoAnalytics(videoId)
        return this.calculateEngagementRate(analytics)
      }

      // Calculate overall account engagement rate
      const videos = await this.getTopPerformingVideos(20)
      
      if (videos.length === 0) {
        return 0
      }

      const totalEngagement = videos.reduce((sum, video) => 
        sum + this.calculateEngagementRate(video), 0
      )

      return totalEngagement / videos.length
    } catch (error) {
      console.error('Failed to calculate engagement rate:', error)
      throw error
    }
  }

  private parseVideoInsights(video: any): TikTokAnalytics {
    return {
      videoId: video.video_id || video.id,
      views: video.view_count || 0,
      likes: video.like_count || 0,
      comments: video.comment_count || 0,
      shares: video.share_count || 0,
      playCount: video.play_count || video.view_count || 0,
      completionRate: video.completion_rate || 0,
      averageWatchTime: video.average_watch_time || 0,
      uniqueViewers: video.unique_viewers || 0
    }
  }

  private calculateEngagementRate(analytics: TikTokAnalytics): number {
    if (analytics.views === 0) {
      return 0
    }

    const engagements = analytics.likes + analytics.comments + analytics.shares
    return (engagements / analytics.views) * 100
  }
}