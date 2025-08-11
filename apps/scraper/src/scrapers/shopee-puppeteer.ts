import { ScraperConfig } from '@repo/database'
import { ScrapedProduct, Platform } from '@repo/shared'
import { BaseScraper } from '../lib/base-scraper'
import { logger, logKeywordSearch, logProductFound } from '../lib/logger'
import { progress } from '../lib/progress'
import puppeteer, { Browser, Page } from 'puppeteer'

export class ShopeePuppeteerScraper extends BaseScraper {
  private browser: Browser | null = null
  private page: Page | null = null
  private readonly baseUrl = 'https://shopee.com.br'
  
  async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-extensions'
        ]
      })
      
      this.page = await this.browser.newPage()
      
      // Set viewport and user agent
      await this.page.setViewport({ width: 1280, height: 800 })
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
      
      // Set cookies to appear more legitimate
      await this.page.setCookie({
        name: 'SPC_F',
        value: Math.random().toString(36).substring(2),
        domain: '.shopee.com.br'
      })
      
      logger.info('Puppeteer browser initialized for Shopee')
    } catch (error) {
      logger.error('Failed to initialize Puppeteer:', error)
      throw error
    }
  }
  
  async cleanup() {
    if (this.page) {
      await this.page.close()
      this.page = null
    }
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
  
  async scrape(config: ScraperConfig): Promise<ScrapedProduct[]> {
    const products: ScrapedProduct[] = []
    
    try {
      await this.initialize()
      
      for (const keyword of config.keywords) {
        if (products.length >= config.maxProducts) break
        
        try {
          progress.updateSpinner(`Buscando "${keyword}" na Shopee com Puppeteer...`)
          
          const searchProducts = await this.searchProductsWithPuppeteer(keyword, config)
          logKeywordSearch('Shopee', keyword, searchProducts.length)
          products.push(...searchProducts)
          
          progress.updateProgress(products.length, `${products.length} produtos encontrados`)
          
          // Add delay between searches
          if (config.keywords.indexOf(keyword) < config.keywords.length - 1) {
            await this.delay(3000 + Math.random() * 3000)
          }
        } catch (error) {
          logger.error(`Failed to search Shopee for "${keyword}":`, { error })
        }
      }
    } finally {
      await this.cleanup()
    }
    
    return products.slice(0, config.maxProducts)
  }
  
  private async searchProductsWithPuppeteer(keyword: string, config: ScraperConfig): Promise<ScrapedProduct[]> {
    if (!this.page) {
      throw new Error('Page not initialized')
    }
    
    const products: ScrapedProduct[] = []
    
    try {
      // Navigate to Shopee
      const searchUrl = `${this.baseUrl}/search?keyword=${encodeURIComponent(keyword)}`
      logger.info(`Navigating to: ${searchUrl}`)
      
      await this.page.goto(searchUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      })
      
      // Wait for products to load
      await this.page.waitForSelector('div[class*="shopee-search-item-result"]', {
        timeout: 10000
      }).catch(() => {
        logger.warn('Product selector not found, trying alternative selectors')
      })
      
      // Scroll to load more products
      await this.autoScroll(this.page)
      
      // Extract products
      const extractedProducts = await this.page.evaluate(() => {
        const items: any[] = []
        
        // Try multiple selectors
        const selectors = [
          'div[class*="shopee-search-item-result"] > div',
          'div[data-sqe="item"]',
          'a[data-sqe="link"]',
          '.col-xs-2-4'
        ]
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector)
          if (elements.length > 0) {
            elements.forEach((el: any) => {
              try {
                // Extract title
                const titleEl = el.querySelector('[class*="name"], [data-sqe="name"], div[class*="ie3A"]')
                const title = titleEl?.textContent?.trim() || ''
                
                // Extract price
                const priceEl = el.querySelector('[class*="price"], span[class*="ZEgDH9"], span[class*="aBrP0"]')
                const priceText = priceEl?.textContent || ''
                
                // Extract URL
                const linkEl = el.querySelector('a') || el.closest('a')
                const href = linkEl?.getAttribute('href') || ''
                
                // Extract image
                const imgEl = el.querySelector('img')
                const imageUrl = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || ''
                
                // Extract discount
                const discountEl = el.querySelector('[class*="percent"], [class*="discount"]')
                const discount = discountEl?.textContent?.trim() || ''
                
                if (title && priceText) {
                  items.push({
                    title,
                    priceText,
                    productUrl: href,
                    imageUrl,
                    discount
                  })
                }
              } catch (e) {
                // Skip invalid items
              }
            })
            
            if (items.length > 0) break
          }
        }
        
        return items
      })
      
      // Process extracted products
      for (const item of extractedProducts) {
        if (products.length >= config.maxProducts) break
        
        const price = this.extractShopeePrice(item.priceText)
        
        if (price > 0) {
          const product: ScrapedProduct = {
            title: item.title.substring(0, 200),
            price,
            originalPrice: undefined,
            discount: item.discount || undefined,
            imageUrl: this.normalizeImageUrl(item.imageUrl),
            productUrl: this.normalizeProductUrl(item.productUrl),
            platform: Platform.SHOPEE,
            category: keyword,
            scrapedAt: new Date()
          }
          
          products.push(product)
          logProductFound('Shopee', product)
          console.log(`  ▸ ${product.title.substring(0, 50)}... | R$ ${product.price.toFixed(2)} ${product.discount || ''}`)
        }
      }
      
      if (products.length === 0) {
        logger.warn(`No products found on Shopee for: ${keyword}`)
        
        // Take screenshot for debugging
        await this.page.screenshot({ 
          path: `shopee-debug-${keyword}.png`,
          fullPage: true 
        })
      }
      
    } catch (error) {
      logger.error(`Puppeteer scraping failed for keyword "${keyword}":`, error)
    }
    
    return products
  }
  
  private async autoScroll(page: Page) {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0
        const distance = 100
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight
          window.scrollBy(0, distance)
          totalHeight += distance
          
          if (totalHeight >= scrollHeight) {
            clearInterval(timer)
            resolve(undefined)
          }
        }, 100)
      })
    })
  }
  
  private extractShopeePrice(priceText: string): number {
    const cleanPrice = priceText
      .replace(/R\$/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
      .trim()
    
    const match = cleanPrice.match(/\d+\.?\d*/)
    return match ? parseFloat(match[0]) : 0
  }
  
  private normalizeImageUrl(url: string): string {
    if (!url) return ''
    if (url.startsWith('//')) return `https:${url}`
    if (url.startsWith('http')) return url
    return `${this.baseUrl}${url}`
  }
  
  private normalizeProductUrl(url: string): string {
    if (!url) return ''
    if (url.startsWith('http')) return url
    if (url.startsWith('/')) return `${this.baseUrl}${url}`
    return `${this.baseUrl}/${url}`
  }
}