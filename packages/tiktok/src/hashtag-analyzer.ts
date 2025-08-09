import { TikTokClient } from './tiktok-client'
import { TikTokConfig, TikTokHashtag, TikTokTrendingContent } from './types'

export class HashtagAnalyzer {
  private client: TikTokClient

  constructor(config: TikTokConfig) {
    this.client = new TikTokClient(config)
  }

  async searchHashtags(keyword: string): Promise<TikTokHashtag[]> {
    try {
      const results = await this.client.searchHashtags(keyword)
      
      return (results.hashtags || []).map((hashtag: any) => 
        this.parseHashtag(hashtag)
      )
    } catch (error) {
      console.error('Failed to search hashtags:', error)
      throw error
    }
  }

  async getTrendingHashtags(region: string = 'BR'): Promise<TikTokHashtag[]> {
    try {
      const trending = await this.client.getTrendingHashtags(region)
      
      return (trending.hashtags || []).map((hashtag: any) => 
        this.parseHashtag(hashtag)
      )
    } catch (error) {
      console.error('Failed to get trending hashtags:', error)
      throw error
    }
  }

  async getTrendingContent(region: string = 'BR'): Promise<TikTokTrendingContent> {
    try {
      const hashtags = await this.getTrendingHashtags(region)
      
      // In a real implementation, we would also fetch:
      // - Trending sounds/music
      // - Trending effects
      // - Trending challenges
      
      return {
        hashtags,
        sounds: [],
        effects: []
      }
    } catch (error) {
      console.error('Failed to get trending content:', error)
      throw error
    }
  }

  async analyzeHashtagPerformance(hashtags: string[]): Promise<any> {
    try {
      const results = await Promise.all(
        hashtags.map(tag => this.searchHashtags(tag))
      )

      const analysis = hashtags.map((tag, index) => {
        const hashtagData = results[index]?.[0]
        
        return {
          hashtag: tag,
          viewCount: hashtagData?.viewCount || 0,
          videoCount: hashtagData?.videoCount || 0,
          avgViewsPerVideo: hashtagData 
            ? hashtagData.viewCount / Math.max(hashtagData.videoCount, 1)
            : 0,
          trend: hashtagData?.trend || { direction: 'STABLE', changePercent: 0 }
        }
      })

      // Sort by average views per video (engagement indicator)
      analysis.sort((a, b) => b.avgViewsPerVideo - a.avgViewsPerVideo)

      return {
        hashtags: analysis,
        recommendations: this.generateHashtagRecommendations(analysis)
      }
    } catch (error) {
      console.error('Failed to analyze hashtag performance:', error)
      throw error
    }
  }

  async suggestHashtags(category: string, count: number = 30): Promise<string[]> {
    try {
      // Search for hashtags related to the category
      const searchResults = await this.searchHashtags(category)
      
      // Get trending hashtags
      const trending = await this.getTrendingHashtags()
      
      // Combine and deduplicate
      const allHashtags = new Set<string>()
      
      searchResults.forEach(h => allHashtags.add(h.name))
      trending.forEach(h => allHashtags.add(h.name))
      
      // Return top hashtags
      return Array.from(allHashtags).slice(0, count)
    } catch (error) {
      console.error('Failed to suggest hashtags:', error)
      throw error
    }
  }

  async getOptimalHashtagMix(mainHashtag: string): Promise<string[]> {
    try {
      // TikTok optimal hashtag strategy:
      // - 3-5 trending hashtags (high competition, high reach)
      // - 5-7 niche hashtags (medium competition, targeted reach)
      // - 3-5 branded/unique hashtags (low competition, brand building)
      
      const trending = await this.getTrendingHashtags()
      const related = await this.searchHashtags(mainHashtag)
      
      const mix: string[] = []
      
      // Add main hashtag
      mix.push(mainHashtag)
      
      // Add top trending (limit to 3-5)
      trending.slice(0, 4).forEach(h => mix.push(h.name))
      
      // Add related niche hashtags (limit to 5-7)
      related
        .filter(h => h.videoCount > 1000 && h.videoCount < 1000000)
        .slice(0, 6)
        .forEach(h => mix.push(h.name))
      
      // Remove duplicates
      return [...new Set(mix)]
    } catch (error) {
      console.error('Failed to get optimal hashtag mix:', error)
      throw error
    }
  }

  private parseHashtag(hashtag: any): TikTokHashtag {
    return {
      name: hashtag.name || hashtag.hashtag_name,
      viewCount: hashtag.view_count || 0,
      videoCount: hashtag.video_count || 0,
      isPromoted: hashtag.is_promoted || false,
      trend: hashtag.trend ? {
        direction: hashtag.trend.direction || 'STABLE',
        changePercent: hashtag.trend.change_percent || 0
      } : undefined
    }
  }

  private generateHashtagRecommendations(analysis: any[]): string[] {
    const recommendations: string[] = []
    
    // Find high-performing hashtags
    const highPerformers = analysis.filter(h => h.avgViewsPerVideo > 100000)
    if (highPerformers.length > 0) {
      recommendations.push(`Use high-performing hashtags: ${highPerformers.map(h => h.hashtag).join(', ')}`)
    }

    // Find trending up hashtags
    const trendingUp = analysis.filter(h => h.trend.direction === 'UP')
    if (trendingUp.length > 0) {
      recommendations.push(`Capitalize on trending hashtags: ${trendingUp.map(h => h.hashtag).join(', ')}`)
    }

    // Suggest avoiding declining hashtags
    const declining = analysis.filter(h => h.trend.direction === 'DOWN')
    if (declining.length > 0) {
      recommendations.push(`Avoid declining hashtags: ${declining.map(h => h.hashtag).join(', ')}`)
    }

    return recommendations
  }
}