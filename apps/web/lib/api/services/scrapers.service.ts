import { apiClient } from '../client'
import { Scraper } from '../types'

class ScrapersService {
  async getScrapers(): Promise<Scraper[]> {
    return apiClient.get<Scraper[]>('/scrapers')
  }

  async getScraper(id: string): Promise<Scraper> {
    return apiClient.get<Scraper>(`/scrapers/${id}`)
  }

  async createScraper(data: Omit<Scraper, 'id' | 'createdAt' | 'updatedAt' | 'lastRun' | 'nextRun' | 'productsFound' | 'successRate' | 'lastError'>): Promise<Scraper> {
    return apiClient.post<Scraper>('/scrapers', data)
  }

  async updateScraper(id: string, data: Partial<Scraper>): Promise<Scraper> {
    return apiClient.put<Scraper>(`/scrapers/${id}`, data)
  }

  async deleteScraper(id: string): Promise<void> {
    await apiClient.delete(`/scrapers/${id}`)
  }

  async startScraper(id: string): Promise<{ message: string }> {
    return apiClient.post(`/scrapers/${id}/start`)
  }

  async stopScraper(id: string): Promise<{ message: string }> {
    return apiClient.post(`/scrapers/${id}/stop`)
  }

  async pauseScraper(id: string): Promise<{ message: string }> {
    return apiClient.post(`/scrapers/${id}/pause`)
  }

  async resumeScraper(id: string): Promise<{ message: string }> {
    return apiClient.post(`/scrapers/${id}/resume`)
  }

  async runScraperNow(id: string): Promise<{ 
    message: string
    jobId: string 
  }> {
    return apiClient.post(`/scrapers/${id}/run-now`)
  }

  async getScraperLogs(id: string, limit: number = 100): Promise<{
    logs: Array<{
      timestamp: string
      level: 'info' | 'warning' | 'error'
      message: string
    }>
  }> {
    return apiClient.get(`/scrapers/${id}/logs?limit=${limit}`)
  }

  async getScraperStats(id: string): Promise<{
    totalRuns: number
    successfulRuns: number
    failedRuns: number
    averageProductsPerRun: number
    averageRunDuration: number
    lastRunDuration?: number
  }> {
    return apiClient.get(`/scrapers/${id}/stats`)
  }

  async testScraperConfig(config: Scraper['config'] & { platform: Scraper['platform']; keywords: string[] }): Promise<{
    success: boolean
    productsFound: number
    error?: string
  }> {
    return apiClient.post('/scrapers/test', config)
  }

  async toggleScraperStatus(id: string): Promise<Scraper> {
    const scraper = await this.getScraper(id)
    return this.updateScraper(id, { isActive: !scraper.isActive })
  }
}

export const scrapersService = new ScrapersService()