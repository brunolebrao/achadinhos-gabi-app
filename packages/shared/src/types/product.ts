export enum Platform {
  MERCADOLIVRE = 'MERCADOLIVRE',
  SHOPEE = 'SHOPEE',
  AMAZON = 'AMAZON',
  ALIEXPRESS = 'ALIEXPRESS'
}

export enum ProductStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED', 
  REJECTED = 'REJECTED',
  SENT = 'SENT'
}

export interface ProductData {
  title: string
  price: number
  originalPrice?: number
  discount?: string
  imageUrl: string
  productUrl: string
  platform: Platform
  category: string
  cupom?: string
  ratings?: number
  reviewCount?: number
  salesCount?: number
}

export interface ScrapedProduct extends ProductData {
  scrapedAt: Date
}

export interface ProductWithAffiliate extends ProductData {
  affiliateUrl?: string
}

export interface ProductMetrics {
  clickCount: number
  conversionRate: number
  revenue: number
}

export interface ProductFilter {
  platform?: Platform
  category?: string
  status?: ProductStatus
  minPrice?: number
  maxPrice?: number
  minDiscount?: number
  searchTerm?: string
  dateFrom?: Date
  dateTo?: Date
}