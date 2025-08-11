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
  stickerAssets?: (LocationSticker | HashtagSticker | MentionSticker | PollSticker | QuestionSticker | QuizSticker | SliderSticker)[]
  duration?: number
}

export interface LocationSticker {
  type: 'LOCATION'
  locationId: string
}

export interface HashtagSticker {
  type: 'HASHTAG'
  hashtag: string
}

export interface MentionSticker {
  type: 'MENTION'
  username: string
  x?: number
  y?: number
}

export interface PollSticker {
  type: 'POLL'
  question: string
  options?: string[]
}

export interface QuestionSticker {
  type: 'QUESTION'
  question: string
  textColor?: string
  backgroundColor?: string
}

export interface QuizSticker {
  type: 'QUIZ'
  question: string
  options: string[]
  correctAnswer: number
}

export interface SliderSticker {
  type: 'SLIDER'
  question: string
  emoji?: string
}

export interface InstagramReel {
  id?: string
  caption: string
  videoUrl: string
  coverUrl?: string
  audioUrl?: string
  audioId?: string
  audioName?: string
  hashtags?: string[]
  shareToFeed?: boolean
  duration?: number
  locationId?: string
  locationTag?: string
  userTags?: Array<{
    username: string
    x?: number
    y?: number
  }>
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