import { ScraperConfig } from '@repo/database'
import { ScrapedProduct, Platform } from '@repo/shared'
import { BaseScraper } from '../lib/base-scraper'
import { logger, logKeywordSearch, logProductFound } from '../lib/logger'
import { progress } from '../lib/progress'

export class AmazonScraperV2 extends BaseScraper {
  private readonly baseUrl = 'https://www.amazon.com.br'
  
  async scrape(config: ScraperConfig): Promise<ScrapedProduct[]> {
    const products: ScrapedProduct[] = []
    
    for (const keyword of config.keywords) {
      if (products.length >= config.maxProducts) break
      
      try {
        // Simple search URL
        const searchUrl = `${this.baseUrl}/s?k=${encodeURIComponent(keyword)}`
        
        logger.info(`Scraping Amazon URL: ${searchUrl}`)
        progress.updateSpinner(`Buscando "${keyword}" na Amazon...`)
        
        // Use a standard desktop user agent
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0'
        }
        
        const html = await this.fetchHTML(searchUrl, headers)
        const $ = this.parseHTML(html)
        
        // Check for CAPTCHA
        if ($('form[action*="validateCaptcha"]').length > 0 || html.includes('Digite os caracteres')) {
          logger.warn('Amazon CAPTCHA detected')
          
          // Return mock data for testing
          const mockProduct: ScrapedProduct = {
            title: `[MOCK] ${keyword} - Produto Amazon (CAPTCHA detectado)`,
            price: 599.90,
            originalPrice: 799.90,
            discount: '25% OFF',
            imageUrl: 'https://via.placeholder.com/300',
            productUrl: `${this.baseUrl}/mock-product`,
            platform: Platform.AMAZON,
            category: keyword,
            scrapedAt: new Date(),
            metadata: { isMock: true, reason: 'CAPTCHA' }
          }
          
          products.push(mockProduct)
          console.log(`  ▸ ${mockProduct.title.substring(0, 50)}... | R$ ${mockProduct.price.toFixed(2)} ${mockProduct.discount || ''}`)
          continue
        }
        
        // Try multiple selectors for products
        const selectors = [
          '[data-component-type="s-search-result"]',
          '[data-asin]:not([data-asin=""])',
          '.s-result-item[data-asin]',
          'div[cel_widget_id^="MAIN-SEARCH_RESULTS"]'
        ]
        
        let foundItems = false
        for (const selector of selectors) {
          const items = $(selector).slice(0, 10)
          
          if (items.length > 0) {
            foundItems = true
            
            items.each((index, element) => {
              if (products.length >= config.maxProducts) return false
              
              const $item = $(element)
              const asin = $item.attr('data-asin') || ''
              
              // Extract title
              const title = $item.find('h2 span').text().trim() ||
                           $item.find('[class*="s-size-"]').first().text().trim() ||
                           $item.find('[class*="s-link-style"] span').text().trim() || ''
              
              // Extract price
              const priceWhole = $item.find('.a-price-whole').first().text().replace('.', '').replace(',', '.')
              const price = parseFloat(priceWhole) || 0
              
              // Extract URL
              const link = $item.find('h2 a').attr('href') || $item.find('a').first().attr('href') || ''
              const productUrl = link.startsWith('http') ? link : `${this.baseUrl}${link}`
              
              // Extract image
              const imageUrl = $item.find('img.s-image').attr('src') || 
                              $item.find('img').first().attr('src') || ''
              
              if (title && price > 0 && asin) {
                const product: ScrapedProduct = {
                  title: title.substring(0, 200),
                  price,
                  originalPrice: undefined,
                  discount: undefined,
                  imageUrl,
                  productUrl: productUrl.split('?')[0], // Clean URL
                  platform: Platform.AMAZON,
                  category: keyword,
                  scrapedAt: new Date(),
                  metadata: { asin }
                }
                
                // Check for Prime
                if ($item.find('[aria-label*="Prime"]').length > 0) {
                  product.discount = 'PRIME'
                }
                
                products.push(product)
                logProductFound('Amazon', product)
                
                // Show product in console for debugging
                console.log(`  ▸ ${product.title.substring(0, 50)}... | R$ ${product.price.toFixed(2)} ${product.discount || ''}`)
              }
            })
            
            break // Found items, no need to try other selectors
          }
        }
        
        if (!foundItems) {
          logger.warn(`No products found on Amazon for: ${keyword}`)
          
          // Return mock data
          const mockProduct: ScrapedProduct = {
            title: `[MOCK] ${keyword} - Produto Amazon`,
            price: 499.90,
            originalPrice: 699.90,
            discount: '29% OFF',
            imageUrl: 'https://via.placeholder.com/300',
            productUrl: `${this.baseUrl}/mock-product-${Date.now()}`,
            platform: Platform.AMAZON,
            category: keyword,
            scrapedAt: new Date(),
            metadata: { isMock: true, reason: 'No products found' }
          }
          
          products.push(mockProduct)
          console.log(`  ▸ ${mockProduct.title.substring(0, 50)}... | R$ ${mockProduct.price.toFixed(2)} ${mockProduct.discount || ''}`)
        }
        
        logKeywordSearch('Amazon', keyword, products.length)
        
        // Add delay between searches
        if (config.keywords.indexOf(keyword) < config.keywords.length - 1) {
          await this.delay(3000 + Math.random() * 4000)
        }
        
      } catch (error) {
        logger.error(`Failed to search Amazon for "${keyword}":`, { error })
      }
    }
    
    return products.slice(0, config.maxProducts)
  }
}