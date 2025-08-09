export interface TikTokConfig {
  clientKey: string
  clientSecret: string
  accessToken: string
  openId?: string
}

export interface TikTokVideo {
  id?: string
  caption: string
  videoUrl: string
  coverImageUrl?: string
  hashtags?: string[]
  music?: {
    id?: string
    title?: string
    url?: string
  }
  privacy?: 'PUBLIC' | 'FRIENDS' | 'PRIVATE'
  allowComments?: boolean
  allowDuet?: boolean
  allowStitch?: boolean
  scheduledPublishTime?: Date
}

export interface TikTokAnalytics {
  videoId: string
  views: number
  likes: number
  comments: number
  shares: number
  playCount: number
  completionRate: number
  averageWatchTime: number
  uniqueViewers: number
}

export interface TikTokHashtag {
  name: string
  viewCount: number
  videoCount: number
  isPromoted: boolean
  trend?: {
    direction: 'UP' | 'DOWN' | 'STABLE'
    changePercent: number
  }
}

export interface TikTokTrendingContent {
  hashtags: TikTokHashtag[]
  sounds: {
    id: string
    title: string
    usageCount: number
  }[]
  effects: {
    id: string
    name: string
    usageCount: number
  }[]
}