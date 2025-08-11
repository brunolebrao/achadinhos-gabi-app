import crypto from 'crypto'

export interface URLShortenerConfig {
  provider?: 'bitly' | 'custom' | 'tinyurl'
  apiKey?: string
  customDomain?: string
  cache?: Map<string, string>
}

export interface ShortenedURL {
  originalUrl: string
  shortUrl: string
  shortCode: string
  createdAt: Date
  clicks?: number
}

export class URLShortenerService {
  private config: URLShortenerConfig
  private cache: Map<string, string>
  
  constructor(config: URLShortenerConfig = {}) {
    this.config = {
      provider: config.provider || 'custom',
      ...config
    }
    this.cache = config.cache || new Map()
  }
  
  async shorten(url: string): Promise<ShortenedURL> {
    // Check cache first
    if (this.cache.has(url)) {
      const shortUrl = this.cache.get(url)!
      return {
        originalUrl: url,
        shortUrl,
        shortCode: this.extractShortCode(shortUrl),
        createdAt: new Date()
      }
    }
    
    let result: ShortenedURL
    
    switch (this.config.provider) {
      case 'bitly':
        result = await this.shortenWithBitly(url)
        break
      case 'tinyurl':
        result = await this.shortenWithTinyURL(url)
        break
      case 'custom':
      default:
        result = await this.shortenWithCustom(url)
        break
    }
    
    // Cache the result
    this.cache.set(url, result.shortUrl)
    
    return result
  }
  
  private async shortenWithBitly(url: string): Promise<ShortenedURL> {
    if (!this.config.apiKey) {
      throw new Error('Bitly API key is required')
    }
    
    try {
      const response = await fetch('https://api-ssl.bitly.com/v4/shorten', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          long_url: url,
          domain: 'bit.ly'
        })
      })
      
      if (!response.ok) {
        throw new Error(`Bitly API error: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      return {
        originalUrl: url,
        shortUrl: data.link,
        shortCode: data.id,
        createdAt: new Date(data.created_at)
      }
    } catch (error) {
      console.error('Bitly shortening failed:', error)
      // Fallback to custom shortener
      return this.shortenWithCustom(url)
    }
  }
  
  private async shortenWithTinyURL(url: string): Promise<ShortenedURL> {
    try {
      const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`)
      
      if (!response.ok) {
        throw new Error(`TinyURL API error: ${response.statusText}`)
      }
      
      const shortUrl = await response.text()
      
      return {
        originalUrl: url,
        shortUrl,
        shortCode: this.extractShortCode(shortUrl),
        createdAt: new Date()
      }
    } catch (error) {
      console.error('TinyURL shortening failed:', error)
      // Fallback to custom shortener
      return this.shortenWithCustom(url)
    }
  }
  
  private async shortenWithCustom(url: string): Promise<ShortenedURL> {
    // Generate a short code based on URL hash
    const hash = crypto.createHash('md5').update(url).digest('hex')
    const shortCode = hash.substring(0, 7)
    
    // Use custom domain if provided, otherwise use a placeholder
    const domain = this.config.customDomain || 'achadin.ho'
    const shortUrl = `https://${domain}/${shortCode}`
    
    return {
      originalUrl: url,
      shortUrl,
      shortCode,
      createdAt: new Date()
    }
  }
  
  private extractShortCode(shortUrl: string): string {
    const parts = shortUrl.split('/')
    return parts[parts.length - 1]
  }
  
  async expand(shortUrl: string): Promise<string | null> {
    // Check cache for reverse lookup
    for (const [original, short] of this.cache.entries()) {
      if (short === shortUrl) {
        return original
      }
    }
    
    // For custom URLs, we would need a database lookup
    // For now, return null if not in cache
    return null
  }
  
  async getStats(shortUrl: string): Promise<{ clicks: number } | null> {
    if (this.config.provider === 'bitly' && this.config.apiKey) {
      try {
        const shortCode = this.extractShortCode(shortUrl)
        const response = await fetch(`https://api-ssl.bitly.com/v4/bitlinks/${shortCode}/clicks`, {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          return { clicks: data.link_clicks }
        }
      } catch (error) {
        console.error('Failed to get stats:', error)
      }
    }
    
    return null
  }
  
  // Batch shorten multiple URLs
  async shortenBatch(urls: string[]): Promise<ShortenedURL[]> {
    const results = await Promise.all(
      urls.map(url => this.shorten(url))
    )
    return results
  }
  
  // Clear cache
  clearCache(): void {
    this.cache.clear()
  }
  
  // Get cache size
  getCacheSize(): number {
    return this.cache.size
  }
}

// Singleton instance
let instance: URLShortenerService | null = null

export function getURLShortener(config?: URLShortenerConfig): URLShortenerService {
  if (!instance) {
    instance = new URLShortenerService(config)
  }
  return instance
}

// Helper function to shorten affiliate URLs
export async function shortenAffiliateUrl(
  url: string, 
  platform: string,
  productId?: string
): Promise<string> {
  const shortener = getURLShortener()
  
  // Add tracking parameters
  const urlWithTracking = new URL(url)
  urlWithTracking.searchParams.set('utm_source', 'whatsapp')
  urlWithTracking.searchParams.set('utm_medium', 'affiliate')
  urlWithTracking.searchParams.set('utm_campaign', platform.toLowerCase())
  
  if (productId) {
    urlWithTracking.searchParams.set('pid', productId)
  }
  
  const result = await shortener.shorten(urlWithTracking.toString())
  return result.shortUrl
}