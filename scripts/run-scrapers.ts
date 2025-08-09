#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import { ScraperManager } from '../apps/scraper/src/lib/scraper-manager'
import { MercadoLivreScraper } from '../apps/scraper/src/scrapers/mercadolivre'
import { TechGadgetsScraper } from '../apps/scraper/src/scrapers/tech-gadgets'

const prisma = new PrismaClient()

async function runScrapers() {
  console.log('🚀 Starting automatic scraper execution...\n')

  try {
    // Initialize scraper manager
    const manager = new ScraperManager()
    
    // Register available scrapers
    manager.registerScraper('MERCADOLIVRE', new MercadoLivreScraper())
    
    // Register tech-gadgets scraper for Mercado Livre platform
    // It uses the same platform but with specialized logic
    const techScraper = new TechGadgetsScraper()
    // We can use it for configs marked with "tech" category
    
    // Get all active scraper configs
    const configs = await prisma.scraperConfig.findMany({
      where: {
        isActive: true
      }
    })
    
    console.log(`📋 Found ${configs.length} active scraper configurations\n`)
    
    // Process each configuration
    for (const config of configs) {
      console.log(`\n🔧 Processing: ${config.name}`)
      console.log(`   Platform: ${config.platform}`)
      console.log(`   Keywords: ${config.keywords.join(', ')}`)
      console.log(`   Min Discount: ${config.minDiscount}%`)
      console.log(`   Max Products: ${config.maxProducts}`)
      
      try {
        // Use tech scraper for tech-related configs
        const isTechConfig = config.categories.some(cat => 
          cat.toLowerCase().includes('tech') || 
          cat.toLowerCase().includes('tecnologia') ||
          cat.toLowerCase().includes('eletrônicos') ||
          cat.toLowerCase().includes('smartphones')
        ) || config.name.toLowerCase().includes('tech')
        
        // Register appropriate scraper based on config
        if (isTechConfig && config.platform === 'MERCADOLIVRE') {
          manager.registerScraper('MERCADOLIVRE', new TechGadgetsScraper())
        }
        
        // Execute the scraper
        const result = await manager.runScraper(config)
        
        if (result.success) {
          console.log(`✅ Success: ${result.productsAdded} new products, ${result.productsUpdated} updated`)
        } else {
          console.error(`❌ Failed: ${result.error}`)
        }
      } catch (error) {
        console.error(`❌ Error executing scraper: ${error}`)
      }
      
      // Update lastRun timestamp
      await prisma.scraperConfig.update({
        where: { id: config.id },
        data: { lastRun: new Date() }
      })
      
      // Small delay between scrapers
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
    
    // Get summary of all products
    const totalProducts = await prisma.product.count()
    const pendingProducts = await prisma.product.count({
      where: { status: 'PENDING' }
    })
    const approvedProducts = await prisma.product.count({
      where: { status: 'APPROVED' }
    })
    
    console.log('\n📊 Final Summary:')
    console.log(`   Total products in database: ${totalProducts}`)
    console.log(`   Pending review: ${pendingProducts}`)
    console.log(`   Approved: ${approvedProducts}`)
    
  } catch (error) {
    console.error('❌ Scraper execution failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the scrapers
runScrapers()
  .then(() => {
    console.log('\n✨ Scraper execution completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })