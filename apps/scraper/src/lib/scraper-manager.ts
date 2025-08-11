import { ScraperConfig, Platform, prisma } from '@repo/database'
import { ScrapedProduct } from '@repo/shared'
import PQueue from 'p-queue'
import { calculateNextRun } from '../utils/cron'
import { BaseScraper } from './base-scraper'
import { logger, logScraperStart, logScraperComplete, logScraperError, logScraperProgress } from './logger'
import { progress } from './progress'

export class ScraperManager {
  private scrapers = new Map<Platform, BaseScraper>()
  private queue = new PQueue({ concurrency: 10 }) // Increased concurrency for better performance
  private productCache = new Map<string, boolean>() // Cache to avoid duplicate DB checks

  registerScraper(platform: Platform, scraper: BaseScraper) {
    this.scrapers.set(platform, scraper)
  }

  async runScraper(config: ScraperConfig, executionId?: string) {
    const scraper = this.scrapers.get(config.platform)
    if (!scraper) {
      const error = `No scraper registered for platform: ${config.platform}`
      logger.error(error)
      throw new Error(error)
    }

    const startTime = Date.now()
    
    // Show visual feedback
    logScraperStart(config.name, config.platform)
    progress.startScraper(config.name, config.maxProducts)
    
    // Use existing execution or create new one
    let execution
    if (executionId) {
      execution = await prisma.scraperExecution.findUnique({
        where: { id: executionId }
      })
      if (!execution) {
        throw new Error(`Execution ${executionId} not found`)
      }
    } else {
      execution = await prisma.scraperExecution.create({
        data: {
          scraperId: config.id,
          status: 'RUNNING',
          startedAt: new Date()
        }
      })
    }

    try {
      await prisma.scraperConfig.update({
        where: { id: config.id },
        data: { lastRun: new Date() }
      })

      // Show progress while scraping
      progress.showSpinner(`Buscando produtos em ${config.platform}...`)
      
      const products = await this.queue.add(() => 
        scraper.scrape(config)
      ) || []
      
      progress.hideSpinner(true, `${products.length} produtos encontrados`)
      
      // Save products with progress
      progress.showSpinner('Salvando produtos no banco de dados...')
      const productsAdded = await this.saveProducts(products, config.platform, config.userId ?? undefined)
      progress.hideSpinner(true, `${productsAdded} novos produtos adicionados`)

      await prisma.scraperExecution.update({
        where: { id: execution.id },
        data: {
          status: 'SUCCESS',
          finishedAt: new Date(),
          productsFound: products.length,
          productsAdded
        }
      })

      const nextRun = calculateNextRun(config.frequency)
      await prisma.scraperConfig.update({
        where: { id: config.id },
        data: { nextRun }
      })

      const duration = Date.now() - startTime
      
      // Log completion
      logScraperComplete(config.name, {
        productsFound: products.length,
        productsAdded,
        duration
      })
      
      // Show visual stats
      progress.stopScraper(true, `${config.name} concluído com sucesso`)
      progress.showStats({
        totalProducts: products.length,
        newProducts: productsAdded,
        updatedProducts: products.length - productsAdded,
        errors: 0,
        duration: Math.round(duration / 1000)
      })
    } catch (error) {
      const duration = Date.now() - startTime
      
      // Log error
      logScraperError(config.name, error)
      
      // Show visual error
      progress.hideSpinner(false, 'Erro durante scraping')
      progress.stopScraper(false, `${config.name} falhou`)
      progress.showError(error instanceof Error ? error.message : 'Unknown error')
      
      await prisma.scraperExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      const nextRun = calculateNextRun(config.frequency, true)
      await prisma.scraperConfig.update({
        where: { id: config.id },
        data: { nextRun }
      })
    }
  }

