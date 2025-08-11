import { ScraperConfig } from '@repo/database'
import { ScrapedProduct, Platform } from '@repo/shared'
import { BaseScraper } from '../lib/base-scraper'
import { logger, logKeywordSearch, logCategorySearch, logProductFound, logRateLimit } from '../lib/logger'
import { progress } from '../lib/progress'

export class ShopeeScraper extends BaseScraper {
  private readonly baseUrl = 'https://shopee.com.br'
  private readonly searchUrl = 'https://shopee.com.br/search'
  
  // Popular Shopee categories
  private readonly popularCategories = [
    'beleza-saude',
    'casa-decoracao',
    'eletronicos',
    'moda-feminina',
    'moda-masculina',
    'celulares-acessorios',
    'bebes-criancas',
    'esporte-lazer',
    'informatica-escritorio'
  ]

  async scrape(config: ScraperConfig): Promise<ScrapedProduct[]> {
    const products: ScrapedProduct[] = []
    const MAX_CONCURRENT_KEYWORDS = 3 // Less concurrent due to anti-bot
    
    // Process keywords with anti-bot measures
    for (let i = 0; i < config.keywords.length; i += MAX_CONCURRENT_KEYWORDS) {
      const keywordBatch = config.keywords.slice(i, i + MAX_CONCURRENT_KEYWORDS)
      
      progress.updateSpinner(`Buscando ${keywordBatch.length} palavras-chave na Shopee...`)
      
      // Process batch sequentially with delays (anti-bot)
      for (const keyword of keywordBatch) {
        try {
          // Add random delay before each search (anti-bot)
          if (i > 0 || keywordBatch.indexOf(keyword) > 0) {
            const delay = 2000 + Math.random() * 3000 // 2-5 seconds
            logRateLimit('Shopee', delay)
            progress.updateSpinner(`Aguardando ${(delay/1000).toFixed(1)}s (anti-bot)...`, 'yellow')
            await this.delay(delay)
          }
          
          const searchProducts = await this.searchProducts(keyword, config)
          logKeywordSearch('Shopee', keyword, searchProducts.length)
          products.push(...searchProducts)
          
          // Update progress
          progress.updateProgress(products.length, `${products.length} produtos encontrados`)
          
          if (products.length >= config.maxProducts) {
            break
          }
        } catch (error) {
          logger.error(`Failed to search for "${keyword}" on Shopee:`, { error, keyword })
          progress.showWarning(`Falha ao buscar "${keyword}" na Shopee`)
        }
      }
      
      if (products.length >= config.maxProducts) {
        break
      }
    }

    // Process categories if needed
    if (config.categories.length > 0 && products.length < config.maxProducts) {
      for (const category of config.categories) {
        if (products.length >= config.maxProducts) break
        
        try {
          // Anti-bot delay
          const delay = 2000 + Math.random() * 3000
          logRateLimit('Shopee', delay)
          progress.updateSpinner(`Aguardando ${(delay/1000).toFixed(1)}s...`, 'yellow')
          await this.delay(delay)
          
          const categoryProducts = await this.scrapeCategory(category, config)
          logCategorySearch('Shopee', category, categoryProducts.length)
          products.push(...categoryProducts)
          
          progress.updateProgress(products.length, `${products.length} produtos encontrados`)
        } catch (error) {
          logger.error(`Failed to scrape category "${category}" on Shopee:`, { error, category })
          progress.showWarning(`Falha ao buscar categoria "${category}"`)
        }
      }
    }

    return products.slice(0, config.maxProducts)
  }

