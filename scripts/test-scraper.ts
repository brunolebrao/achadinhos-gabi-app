#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import { MercadoLivreScraper } from '../apps/scraper/src/scrapers/mercadolivre'
import { ScraperManager } from '../apps/scraper/src/lib/scraper-manager'

const prisma = new PrismaClient()

async function testRealScraper() {
  console.log('🚀 Starting real Mercado Livre scraper test...\n')

  try {
    // Create or update scraper config for testing
    const config = await prisma.scraperConfig.upsert({
      where: { 
        platform_name: {
          platform: 'MERCADOLIVRE',
          name: 'Mercado Livre - Ofertas Reais'
        }
      },
      update: {
        keywords: ['iphone', 'notebook', 'smart tv', 'fone bluetooth', 'tablet'],
        categories: ['eletronicos', 'informatica', 'celulares-telefones'],
        minDiscount: 30, // Only products with 30%+ discount
        maxProducts: 20,
        minPrice: 50,
        maxPrice: 5000,
        isActive: true,
        lastRun: null
      },
      create: {
        name: 'Mercado Livre - Ofertas Reais',
        platform: 'MERCADOLIVRE',
        keywords: ['iphone', 'notebook', 'smart tv', 'fone bluetooth', 'tablet'],
        categories: ['eletronicos', 'informatica', 'celulares-telefones'],
        minDiscount: 30,
        maxProducts: 20,
        minPrice: 50,
        maxPrice: 5000,
        frequency: '0 */2 * * *', // Every 2 hours
        isActive: true
      }
    })

    console.log('📋 Scraper config:', {
      name: config.name,
      keywords: config.keywords,
      minDiscount: config.minDiscount,
      maxProducts: config.maxProducts
    })
    console.log()

    // Initialize scraper
    const scraper = new MercadoLivreScraper()
    
    console.log('🔍 Starting to scrape Mercado Livre...\n')
    const products = await scraper.scrape(config)
    
    console.log(`\n✅ Found ${products.length} products with discounts!\n`)

    // Display products
    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.title}`)
      console.log(`   💰 Price: R$ ${product.price.toFixed(2)}`)
      if (product.originalPrice) {
        console.log(`   🏷️  Original: R$ ${product.originalPrice.toFixed(2)}`)
      }
      if (product.discount) {
        console.log(`   🎯 Discount: ${product.discount}`)
      }
      if (product.ratings) {
        console.log(`   ⭐ Rating: ${product.ratings} (${product.reviewCount || 0} reviews)`)
      }
      if (product.salesCount) {
        console.log(`   📦 Sales: ${product.salesCount}`)
      }
      console.log(`   🔗 URL: ${product.productUrl}`)
      console.log()
    })

    // Save to database
    console.log('💾 Saving products to database...\n')
    
    let savedCount = 0
    let updatedCount = 0
    
    for (const product of products) {
      try {
        // Check if product already exists
        const existing = await prisma.product.findFirst({
          where: {
            productUrl: product.productUrl
          }
        })

        if (existing) {
          // Update price if changed
          if (existing.price !== product.price) {
            await prisma.product.update({
              where: { id: existing.id },
              data: {
                price: product.price,
                originalPrice: product.originalPrice,
                discount: product.discount,
                status: 'PENDING' // Reset to pending for review
              }
            })
            
            // Add price history
            await prisma.priceHistory.create({
              data: {
                productId: existing.id,
                price: product.price,
                originalPrice: product.originalPrice,
                discount: product.discount
              }
            })
            
            updatedCount++
            console.log(`📝 Updated: ${product.title}`)
          }
        } else {
          // Create new product
          await prisma.product.create({
            data: {
              title: product.title,
              price: product.price,
              originalPrice: product.originalPrice,
              discount: product.discount,
              imageUrl: product.imageUrl,
              productUrl: product.productUrl,
              affiliateUrl: product.affiliateUrl,
              platform: product.platform,
              category: product.category,
              ratings: product.ratings,
              reviewCount: product.reviewCount,
              salesCount: product.salesCount,
              status: 'PENDING',
              scrapedAt: product.scrapedAt
            }
          })
          
          savedCount++
          console.log(`✅ Saved: ${product.title}`)
        }
        
      } catch (error) {
        console.error(`❌ Failed to save product: ${product.title}`, error)
      }
    }

    console.log(`\n📊 Summary:`)
    console.log(`   - New products: ${savedCount}`)
    console.log(`   - Updated products: ${updatedCount}`)
    console.log(`   - Total processed: ${products.length}`)

  } catch (error) {
    console.error('❌ Scraper test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testRealScraper()
  .then(() => {
    console.log('\n✨ Scraper test completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })