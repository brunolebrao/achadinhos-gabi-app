export interface InstagramConfig {
  appId: string
  appSecret: string
  accessToken: string
  businessAccountId?: string
}

export interface InstagramPost {
  id?: string
  caption: string
  mediaUrl: string
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  hashtags?: string[]
  location?: {
    latitude: number
    longitude: number
    name?: string
  }
  taggedUsers?: string[]
  scheduledPublishTime?: Date
}

export interface InstagramStory {
  id?: string
  mediaUrl: string
  mediaType: 'IMAGE' | 'VIDEO'
  stickerAssets?: {
    type: 'LOCATION' | 'HASHTAG' | 'MENTION' | 'POLL' | 'QUESTION'
    data: any
  }[]
  duration?: number
}

export interface InstagramReel {
  id?: string
  caption: string
  videoUrl: string
  coverUrl?: string
  audioUrl?: string
  hashtags?: string[]
  shareToFeed?: boolean
}

export interface InstagramAnalytics {
  postId: string
  impressions: number
  reach: number
  engagement: number
  likes: number
  comments: number
  shares: number
  saves: number
  profileVisits: number
  websiteClicks?: number
}