import { ScraperConfig } from '@repo/database'
import { ScrapedProduct, Platform } from '@repo/shared'
import { BaseScraper } from '../lib/base-scraper'

export class TechGadgetsScraper extends BaseScraper {
  private readonly baseUrl = 'https://lista.mercadolivre.com.br'
  
  // Premium tech brands for higher conversion
  private readonly premiumBrands = [
    'apple', 'samsung', 'sony', 'jbl', 'bose', 'xiaomi', 
    'dell', 'lenovo', 'asus', 'hp', 'microsoft', 'logitech',
    'canon', 'nikon', 'gopro', 'dji', 'garmin', 'fitbit'
  ]
  
  // High-value tech categories
  private readonly techCategories = [
    'smartphones',
    'notebooks',
    'tablets',
    'smartwatches',
    'fones-bluetooth',
    'cameras',
    'drones',
    'consoles-videogames',
    'monitores',
    'smart-tv'
  ]

  // Keywords optimized for tech products
  private readonly techKeywords = [
    'iPhone', 'MacBook', 'iPad', 'AirPods', 'Apple Watch',
    'Galaxy S', 'Galaxy Note', 'Galaxy Buds', 'Galaxy Watch',
    'PlayStation', 'Xbox', 'Nintendo Switch',
    'GoPro', 'DJI', 'Drone',
    'JBL', 'Sony WH', 'Bose QuietComfort',
    'GeForce RTX', 'Ryzen', 'Intel Core i'
  ]

  async scrape(config: ScraperConfig): Promise<ScrapedProduct[]> {
    const products: ScrapedProduct[] = []
    
    // Use tech-specific keywords if not provided
    const keywords = config.keywords.length > 0 ? config.keywords : this.techKeywords
    const categories = config.categories.length > 0 ? config.categories : this.techCategories
    
    // Search by keywords first (usually gets newer/trending products)
    for (const keyword of keywords) {
      if (products.length >= config.maxProducts) break
      
      try {
        const searchProducts = await this.searchTechProducts(keyword, config)
        products.push(...searchProducts)
        
        // Rate limiting
        await this.delay(3000 + Math.random() * 2000)
      } catch (error) {
        console.error(`Failed to search for tech product "${keyword}":`, error)
      }
    }
    
    // Then search by categories for broader coverage
    for (const category of categories) {
      if (products.length >= config.maxProducts) break
      
      try {
        const categoryProducts = await this.scrapeTechCategory(category, config)
        products.push(...categoryProducts)
        
        await this.delay(3000 + Math.random() * 2000)
      } catch (error) {
        console.error(`Failed to scrape tech category "${category}":`, error)
      }
    }
    
    // Filter and prioritize products
    const filteredProducts = this.filterAndPrioritize(products, config)
    
    return filteredProducts.slice(0, config.maxProducts)
  }