  private async searchProducts(keyword: string, config: ScraperConfig): Promise<ScrapedProduct[]> {
    const products: ScrapedProduct[] = []
    
    // Build search URL with filters
    const searchParams: Record<string, string> = {
      keyword: keyword,
      page: '0',
      sortBy: 'sales' // Sort by best selling
    }
    
    // Add price range
    if (config.minPrice && config.maxPrice) {
      searchParams.minPrice = String(config.minPrice * 100) // Shopee uses cents
      searchParams.maxPrice = String(config.maxPrice * 100)
    }
    
    // Add discount filter (Shopee uses different format)
    if (config.minDiscount && config.minDiscount >= 10) {
      searchParams.locations = '-1' // Filter for items with promotions
      searchParams.skip = '0'
    }
    
    const searchUrl = this.buildSearchUrl(this.searchUrl, searchParams)
    logger.debug(`Scraping Shopee URL: ${searchUrl}`, { platform: 'Shopee', keyword })

    // Add anti-bot headers
    const headers = {
      'User-Agent': this.getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.8,en;q=0.6',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
      'Referer': 'https://shopee.com.br/'
    }

    const html = await this.fetchHTML(searchUrl, headers)
    const $ = this.parseHTML(html)
    
    // Debug: Log if we got any HTML
    if (!html || html.length < 1000) {
      logger.warn('Shopee returned minimal HTML', { htmlLength: html?.length, keyword })
    }
    
    // Debug: Check for anti-bot/captcha
    if (html.includes('captcha') || html.includes('verify') || html.includes('robot')) {
      logger.warn('Possible Shopee anti-bot detection', { keyword })
    }

    // Shopee selectors (2025) - Updated
    const itemSelectors = [
      'div[data-sqe="item"]',
      'a[data-sqe="link"]',
      '.shopee-search-item-result__item',
      'div.col-xs-2-4',
      // New selectors for current Shopee structure
      'div.shopee-search-item-result',
      'li[data-sqe="item"]',
      'a.product-item',
      'div[class*="search"][class*="item"]'
    ]
    
    let itemsFound = false
    for (const selector of itemSelectors) {
      if ($(selector).length > 0) {
        itemsFound = true
        $(selector).each((index, element) => {
          if (products.length >= config.maxProducts) return false
          
          try {
            const $item = $(element)
            
            // Extract title - Updated selectors
            const title = $item.find('div[data-sqe="name"]').text().trim() ||
                         $item.find('.yQmmFK').text().trim() ||
                         $item.find('div.KMyn8J').text().trim() ||
                         $item.find('div[class*="name"]').first().text().trim() ||
                         $item.find('div[class*="title"]').first().text().trim() ||
                         $item.find('.product-name').text().trim() ||
                         $item.find('div.ie3A\\+n').text().trim() || // New Shopee class
                         $item.find('[data-sqe="name"] span').text().trim() || ''
            
            // Extract price (Shopee shows in format "R$ 99,90") - Updated
            const priceText = $item.find('span.ZEgDH9').text() ||
                            $item.find('span[aria-label*="preço"]').text() ||
                            $item.find('div[class*="price"] span').text() ||
                            $item.find('span.aBrP0').text() || // New price class
                            $item.find('span[class*="currency"]').parent().text() ||
                            $item.find('div.vioxXd').text() || // Alternative price class
                            $item.find('[data-sqe="price"]').text() || ''
            
            // Extract original price (crossed out) - Updated
            const originalPriceText = $item.find('.NfYt-P').text() ||
                                    $item.find('span.DJbxYI').text() ||
                                    $item.find('del').text() ||
                                    $item.find('span[class*="original"]').text() ||
                                    $item.find('.IcOsH6').text() || // New original price class
                                    $item.find('span.mBOM2R').text() || ''
            
            // Get product URL
            const productPath = $item.find('a').attr('href') ||
                              $item.attr('href') || ''
            const productUrl = productPath.startsWith('http') 
              ? productPath 
              : `${this.baseUrl}${productPath}`
            
            // Get image URL
            const imageUrl = $item.find('img').attr('src') ||
                           $item.find('img').attr('data-src') || ''
            
            // Extract discount
            const discountText = $item.find('.percent').text() ||
                               $item.find('span.bUajmG').text() ||
                               $item.find('[class*="discount"]').text() || ''
            
            // Skip if essential data is missing
            if (!title || !priceText || !productUrl) {
              logger.debug(`Skipping Shopee item ${index}: missing data`, {
                title: !!title,
                price: !!priceText,
                url: !!productUrl
              })
              return
            }

            const price = this.extractShopeePrice(priceText)
            const originalPrice = originalPriceText ? this.extractShopeePrice(originalPriceText) : undefined
            
            // Calculate or extract discount
            let discount = discountText
            if (!discount && originalPrice && price < originalPrice) {
              const discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100)
              discount = `${discountPercent}% OFF`
            }
            
            // Check minimum discount
            if (config.minDiscount && config.minDiscount > 0) {
              const discountValue = parseInt(discount?.replace(/\\D/g, '') || '0')
              if (discountValue < config.minDiscount) {
                return
              }
            }
            
            const product: ScrapedProduct = {
              title: title.substring(0, 200),
              price,
              originalPrice,
              discount,
              imageUrl: this.normalizeShopeeImage(imageUrl),
              productUrl: this.normalizeShopeeUrl(productUrl),
              platform: Platform.SHOPEE,
              category: this.extractShopeeCategory($, keyword),
              scrapedAt: new Date()
            }

            // Extract ratings (Shopee format: "4.9")
            const ratingsText = $item.find('.shopee-rating-stars__lit').attr('style') ||
                              $item.find('[class*="rating"]').text() || ''
            const ratingsMatch = ratingsText.match(/\\d+\\.\\d+/)
            if (ratingsMatch) {
              product.ratings = parseFloat(ratingsMatch[0])
            }

            // Extract sales count (format: "10 mil vendidos")
            const salesText = $item.find('.r6HknA').text() ||
                            $item.find('[class*="sold"]').text() || ''
            const salesMatch = salesText.match(/(\\d+(?:\\.\\d+)?)(\\s*k|\\s*mil)?/i)
            if (salesMatch) {
              let sales = parseFloat(salesMatch[1])
              if (salesMatch[2] && (salesMatch[2].includes('k') || salesMatch[2].includes('mil'))) {
                sales *= 1000
              }
              product.salesCount = Math.round(sales)
            }
            
            // Check for free shipping
            const hasFreeShipping = $item.find('[class*="shipping"]').text().toLowerCase().includes('grátis') ||
                                   $item.find('.hiXKxx').length > 0
            if (hasFreeShipping && product.discount) {
              product.discount += ' + FRETE GRÁTIS'
            }

            logProductFound('Shopee', product)
            progress.showProduct(product)
            products.push(product)
            
          } catch (error) {
            logger.error(`Failed to parse Shopee product at index ${index}:`, { error, index })
          }
        })
        break
      }
    }
    
    if (!itemsFound) {
      logger.warn(`No products found on Shopee for: ${keyword}`, { keyword, url: searchUrl })
      progress.showWarning(`Nenhum produto encontrado na Shopee para: ${keyword}`)
    }

    return products
  }

  private async scrapeCategory(category: string, config: ScraperConfig): Promise<ScrapedProduct[]> {
    // Map category to Shopee category path
    const categoryMap: Record<string, string> = {
      'beleza-saude': 'Beleza-Saúde-cat.11043145',
      'casa-decoracao': 'Casa-Decoração-cat.11043057',
      'eletronicos': 'Eletrônicos-cat.11044255',
      'moda-feminina': 'Moda-Feminina-cat.11042911',
      'moda-masculina': 'Moda-Masculina-cat.11043022',
      'celulares-acessorios': 'Celulares-Acessórios-cat.11044287',
      'bebes-criancas': 'Bebês-Crianças-cat.11043250',
      'esporte-lazer': 'Esporte-Lazer-cat.11043851',
      'informatica-escritorio': 'Informática-Escritório-cat.11044330'
    }
    
    const shopeeCategory = categoryMap[category] || category
    return this.searchProducts(shopeeCategory, config)
  }

  private extractShopeePrice(priceText: string): number {
    // Remove "R$" and convert "99,90" to 99.90
    const cleanPrice = priceText
      .replace(/R\$/g, '')
      .replace(/\./g, '') // Remove thousand separators
      .replace(',', '.') // Convert decimal separator
      .trim()
    
    const match = cleanPrice.match(/\\d+\\.?\\d*/)
    return match ? parseFloat(match[0]) : 0
  }

  private normalizeShopeeUrl(url: string): string {
    if (!url) return ''
    
    // Remove query parameters and normalize
    const cleanUrl = url.split('?')[0]
    
    if (cleanUrl.startsWith('http')) {
      return cleanUrl
    }
    
    return `${this.baseUrl}${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`
  }

  private normalizeShopeeImage(imageUrl: string): string {
    if (!imageUrl) return ''
    
    // Shopee images sometimes need protocol
    if (imageUrl.startsWith('//')) {
      return `https:${imageUrl}`
    }
    
    // Get higher quality image
    if (imageUrl.includes('_tn')) {
      return imageUrl.replace('_tn', '')
    }
    
    return imageUrl
  }

  private extractShopeeCategory($: any, fallback: string): string {
    // Try to extract from breadcrumbs
    const breadcrumb = $('.page-product__breadcrumb__item').last().text().trim() ||
                      $('.breadcrumb_item').last().text().trim()
    
    return breadcrumb || fallback
  }

  private getRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
    ]
    return userAgents[Math.floor(Math.random() * userAgents.length)]
  }
}