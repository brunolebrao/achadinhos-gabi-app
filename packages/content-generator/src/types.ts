export type Platform = 'instagram' | 'tiktok' | 'whatsapp'

export interface Dimensions {
  width: number
  height: number
}

export interface ContentTemplate {
  id: string
  name: string
  platform: Platform
  type: 'image' | 'video' | 'story'
  dimensions: Dimensions
  elements: TemplateElement[]
  backgroundColor?: string
  backgroundImage?: string
}

export interface TemplateElement {
  id: string
  type: 'text' | 'image' | 'shape' | 'icon'
  position: {
    x: number
    y: number
  }
  size?: {
    width: number
    height: number
  }
  content?: string
  style?: any
  animation?: AnimationConfig
}

export interface AnimationConfig {
  type: 'fade' | 'slide' | 'scale' | 'rotate'
  duration: number
  delay?: number
  easing?: string
}

export interface GeneratedContent {
  platform: Platform
  type: 'image' | 'video' | 'story'
  url: string
  thumbnail?: string
  dimensions: Dimensions
  duration?: number
  fileSize?: number
}

export interface ProductCard {
  title: string
  price: number
  originalPrice?: number
  discount?: string
  imageUrl: string
  brand?: string
  rating?: number
  template?: string
}

export interface StoryConfig {
  duration: number
  backgroundColor?: string
  backgroundImage?: string
  musicUrl?: string
  transitions?: string[]
}

export interface VideoConfig {
  duration: number
  fps: number
  resolution: '720p' | '1080p' | '4k'
  format: 'mp4' | 'webm'
  audio?: {
    url: string
    volume: number
    fadeIn?: number
    fadeOut?: number
  }
}

export const PLATFORM_DIMENSIONS: Record<Platform, Record<string, Dimensions>> = {
  instagram: {
    post: { width: 1080, height: 1080 },
    story: { width: 1080, height: 1920 },
    reel: { width: 1080, height: 1920 },
    landscape: { width: 1080, height: 608 },
    portrait: { width: 1080, height: 1350 }
  },
  tiktok: {
    video: { width: 1080, height: 1920 },
    cover: { width: 720, height: 1280 }
  },
  whatsapp: {
    status: { width: 1080, height: 1920 },
    thumbnail: { width: 400, height: 400 }
  }
}