  private async searchTechProducts(keyword: string, config: ScraperConfig): Promise<ScrapedProduct[]> {
    const products: ScrapedProduct[] = []
    
    // Build search URL with tech-optimized filters
    const searchParams: Record<string, string | undefined> = {
      '_OrderId': 'BEST_SELLER_DESC', // Prioritize best sellers
      '_NoIndex': 'true',
      '_Condition': '2230284', // New products only
      '_ItemTypeID': 'N' // New items
    }
    
    // Price range for tech products (usually higher ticket)
    const minPrice = config.minPrice || 200
    const maxPrice = config.maxPrice || 15000
    searchParams['_PriceRange'] = `${minPrice}-${maxPrice}`
    
    // Minimum discount for genuine deals
    const minDiscount = config.minDiscount || 25
    searchParams['_Discount'] = `${minDiscount}-100`
    
    // Add shipping filter for better conversion
    searchParams['_SHIPPING_ORIGIN'] = '1' // Local shipping
    searchParams['_SHIPPING'] = '1' // Free shipping
    
    const searchUrl = this.buildSearchUrl(`${this.baseUrl}/${keyword.replace(/ /g, '-')}`, searchParams)
    console.log(`🔍 Searching tech products: ${searchUrl}`)
    
    const html = await this.fetchHTML(searchUrl)
    const $ = this.parseHTML(html)
    
    // Extract products with enhanced filtering
    $('.ui-search-layout__item, .poly-card').each((index, element) => {
      if (products.length >= 20) return false // Limit per search
      
      try {
        const $item = $(element)
        
        // Extract product data
        const title = $item.find('h3.poly-box, h2.poly-box, [class*="title"]').first().text().trim()
        const priceText = $item.find('.poly-price__current .andes-money-amount__fraction').first().text()
        const originalPriceText = $item.find('.poly-price__prev s.andes-money-amount__fraction, s').first().text()
        const discountText = $item.find('[class*="discount"]').text().trim()
        const productUrl = $item.find('a.poly-component__title, a').first().attr('href') || ''
        const imageUrl = $item.find('img.poly-component__picture, img').first().attr('src') || ''
        
        // Skip if missing essential data
        if (!title || !priceText || !productUrl) return
        
        const price = this.extractPrice(priceText)
        const originalPrice = originalPriceText ? this.extractPrice(originalPriceText) : undefined
        
        // Calculate real discount
        let discount = discountText
        if (!discount && originalPrice && price < originalPrice) {
          const discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100)
          discount = `${discountPercent}% OFF`
        }
        
        // Apply tech-specific filters
        if (!this.isTechProduct(title)) return
        if (!this.meetsQualityStandards($item)) return
        
        // Extract additional metrics
        const ratings = this.extractRating($item)
        const reviewCount = this.extractReviewCount($item)
        const salesCount = this.extractSalesCount($item)
        
        // Check for premium features
        const hasFreeShipping = $item.find('[class*="shipping-free"], [class*="free-shipping"]').length > 0
        const isBestSeller = $item.find('[class*="best-seller"], [class*="mais-vendido"]').length > 0
        const hasFullWarranty = title.toLowerCase().includes('garantia') || $item.text().includes('garantia')
        
        // Enhance discount text with features
        if (hasFreeShipping) discount = (discount || '') + ' + FRETE GRÁTIS'
        if (isBestSeller) discount = '🏆 MAIS VENDIDO ' + (discount || '')
        
        const product: ScrapedProduct = {
          title: this.cleanTitle(title),
          price,
          originalPrice,
          discount,
          imageUrl: this.enhanceImageUrl(imageUrl),
          productUrl: this.normalizeUrl(productUrl),
          platform: Platform.MERCADOLIVRE,
          category: 'Tecnologia e Gadgets',
          ratings,
          reviewCount,
          salesCount,
          scrapedAt: new Date()
        }
        
        products.push(product)
        console.log(`✅ Found tech product: ${product.title} - R$ ${product.price} (${discount || 'no discount'})`
      ) 
      } catch (error) {
        console.error(`Failed to parse tech product at index ${index}:`, error)
      }
    })
    
