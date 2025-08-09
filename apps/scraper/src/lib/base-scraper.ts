import { ScraperConfig } from '@repo/database'
import { ScrapedProduct } from '@repo/shared'
import axios, { AxiosInstance } from 'axios'
import { load } from 'cheerio'
import http from 'http'
import https from 'https'

export abstract class BaseScraper {
  protected http: AxiosInstance
  private retryCount = 3
  private baseDelay = 1000

  constructor() {
    // Create HTTP/HTTPS agents with connection pooling
    const httpAgent = new http.Agent({
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 50, // Increased from default 5
      maxFreeSockets: 10
    })
    
    const httpsAgent = new https.Agent({
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 50, // Increased from default 5
      maxFreeSockets: 10
    })
    
    this.http = axios.create({
      timeout: 10000, // Reduced from 30s to 10s
      headers: {
        'User-Agent': this.getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
      httpAgent,
      httpsAgent,
      maxRedirects: 5,
      decompress: true // Auto decompress response
    })
    
    // Add response interceptor for retry logic
    this.http.interceptors.response.use(
      response => response,
      async error => {
        const config = error.config
        
        // Check if we should retry
        if (!config || !config.retryCount) {
          config.retryCount = 0
        }
        
        if (config.retryCount < this.retryCount) {
          config.retryCount++
          
          // Exponential backoff
          const delay = this.baseDelay * Math.pow(2, config.retryCount - 1)
          await this.delay(delay)
          
          // Rotate user agent on retry
          config.headers['User-Agent'] = this.getRandomUserAgent()
          
          return this.http.request(config)
        }
        
        return Promise.reject(error)
      }
    )
  }

  abstract scrape(config: ScraperConfig): Promise<ScrapedProduct[]>

  protected async fetchHTML(url: string): Promise<string> {
    try {
      const response = await this.http.get(url, {
        responseType: 'text',
        validateStatus: (status) => status < 500 // Don't throw on 4xx
      })
      
      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers['retry-after']
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000
        console.warn(`Rate limited. Waiting ${delay}ms before retry...`)
        await this.delay(delay)
        return this.fetchHTML(url) // Retry after delay
      }
      
      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return response.data
    } catch (error: any) {
      // Don't log full error object to reduce noise
      console.error(`Failed to fetch ${url}: ${error.message}`)
      throw error
    }
  }

  protected parseHTML(html: string) {
    return load(html)
  }

  protected extractPrice(priceText: string): number {
    const cleaned = priceText
      .replace(/[^\d,.-]/g, '')
      .replace(',', '.')
    return parseFloat(cleaned)
  }

  protected calculateDiscount(originalPrice: number, currentPrice: number): string {
    const discount = ((originalPrice - currentPrice) / originalPrice) * 100
    return `${Math.round(discount)}%`
  }

  protected getRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
    ]
    const randomIndex = Math.floor(Math.random() * userAgents.length)
    const selectedAgent = userAgents[randomIndex]
    return selectedAgent || userAgents[0]!
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  protected buildSearchUrl(baseUrl: string, params: Record<string, any>): string {
    const url = new URL(baseUrl)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })
    return url.toString()
  }
}