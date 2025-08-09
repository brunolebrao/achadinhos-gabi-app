import { ScraperConfig } from '@repo/database'
import { ScrapedProduct, Platform } from '@repo/shared'
import { BaseScraper } from '../lib/base-scraper'
import { logger, logKeywordSearch, logCategorySearch, logProductFound, logRateLimit } from '../lib/logger'
import { progress } from '../lib/progress'

export class MercadoLivreScraper extends BaseScraper {
  private readonly baseUrl = 'https://lista.mercadolivre.com.br'
  private readonly apiUrl = 'https://api.mercadolibre.com/sites/MLB'
  
  // Popular categories for better scraping
  private readonly popularCategories = [
    'eletronicos',
    'celulares-telefones',
    'informatica',
    'casa-moveis-decoracao',
    'beleza-cuidado-pessoal',
    'calcados-roupas-bolsas',
    'esportes-fitness',
    'games',
    'brinquedos-hobbies'
  ]

  async scrape(config: ScraperConfig): Promise<ScrapedProduct[]> {
    const products: ScrapedProduct[] = []
    const MAX_CONCURRENT_KEYWORDS = 5 // Process up to 5 keywords in parallel
    
    // Process keywords in batches for better performance
    for (let i = 0; i < config.keywords.length; i += MAX_CONCURRENT_KEYWORDS) {
      const keywordBatch = config.keywords.slice(i, i + MAX_CONCURRENT_KEYWORDS)
      
      progress.updateSpinner(`Buscando ${keywordBatch.length} palavras-chave em paralelo...`)
      
      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        keywordBatch.map(async (keyword) => {
          try {
            const searchProducts = await this.searchProducts(keyword, config)
            logKeywordSearch('Mercado Livre', keyword, searchProducts.length)
            return searchProducts
          } catch (error) {
            logger.error(`Failed to search for "${keyword}":`, { error, keyword })
            progress.showWarning(`Falha ao buscar "${keyword}"`)
            return []
          }
        })
      )
      
      // Collect results from successful searches
      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value) {
          products.push(...result.value)
        }
      }
      
      // Update progress bar
      progress.updateProgress(products.length, `${products.length} produtos encontrados`)
      
      if (products.length >= config.maxProducts) {
        break
      }
      
      // Only delay between batches, not individual keywords
      if (i + MAX_CONCURRENT_KEYWORDS < config.keywords.length) {
        const delay = 1000 + Math.random() * 2000 // Reduced delay between batches
        logRateLimit('Mercado Livre', delay)
        progress.updateSpinner(`Aguardando ${(delay/1000).toFixed(1)}s antes do próximo lote...`, 'yellow')
        await this.delay(delay)
      }
    }

    // Process categories in parallel too
    if (config.categories.length > 0 && products.length < config.maxProducts) {
      const MAX_CONCURRENT_CATEGORIES = 3
      
      for (let i = 0; i < config.categories.length; i += MAX_CONCURRENT_CATEGORIES) {
        if (products.length >= config.maxProducts) break
        
        const categoryBatch = config.categories.slice(i, i + MAX_CONCURRENT_CATEGORIES)
        
        progress.updateSpinner(`Buscando ${categoryBatch.length} categorias em paralelo...`)
        
        const batchResults = await Promise.allSettled(
          categoryBatch.map(async (category) => {
            try {
              const categoryProducts = await this.scrapeCategory(category, config)
              logCategorySearch('Mercado Livre', category, categoryProducts.length)
              return categoryProducts
            } catch (error) {
              logger.error(`Failed to scrape category "${category}":`, { error, category })
              progress.showWarning(`Falha ao buscar categoria "${category}"`)
              return []
            }
          })
        )
        
        // Collect results
        for (const result of batchResults) {
          if (result.status === 'fulfilled' && result.value) {
            products.push(...result.value)
          }
        }
        
        // Update progress bar
        progress.updateProgress(products.length, `${products.length} produtos encontrados`)
        
        // Delay between category batches
        if (i + MAX_CONCURRENT_CATEGORIES < config.categories.length && products.length < config.maxProducts) {
          const delay = 1000 + Math.random() * 2000
          logRateLimit('Mercado Livre', delay)
          progress.updateSpinner(`Aguardando ${(delay/1000).toFixed(1)}s...`, 'yellow')
          await this.delay(delay)
        }
      }
    }

    return products.slice(0, config.maxProducts)
  }

  private async searchProducts(keyword: string, config: ScraperConfig): Promise<ScrapedProduct[]> {
    const products: ScrapedProduct[] = []
    
    // Build more robust search URL with better discount filter
    const searchParams: Record<string, string | undefined> = {
      '_OrderId': 'PRICE_DESC', // Order by highest price (usually better products)
      '_NoIndex': 'true'
    }
    
    // Add price range if configured
    if (config.minPrice && config.maxPrice) {
      searchParams['_PriceRange'] = `${config.minPrice}-${config.maxPrice}`
    }
    
    // Add discount filter - Mercado Livre uses percentage ranges
    if (config.minDiscount && config.minDiscount >= 30) {
      searchParams['_Discount'] = `${config.minDiscount}-100`
    } else if (config.minDiscount) {
      searchParams['_Discount'] = '30-100' // Default to 30% minimum discount
    }
    
    const searchUrl = this.buildSearchUrl(`${this.baseUrl}/${keyword.replace(/ /g, '-')}`, searchParams)
    logger.debug(`Scraping URL: ${searchUrl}`, { platform: 'Mercado Livre', keyword })

    const html = await this.fetchHTML(searchUrl)
    const $ = this.parseHTML(html)

    // Updated selectors based on current Mercado Livre structure (2025)
    const itemSelectors = [
      '.ui-search-layout__item',
      '.poly-card',
      '.ui-search-result__wrapper',
      'li.ui-search-layout__item',
      'div[class*="search-result"]'
    ]
    
    let itemsFound = false
    for (const selector of itemSelectors) {
      if ($(selector).length > 0) {
        itemsFound = true
        $(selector).each((index, element) => {
          if (products.length >= config.maxProducts) return false // Stop if we have enough
          
          try {
            const $item = $(element)
            
            // Updated selectors for title - mais abrangente
            const title = $item.find('h3.poly-box, h2.poly-box').text().trim() ||
                         $item.find('a.poly-component__title').attr('title') ||
                         $item.find('h2.ui-search-item__title').text().trim() ||
                         $item.find('a.ui-search-item__group__element').attr('title') ||
                         $item.find('a.ui-search-link').attr('title') ||
                         $item.find('[class*="title"]').first().text().trim() || ''
            
            // Extract price from poly-price structure - mais seletores
            const priceElement = $item.find('.poly-price__current .andes-money-amount__fraction').first()
            const priceText = priceElement.text().replace(/\./g, '').replace(',', '.') ||
                            $item.find('.ui-search-price__second-line .andes-money-amount__fraction').text().replace(/\./g, '').replace(',', '.') ||
                            $item.find('.price-tag-amount .andes-money-amount__fraction').text().replace(/\./g, '').replace(',', '.') ||
                            $item.find('[class*="price"]').first().text().match(/\d+\.?\d*/)?.[0] || ''
            
            // Extract original price from poly-price structure
            const originalPriceElement = $item.find('.poly-price__prev s.andes-money-amount__fraction, s.andes-money-amount__fraction').first()
            const originalPriceText = originalPriceElement.text().replace(/\./g, '').replace(',', '.') ||
                                    $item.find('s').first().text().match(/\d+\.?\d*/)?.[0] || ''
            
            // Get product URL from poly-card link
            const productUrl = $item.find('a.poly-component__title').attr('href') ||
                             $item.find('a[href*="produto"]').first().attr('href') ||
                             $item.find('a').first().attr('href') || ''
            
            // Get image URL from poly-card
            const imageUrl = $item.find('img.poly-component__picture').attr('src') ||
                            $item.find('img.poly-component__picture').attr('data-src') ||
                            $item.find('img').first().attr('src') ||
                            $item.find('img').first().attr('data-src') || ''
            
            // Extract discount percentage from poly-price
            const discountText = $item.find('.poly-price__current .andes-money-amount__discount').text().trim() ||
                               $item.find('[class*="discount"]').text().trim()
            
            // Skip if essential data is missing
            if (!title || !priceText || !productUrl) {
              logger.debug(`Skipping item ${index}: missing essential data`, { 
                title: !!title, 
                price: !!priceText, 
                url: !!productUrl 
              })
              return
            }

            const price = this.extractPrice(priceText)
            const originalPrice = originalPriceText ? this.extractPrice(originalPriceText) : undefined
            
            // Calculate discount if we have both prices
            let discount = discountText
            if (!discount && originalPrice && price < originalPrice) {
              const discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100)
              discount = `${discountPercent}% OFF`
            }
            
            // Skip products without significant discount
            if (config.minDiscount && config.minDiscount > 0) {
              const discountValue = parseInt(discount?.replace(/\D/g, '') || '0')
              if (discountValue < config.minDiscount) {
                logger.debug(`Skipping product with insufficient discount`, {
                  discount: discountValue,
                  required: config.minDiscount
                })
                return
              }
            }
            
            const product: ScrapedProduct = {
              title: title.substring(0, 200), // Limit title length
              price,
              originalPrice,
              discount,
              imageUrl: imageUrl.replace('_I.jpg', '_W.jpg'), // Get better quality image
              productUrl: this.normalizeUrl(productUrl),
              platform: Platform.MERCADOLIVRE,
              category: this.extractCategory($, keyword),
              scrapedAt: new Date()
            }

            // Extract ratings
            const ratings = $item.find('.ui-search-reviews__rating-number').text().trim()
            if (ratings) {
              product.ratings = parseFloat(ratings.replace(',', '.'))
            }

            // Extract review count
            const reviewText = $item.find('.ui-search-reviews__amount').text()
            const reviewMatch = reviewText.match(/\((\d+)\)/)
            if (reviewMatch) {
              product.reviewCount = parseInt(reviewMatch[1])
            }
            
            // Extract sales count if available
            const salesText = $item.find('.ui-search-item__highlight-label').text()
            const salesMatch = salesText.match(/(\d+).*vendid/i)
            if (salesMatch) {
              product.salesCount = parseInt(salesMatch[1])
            }
            
            // Check for free shipping
            const hasFreeShipping = $item.find('.ui-search-item__shipping--free').length > 0
            if (hasFreeShipping && product.discount) {
              product.discount += ' + FRETE GRÁTIS'
            }

            logProductFound('Mercado Livre', product)
            progress.showProduct(product)
            products.push(product)
            
          } catch (error) {
            logger.error(`Failed to parse product at index ${index}:`, { error, index })
          }
        })
        break // Stop after finding items with first working selector
      }
    }
    
    if (!itemsFound) {
      logger.warn(`No products found for keyword: ${keyword}`, { keyword, url: searchUrl })
      progress.showWarning(`Nenhum produto encontrado para: ${keyword}`)
    }

    return products
  }

  private async scrapeCategory(category: string, config: ScraperConfig): Promise<ScrapedProduct[]> {
    const categoryUrl = `${this.baseUrl}/${category}`
    return this.searchProducts(category, config)
  }

  private normalizeUrl(url: string): string {
    if (url.startsWith('http')) {
      return url.split('?')[0] || url
    }
    const fullUrl = `https://www.mercadolivre.com.br${url}`
    return fullUrl.split('?')[0] || fullUrl
  }

  private extractCategory($: any, fallback: string): string {
    const breadcrumb = $('.ui-search-breadcrumb__item').last().text().trim()
    return breadcrumb || fallback
  }
}