    return products
  }

  private async scrapeTechCategory(category: string, config: ScraperConfig): Promise<ScrapedProduct[]> {
    // Reuse search logic with category as keyword
    return this.searchTechProducts(category, config)
  }

  private isTechProduct(title: string): boolean {
    const lowerTitle = title.toLowerCase()
    
    // Check for tech-related terms
    const techTerms = [
      'iphone', 'galaxy', 'xiaomi', 'motorola', 'nokia',
      'notebook', 'laptop', 'macbook', 'chromebook',
      'tablet', 'ipad', 'kindle',
      'smartwatch', 'watch', 'band',
      'fone', 'headphone', 'earphone', 'airpod', 'buds',
      'camera', 'gopro', 'drone', 'dji',
      'playstation', 'xbox', 'nintendo', 'console',
      'smart tv', 'monitor', 'display',
      'ssd', 'hd', 'pendrive', 'memoria',
      'processador', 'placa video', 'rtx', 'gtx'
    ]
    
    return techTerms.some(term => lowerTitle.includes(term))
  }

  private meetsQualityStandards($item: any): boolean {
    // Check for quality indicators
    const text = $item.text().toLowerCase()
    
    // Skip if it's a used product
    if (text.includes('usado') || text.includes('recondicionado')) return false
    
    // Skip if it's just an accessory (unless it's a premium one)
    if (text.includes('capa para') || text.includes('película')) return false
    if (text.includes('cabo') && !text.includes('apple')) return false
    
    // Skip generic/unknown brands for certain categories
    const hasPremiumBrand = this.premiumBrands.some(brand => text.includes(brand))
    if (text.includes('genérico') || text.includes('compatível')) {
      return false // Skip generic items
    }
    
    return true
  }

  private extractRating($item: any): number | undefined {
    const ratingText = $item.find('[class*="rating"], [class*="review"]').text()
    const match = ratingText.match(/(\d[.,]\d)/
    )
    return match ? parseFloat(match[1].replace(',', '.')) : undefined
  }

  private extractReviewCount($item: any): number | undefined {
    const reviewText = $item.find('[class*="review"]').text()
    const match = reviewText.match(/\((\d+)\)/)
    return match ? parseInt(match[1]) : undefined
  }

  private extractSalesCount($item: any): number | undefined {
    const salesText = $item.find('[class*="sold"], [class*="vendido"]').text()
    const match = salesText.match(/(\d+)/)
    return match ? parseInt(match[1]) : undefined
  }

  private cleanTitle(title: string): string {
    // Remove unnecessary words and clean up
    return title
      .replace(/\s+/g, ' ')
      .replace(/novo lacrado/gi, '')
      .replace(/pronta entrega/gi, '')
      .replace(/envio imediato/gi, '')
      .replace(/12x sem juros/gi, '')
      .trim()
      .substring(0, 200) // Limit length
  }

  private enhanceImageUrl(imageUrl: string): string {
    // Get higher quality image
    return imageUrl
      .replace('-I.jpg', '-W.jpg')
      .replace('-V.jpg', '-W.jpg')
      .replace('_I.', '_W.')
  }

  private normalizeUrl(url: string): string {
    if (url.startsWith('http')) {
      // Remove tracking parameters
      const cleanUrl = url.split('?')[0]
      return cleanUrl || url
    }
    return `https://www.mercadolivre.com.br${url}`
  }

  private filterAndPrioritize(products: ScrapedProduct[], config: ScraperConfig): ScrapedProduct[] {
    // Remove duplicates
    const uniqueProducts = Array.from(
      new Map(products.map(p => [p.productUrl, p])).values()
    )
    
    // Sort by priority (best products first)
    return uniqueProducts.sort((a, b) => {
      // Priority factors
      let scoreA = 0
      let scoreB = 0
      
      // Higher discount is better
      const discountA = parseInt(a.discount?.match(/\d+/)?.[0] || '0')
      const discountB = parseInt(b.discount?.match(/\d+/)?.[0] || '0')
      scoreA += discountA
      scoreB += discountB
      
      // Higher rating is better
      scoreA += (a.ratings || 0) * 10
      scoreB += (b.ratings || 0) * 10
      
      // More reviews indicate popularity
      scoreA += Math.min((a.reviewCount || 0) / 10, 10)
      scoreB += Math.min((b.reviewCount || 0) / 10, 10)
      
      // Sales count indicates demand
      scoreA += Math.min((a.salesCount || 0) / 100, 10)
      scoreB += Math.min((b.salesCount || 0) / 100, 10)
      
      // Free shipping bonus
      if (a.discount?.includes('FRETE GRÁTIS')) scoreA += 5
      if (b.discount?.includes('FRETE GRÁTIS')) scoreB += 5
      
      // Best seller bonus
      if (a.discount?.includes('MAIS VENDIDO')) scoreA += 10
      if (b.discount?.includes('MAIS VENDIDO')) scoreB += 10
      
      return scoreB - scoreA // Higher score first
    })
  }
}