  private async saveProducts(products: ScrapedProduct[], platform: Platform, userId?: string): Promise<number> {
    if (products.length === 0) return 0
    
    let added = 0
    const startTime = Date.now()
    
    try {
      // Batch fetch all existing products
      const productUrls = products.map(p => p.productUrl)
      const existingProducts = await prisma.product.findMany({
        where: {
          platform,
          productUrl: { in: productUrls }
        }
      })
      
      // Create maps for quick lookup
      const existingProductMap = new Map(
        existingProducts.map(p => [p.productUrl, p])
      )
      
      // Separate products into new and existing
      const newProducts: ScrapedProduct[] = []
      const updatedProducts: Array<{product: ScrapedProduct, existing: any}> = []
      const priceHistoryData: any[] = []
      
      for (const product of products) {
        const cacheKey = `${platform}:${product.productUrl}`
        
        // Check cache first
        if (this.productCache.has(cacheKey)) {
          const existing = existingProductMap.get(product.productUrl)
          if (existing && existing.price !== product.price) {
            updatedProducts.push({ product, existing })
            priceHistoryData.push({
              productId: existing.id,
              price: product.price,
              originalPrice: product.originalPrice,
              discount: product.discount,
              recordedAt: new Date()
            })
          }
        } else {
          const existing = existingProductMap.get(product.productUrl)
          if (existing) {
            this.productCache.set(cacheKey, true)
            if (existing.price !== product.price) {
              updatedProducts.push({ product, existing })
              priceHistoryData.push({
                productId: existing.id,
                price: product.price,
                originalPrice: product.originalPrice,
                discount: product.discount,
                recordedAt: new Date()
              })
            }
          } else {
            newProducts.push(product)
          }
        }
      }
      
      // Bulk create new products
      if (newProducts.length > 0) {
        const newProductsData = await Promise.all(
          newProducts.map(async (product) => ({
            ...product,
            affiliateUrl: await this.generateAffiliateUrl(product.productUrl, platform, userId),
            status: 'PENDING' as const
          }))
        )
        
        // Use createMany for bulk insert
        await prisma.product.createMany({
          data: newProductsData,
          skipDuplicates: true
        })
        
        added = newProducts.length
        
        // Add to cache
        newProducts.forEach(p => {
          this.productCache.set(`${platform}:${p.productUrl}`, true)
        })
      }
      
      // Bulk create price history records
      if (priceHistoryData.length > 0) {
        await prisma.priceHistory.createMany({
          data: priceHistoryData,
          skipDuplicates: true
        })
      }
      
      // Bulk update existing products (if needed)
      if (updatedProducts.length > 0) {
        // Use transaction for multiple updates
        await prisma.$transaction(
          updatedProducts.map(({ product, existing }) =>
            prisma.product.update({
              where: { id: existing.id },
              data: {
                price: product.price,
                originalPrice: product.originalPrice,
                discount: product.discount,
                scrapedAt: new Date()
              }
            })
          )
        )
      }
      
      const duration = Date.now() - startTime
      logger.info(`Saved ${added} new products and updated ${updatedProducts.length} in ${duration}ms`, {
        platform,
        newProducts: added,
        updatedProducts: updatedProducts.length,
        totalProducts: products.length,
        duration
      })
      
    } catch (error) {
      logger.error('Failed to save products in bulk:', { error, platform })
      // Fallback to individual saves if bulk operation fails
      return this.saveProductsIndividually(products, platform, userId)
    }
    
    // Clear cache if it gets too large
    if (this.productCache.size > 10000) {
      this.productCache.clear()
    }
    
    return added
  }
  
  // Fallback method for individual saves
  private async saveProductsIndividually(products: ScrapedProduct[], platform: Platform, userId?: string): Promise<number> {
    let added = 0
    
    for (const product of products) {
      try {
        const existingProduct = await prisma.product.findFirst({
          where: {
            platform,
            productUrl: product.productUrl
          }
        })

        if (!existingProduct) {
          await prisma.product.create({
            data: {
              ...product,
              affiliateUrl: await this.generateAffiliateUrl(product.productUrl, platform, userId),
              status: 'PENDING'
            }
          })
          added++
        }
      } catch (error) {
        logger.error('Failed to save product individually:', { error, product })
      }
    }
    
    return added
  }

  private async generateAffiliateUrl(productUrl: string, platform: Platform, userId?: string): Promise<string> {
    // Try to get user-specific config first
    if (userId) {
      const config = await prisma.affiliateConfig.findUnique({
        where: { userId }
      })

      if (config) {
        switch (platform) {
          case 'MERCADOLIVRE':
            if (config.mercadolivreId) {
              const url = new URL(productUrl)
              url.searchParams.set('tracking_id', config.mercadolivreId)
              if (config.enableTracking && config.customUtmSource) {
                url.searchParams.set('utm_source', config.customUtmSource)
                url.searchParams.set('utm_medium', config.customUtmMedium || 'affiliate')
                if (config.customUtmCampaign) {
                  url.searchParams.set('utm_campaign', config.customUtmCampaign)
                }
              }
              return url.toString()
            }
            break
          
          case 'AMAZON':
            if (config.amazonTag) {
              const url = new URL(productUrl)
              url.searchParams.set('tag', config.amazonTag)
              return url.toString()
            }
            break
          
          case 'SHOPEE':
            if (config.shopeeId) {
              const url = new URL(productUrl)
              url.searchParams.set('af_id', config.shopeeId)
              return url.toString()
            }
            break
          
        }
      }
    }

    // Fallback to environment variables (for backward compatibility)
    switch (platform) {
      case 'MERCADOLIVRE':
        const mlAffiliateId = process.env.MERCADOLIVRE_AFFILIATE_ID
        return mlAffiliateId ? `${productUrl}?tracking_id=${mlAffiliateId}` : productUrl
      
      case 'SHOPEE':
        const shopeeAffiliateId = process.env.SHOPEE_AFFILIATE_ID
        return shopeeAffiliateId ? `${productUrl}?af_id=${shopeeAffiliateId}` : productUrl
      
      case 'AMAZON':
        const amazonTag = process.env.AMAZON_ASSOCIATE_TAG
        return amazonTag ? `${productUrl}?tag=${amazonTag}` : productUrl
      
      
      default:
        return productUrl
    }
  }
}