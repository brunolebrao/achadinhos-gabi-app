import { ScraperConfig } from '@repo/database'
import { ScrapedProduct, Platform } from '@repo/shared'
import { BaseScraper } from '../lib/base-scraper'
import { logger, logKeywordSearch, logCategorySearch, logProductFound, logRateLimit } from '../lib/logger'
import { progress } from '../lib/progress'

export class AmazonScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.amazon.com.br'
  private readonly searchUrl = 'https://www.amazon.com.br/s'
  
  // Popular Amazon Brazil categories
  private readonly popularCategories = [
    'eletronicos',
    'livros',
    'computadores-informatica',
    'casa',
    'beleza',
    'esportes',
    'ferramentas',
    'brinquedos',
    'moda'
  ]

  // Category node IDs for Amazon Brazil
  private readonly categoryNodes: Record<string, string> = {
    'eletronicos': '16209062011',
    'livros': '6740748011',
    'computadores-informatica': '16339926011',
    'casa': '16191000011',
    'beleza': '16194414011',
    'esportes': '17349396011',
    'ferramentas': '16957125011',
    'brinquedos': '16194299011',
    'moda': '17365811011'
  }

  async scrape(config: ScraperConfig): Promise<ScrapedProduct[]> {
    const products: ScrapedProduct[] = []
    const MAX_CONCURRENT_KEYWORDS = 2 // Amazon is strict with rate limiting
    
    // Process keywords with rate limiting
    for (let i = 0; i < config.keywords.length; i += MAX_CONCURRENT_KEYWORDS) {
      const keywordBatch = config.keywords.slice(i, i + MAX_CONCURRENT_KEYWORDS)
      
      progress.updateSpinner(`Buscando ${keywordBatch.length} palavras-chave na Amazon...`)
      
      // Process batch with delays
      for (const keyword of keywordBatch) {
        try {
          // Rate limiting delay
          if (i > 0 || keywordBatch.indexOf(keyword) > 0) {
            const delay = 3000 + Math.random() * 4000 // 3-7 seconds
            logRateLimit('Amazon', delay)
            progress.updateSpinner(`Aguardando ${(delay/1000).toFixed(1)}s (rate limit)...`, 'yellow')
            await this.delay(delay)
          }
          
          const searchProducts = await this.searchProducts(keyword, config)
          logKeywordSearch('Amazon', keyword, searchProducts.length)
          products.push(...searchProducts)
          
          progress.updateProgress(products.length, `${products.length} produtos encontrados`)
          
          if (products.length >= config.maxProducts) {
            break
          }
        } catch (error) {
          logger.error(`Failed to search for "${keyword}" on Amazon:`, { error, keyword })
          progress.showWarning(`Falha ao buscar "${keyword}" na Amazon`)
        }
      }
      
      if (products.length >= config.maxProducts) {
        break
      }
    }

    // Process categories
    if (config.categories.length > 0 && products.length < config.maxProducts) {
      for (const category of config.categories) {
        if (products.length >= config.maxProducts) break
        
        try {
          // Rate limiting
          const delay = 3000 + Math.random() * 4000
          logRateLimit('Amazon', delay)
          progress.updateSpinner(`Aguardando ${(delay/1000).toFixed(1)}s...`, 'yellow')
          await this.delay(delay)
          
          const categoryProducts = await this.scrapeCategory(category, config)
          logCategorySearch('Amazon', category, categoryProducts.length)
          products.push(...categoryProducts)
          
          progress.updateProgress(products.length, `${products.length} produtos encontrados`)
        } catch (error) {
          logger.error(`Failed to scrape category "${category}" on Amazon:`, { error, category })
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
      k: keyword,
      __mk_pt_BR: 'ÅMÅŽÕÑ', // Brazil marketplace
      ref: 'nb_sb_noss'
    }
    
    // Add price range filter
    if (config.minPrice && config.maxPrice) {
      searchParams['rh'] = `p_36:${config.minPrice * 100}-${config.maxPrice * 100}`
    }
    
    // Sort by featured (best results)
    searchParams['s'] = 'relevanceblender'
    
    // Filter for Prime if discount is requested
    if (config.minDiscount && config.minDiscount >= 20) {
      searchParams['rh'] = (searchParams['rh'] || '') + ',p_n_deal_type:23565580011' // Lightning deals
    }
    
    const searchUrl = this.buildSearchUrl(this.searchUrl, searchParams)
    logger.debug(`Scraping Amazon URL: ${searchUrl}`, { platform: 'Amazon', keyword })

    // Amazon-specific headers
    const headers = {
      'User-Agent': this.getAmazonUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.8,en;q=0.6',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }

    const html = await this.fetchHTML(searchUrl, headers)
    const $ = this.parseHTML(html)

    // Check for CAPTCHA
    if ($('form[action*="validateCaptcha"]').length > 0) {
      logger.warn('Amazon CAPTCHA detected, skipping search', { keyword })
      progress.showWarning('Amazon solicitou CAPTCHA - tentando próxima busca')
      return products
    }

    // Amazon product selectors (2025)
    const itemSelectors = [
      'div[data-component-type="s-search-result"]',
      'div[data-asin][data-index]',
      '.s-result-item[data-asin]',
      '.sg-col-inner .s-result-item'
    ]
    
    let itemsFound = false
    for (const selector of itemSelectors) {
      if ($(selector).length > 0) {
        itemsFound = true
        $(selector).each((index, element) => {
          if (products.length >= config.maxProducts) return false
          
          try {
            const $item = $(element)
            
            // Skip sponsored items if not needed
            const isSponsored = $item.find('.s-label-popover-default').text().includes('Patrocinado')
            
            // Extract ASIN (Amazon product ID)
            const asin = $item.attr('data-asin') || ''
            
            // Extract title
            const title = $item.find('h2 a span').text().trim() ||
                         $item.find('.s-size-mini.s-spacing-none.s-color-base').text().trim() ||
                         $item.find('[class*="s-line-clamp"]').text().trim() || ''
            
            // Extract price
            const priceWhole = $item.find('.a-price-whole').first().text()
            const priceFraction = $item.find('.a-price-fraction').first().text()
            const priceText = `${priceWhole}${priceFraction}`.replace(/\./g, '').replace(',', '.')
            
            // Extract original price
            const originalPriceText = $item.find('.a-price.a-text-price .a-offscreen').text() ||
                                    $item.find('span.a-text-price[data-a-strike="true"]').text() || ''
            
            // Get product URL
            const productPath = $item.find('h2 a').attr('href') ||
                              $item.find('a.s-link').attr('href') || ''
            const productUrl = productPath.startsWith('http') 
              ? productPath 
              : `${this.baseUrl}${productPath}`
            
            // Get image URL
            const imageUrl = $item.find('img.s-image').attr('src') ||
                           $item.find('[data-image-source-density="1"]').attr('src') || ''
            
            // Extract discount badge
            const discountBadge = $item.find('.s-coupon-unclipped').text() ||
                                $item.find('.a-badge-label-percentage').text() ||
                                $item.find('[class*="badge"] [class*="percentage"]').text() || ''
            
            // Skip if essential data is missing
            if (!title || !priceText || !productUrl || !asin) {
              logger.debug(`Skipping Amazon item ${index}: missing data`, {
                title: !!title,
                price: !!priceText,
                url: !!productUrl,
                asin: !!asin
              })
              return
            }

            const price = this.extractAmazonPrice(priceText)
            const originalPrice = originalPriceText ? this.extractAmazonPrice(originalPriceText) : undefined
            
            // Calculate discount
            let discount = discountBadge
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
              imageUrl: this.normalizeAmazonImage(imageUrl),
              productUrl: this.cleanAmazonUrl(productUrl),
              platform: Platform.AMAZON,
              category: this.extractAmazonCategory($, keyword),
              scrapedAt: new Date()
            }

            // Extract ratings
            const ratingsText = $item.find('.a-icon-star-small .a-icon-alt').text() ||
                              $item.find('[class*="star"] .a-icon-alt').text() || ''
            const ratingsMatch = ratingsText.match(/(\d+[,.]?\d*) de 5/)
            if (ratingsMatch) {
              product.ratings = parseFloat(ratingsMatch[1].replace(',', '.'))
            }

            // Extract review count
            const reviewCountText = $item.find('[aria-label*="avaliações"]').text() ||
                                  $item.find('.s-link-style .s-underline-text').text() || ''
            const reviewMatch = reviewCountText.match(/(\d+\.?\d*)/);
            if (reviewMatch) {
              let count = reviewMatch[1].replace('.', '')
              product.reviewCount = parseInt(count)
            }
            
            // Check for Prime
            const hasPrime = $item.find('[aria-label="Amazon Prime"]').length > 0 ||
                           $item.find('.s-prime').length > 0
            
            // Check for free shipping
            const hasFreeShipping = $item.find('.a-color-base:contains("Frete GRÁTIS")').length > 0 ||
                                  hasPrime
            
            if (hasFreeShipping && product.discount) {
              product.discount += hasPrime ? ' + PRIME' : ' + FRETE GRÁTIS'
            } else if (hasPrime) {
              product.discount = (product.discount || '') + ' PRIME'
            }

            // Add ASIN to product data for tracking
            product.metadata = { asin }

            logProductFound('Amazon', product)
            progress.showProduct(product)
            products.push(product)
            
          } catch (error) {
            logger.error(`Failed to parse Amazon product at index ${index}:`, { error, index })
          }
        })
        break
      }
    }
    
    if (!itemsFound) {
      logger.warn(`No products found on Amazon for: ${keyword}`, { keyword, url: searchUrl })
      progress.showWarning(`Nenhum produto encontrado na Amazon para: ${keyword}`)
    }

    return products
  }

  private async scrapeCategory(category: string, config: ScraperConfig): Promise<ScrapedProduct[]> {
    // Use category node ID for more accurate results
    const nodeId = this.categoryNodes[category]
    if (nodeId) {
      const categoryConfig = { ...config, keywords: [`node:${nodeId}`] }
      return this.searchProducts('', { ...categoryConfig, keywords: [] })
    }
    
    // Fallback to keyword search
    return this.searchProducts(category, config)
  }

  private extractAmazonPrice(priceText: string): number {
    // Remove currency symbol and convert
    const cleanPrice = priceText
      .replace(/R\$\s*/g, '')
      .replace(/\./g, '') // Remove thousand separators
      .replace(',', '.') // Convert decimal separator
      .trim()
    
    const match = cleanPrice.match(/\d+\.?\d*/)
    return match ? parseFloat(match[0]) : 0
  }

  private cleanAmazonUrl(url: string): string {
    if (!url) return ''
    
    // Extract clean product URL without tracking parameters
    const cleanUrl = url.split('/ref=')[0]
    
    if (cleanUrl.startsWith('http')) {
      return cleanUrl
    }
    
    return `${this.baseUrl}${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`
  }

  private normalizeAmazonImage(imageUrl: string): string {
    if (!imageUrl) return ''
    
    // Get larger image size
    if (imageUrl.includes('._AC_')) {
      // Replace with larger size
      return imageUrl.replace(/\._AC_.*\./, '._AC_SL1500_.')
    }
    
    return imageUrl
  }

  private extractAmazonCategory($: any, fallback: string): string {
    // Try to extract from breadcrumbs or department
    const department = $('.a-color-bold:contains("Departamento")').next().text().trim() ||
                      $('#nav-subnav').attr('data-category') || ''
    
    return department || fallback
  }

  private getAmazonUserAgent(): string {
    // Use desktop user agents that work well with Amazon
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
    ]
    return userAgents[Math.floor(Math.random() * userAgents.length)]
  }
}