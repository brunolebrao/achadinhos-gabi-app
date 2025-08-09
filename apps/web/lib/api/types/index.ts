// Re-export enums from shared package
export { Platform, ProductStatus } from '@repo/shared'

// Product types
export interface Product {
  id: string
  title: string
  price: number
  originalPrice?: number
  discount?: string
  imageUrl: string
  productUrl: string
  affiliateUrl?: string
  platform: Platform
  category: string
  cupom?: string
  ratings?: number
  reviewCount?: number
  salesCount?: number
  status: ProductStatus
  createdAt: string
  updatedAt: string
}

export interface ProductFilters {
  platform?: Platform
  category?: string
  status?: ProductStatus
  minPrice?: number
  maxPrice?: number
  minDiscount?: number
  searchTerm?: string
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// WhatsApp types
export interface WhatsAppAccount {
  id: string
  name: string
  phoneNumber: string
  isActive: boolean
  isConnected: boolean
  isDefault: boolean
  sessionData?: any
  qrCode?: string
  lastConnectedAt?: string
  createdAt: string
  updatedAt: string
}

export interface WhatsAppSession {
  sessionId: string
  accountId: string
  isConnected: boolean
  qrCode?: string
  error?: string
  lastActivity?: string
}

export interface WhatsAppMessage {
  to: string
  message: string
  type?: 'text' | 'image' | 'document'
  media?: {
    url: string
    caption?: string
    filename?: string
  }
}

export interface ScheduledMessage {
  id: string
  productId?: string
  templateId?: string
  content: string
  recipients: string[]
  scheduledAt: string
  recipientType: 'CONTACT' | 'GROUP' | 'BROADCAST'
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED'
  sentAt?: string
  error?: string
}

// Template types
export interface Template {
  id: string
  name: string
  content: string
  category?: string
  isDefault: boolean
  isActive: boolean
  variables?: Record<string, string>
  createdAt: string
  updatedAt: string
}

// Contact types
export interface Contact {
  id: string
  name: string
  phoneNumber: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

// Group types
export interface Group {
  id: string
  name: string
  groupId: string
  tags: string[]
  memberCount?: number
  createdAt: string
  updatedAt: string
}

// Scraper types
export interface Scraper {
  id: string
  name: string
  platform: Platform
  category: string
  keywords: string[]
  schedule: string
  config: {
    maxPages: number
    minDiscount: number
    maxPrice: number
    excludeUsed: boolean
  }
  isActive: boolean
  lastRun?: string
  nextRun?: string
  productsFound: number
  successRate: number
  lastError?: string
  createdAt: string
  updatedAt: string
}

// Analytics types
export interface AnalyticsOverview {
  totalProducts: number
  totalMessages: number
  totalClicks: number
  conversionRate: number
  revenueGenerated: number
}

export interface AnalyticsTrend {
  current: number
  previous: number
  change: number
}

export interface PlatformPerformance {
  platform: string
  products: number
  messages: number
  clicks: number
  conversion: number
}

// Auth types
export interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'USER'
  createdAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  user: User
  token: string
}