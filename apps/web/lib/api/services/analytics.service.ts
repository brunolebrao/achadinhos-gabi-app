import { apiClient } from '../client'
import { AnalyticsOverview, AnalyticsTrend, PlatformPerformance } from '../types'

interface AnalyticsFilters {
  startDate?: string
  endDate?: string
  platform?: string
  category?: string
}

interface DashboardMetrics {
  overview: AnalyticsOverview
  trends: {
    products: AnalyticsTrend
    messages: AnalyticsTrend
    clicks: AnalyticsTrend
    conversion: AnalyticsTrend
  }
  recentActivity: Array<{
    id: string
    type: 'product' | 'message' | 'scraper' | 'whatsapp'
    description: string
    timestamp: string
  }>
}

interface PlatformAnalytics {
  performance: PlatformPerformance[]
  topProducts: Array<{
    id: string
    title: string
    platform: string
    clicks: number
    conversion: number
    revenue: number
  }>
}

interface CategoryAnalytics {
  categories: Array<{
    category: string
    products: number
    revenue: number
    conversion: number
  }>
  trends: Array<{
    date: string
    data: Record<string, number>
  }>
}

interface TimeAnalytics {
  hourlyPerformance: Array<{
    hour: string
    messages: number
    clicks: number
    conversion: number
  }>
  dailyTrends: Array<{
    date: string
    products: number
    messages: number
    clicks: number
    revenue: number
  }>
}

class AnalyticsService {
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return apiClient.get<DashboardMetrics>('/analytics/dashboard')
  }

  async getOverview(filters?: AnalyticsFilters): Promise<AnalyticsOverview> {
    const params = this.buildParams(filters)
    return apiClient.get<AnalyticsOverview>(`/analytics/overview?${params}`)
  }

  async getPlatformAnalytics(filters?: AnalyticsFilters): Promise<PlatformAnalytics> {
    const params = this.buildParams(filters)
    return apiClient.get<PlatformAnalytics>(`/analytics/platforms?${params}`)
  }

  async getCategoryAnalytics(filters?: AnalyticsFilters): Promise<CategoryAnalytics> {
    const params = this.buildParams(filters)
    return apiClient.get<CategoryAnalytics>(`/analytics/categories?${params}`)
  }

  async getTimeAnalytics(filters?: AnalyticsFilters): Promise<TimeAnalytics> {
    const params = this.buildParams(filters)
    return apiClient.get<TimeAnalytics>(`/analytics/time?${params}`)
  }

  async getMessageAnalytics(filters?: AnalyticsFilters): Promise<{
    totalSent: number
    deliveryRate: number
    clickRate: number
    conversionRate: number
    topTemplates: Array<{
      templateId: string
      name: string
      sent: number
      clicks: number
      conversion: number
    }>
  }> {
    const params = this.buildParams(filters)
    return apiClient.get(`/analytics/messages?${params}`)
  }

  async getScraperAnalytics(filters?: AnalyticsFilters): Promise<{
    totalScrapers: number
    activeScrapers: number
    totalProductsFound: number
    averageSuccessRate: number
    scraperPerformance: Array<{
      scraperId: string
      name: string
      platform: string
      productsFound: number
      successRate: number
      lastRun: string
    }>
  }> {
    const params = this.buildParams(filters)
    return apiClient.get(`/analytics/scrapers?${params}`)
  }

  async getRevenueAnalytics(filters?: AnalyticsFilters): Promise<{
    totalRevenue: number
    revenueByPlatform: Record<string, number>
    revenueByCategory: Record<string, number>
    projectedRevenue: number
    topPerformingProducts: Array<{
      productId: string
      title: string
      revenue: number
      clicks: number
    }>
  }> {
    const params = this.buildParams(filters)
    return apiClient.get(`/analytics/revenue?${params}`)
  }

  async exportAnalyticsReport(type: 'pdf' | 'excel', filters?: AnalyticsFilters): Promise<Blob> {
    const params = this.buildParams(filters)
    const response = await apiClient.get(`/analytics/export/${type}?${params}`, {
      responseType: 'blob'
    })
    return response as Blob
  }

  private buildParams(filters?: AnalyticsFilters): string {
    if (!filters) return ''
    
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString())
      }
    })
    
    return params.toString()
  }
}

export const analyticsService = new AnalyticsService()