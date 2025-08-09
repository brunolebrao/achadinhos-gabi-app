#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import { ScraperManager } from '../apps/scraper/src/lib/scraper-manager'
import { MercadoLivreScraper } from '../apps/scraper/src/scrapers/mercadolivre'
import { ShopeeScraper } from '../apps/scraper/src/scrapers/shopee'
import { AmazonScraper } from '../apps/scraper/src/scrapers/amazon'
import { AliExpressScraper } from '../apps/scraper/src/scrapers/aliexpress'
import { TechGadgetsScraper } from '../apps/scraper/src/scrapers/tech-gadgets'

const prisma = new PrismaClient()

async function testScraperAffiliate() {
  console.log('🧪 Testing scraper with affiliate URL generation...\n')

  try {
    // Get the test scraper we just created
    const scraper = await prisma.scraperConfig.findFirst({
      where: { 
        name: 'Tech Gadgets - User Test',
        userId: { not: null }
      }
    })
    
    if (!scraper) {
      console.log('❌ Test scraper not found')
      return
    }
    
    console.log('✅ Found test scraper:')
    console.log('   Name:', scraper.name)
    console.log('   UserId:', scraper.userId)
    console.log('   Platform:', scraper.platform)
    
    // Get user's affiliate config
    const affiliateConfig = await prisma.affiliateConfig.findUnique({
      where: { userId: scraper.userId! }
    })
    
    if (affiliateConfig) {
      console.log('\n📊 User affiliate config:')
      console.log('   Mercado Livre ID:', affiliateConfig.mercadolivreId)
      console.log('   Enable Tracking:', affiliateConfig.enableTracking)
    }
    
    // Initialize scraper manager and register scrapers
    const scraperManager = new ScraperManager()
    scraperManager.registerScraper('MERCADOLIVRE', new MercadoLivreScraper())
    scraperManager.registerScraper('SHOPEE', new ShopeeScraper())
    scraperManager.registerScraper('AMAZON', new AmazonScraper())
    scraperManager.registerScraper('ALIEXPRESS', new AliExpressScraper())
    
    console.log('\n🚀 Running test scraper...')
    console.log('   This will scrape a few products and test affiliate URL generation')
    
    // Run the scraper
    await scraperManager.runScraper(scraper)
    
    console.log('\n🔍 Checking generated products...')
    
    // Check the products that were created
    const products = await prisma.product.findMany({
      where: {
        platform: scraper.platform,
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    })
    
    if (products.length > 0) {
      console.log(`✅ Found ${products.length} new products:`)
      products.forEach((product, index) => {
        console.log(`\n   Product ${index + 1}:`)
        console.log('   Name:', product.name)
        console.log('   Price: R$', product.price)
        console.log('   Original URL:', product.productUrl.substring(0, 60) + '...')
        console.log('   Affiliate URL:', product.affiliateUrl.substring(0, 80) + '...')
        
        // Check if affiliate URL contains the user's tracking ID
        if (affiliateConfig?.mercadolivreId && product.affiliateUrl.includes(affiliateConfig.mercadolivreId)) {
          console.log('   ✅ Affiliate URL contains user tracking ID!')
        } else {
          console.log('   ⚠️  Affiliate URL may not contain user tracking ID')
        }
      })
    } else {
      console.log('⚠️  No new products found - scraper may need more time or different keywords')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testScraperAffiliate()
  .then(() => {
    console.log('\n🏁 Test completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })