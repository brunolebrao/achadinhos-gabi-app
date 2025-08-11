import { prisma, Platform } from '@repo/database'
import { MercadoLivreScraper } from './apps/scraper/src/scrapers/mercadolivre'
import { AmazonScraperV2 } from './apps/scraper/src/scrapers/amazon-v2'
import { ShopeeScraperV2 } from './apps/scraper/src/scrapers/shopee-v2'
import chalk from 'chalk'

async function testAllPlatforms() {
  console.log(chalk.bold.cyan('\n🔍 Testando Todas as Plataformas\n'))
  
  try {
    // 1. Check current database state
    console.log(chalk.yellow('1. Estado atual do banco:'))
    const productCounts = await prisma.product.groupBy({
      by: ['platform'],
      _count: true
    })
    
    if (productCounts.length === 0) {
      console.log(chalk.gray('   Banco vazio'))
    } else {
      productCounts.forEach(p => {
        console.log(`   ${p.platform}: ${p._count} produtos`)
      })
    }
    
    const scrapers = [
      { name: 'Mercado Livre', scraper: new MercadoLivreScraper(), platform: Platform.MERCADOLIVRE },
      { name: 'Amazon', scraper: new AmazonScraperV2(), platform: Platform.AMAZON },
      { name: 'Shopee', scraper: new ShopeeScraperV2(), platform: Platform.SHOPEE }
    ]
    
    for (const { name, scraper, platform } of scrapers) {
      console.log(chalk.yellow(`\n2. Testando ${name}:`))
      
      const config = {
        id: `test-${platform.toLowerCase()}`,
        name: `Test ${name}`,
        platform,
        keywords: ['smartwatch'],
        categories: [],
        minPrice: 50,
        maxPrice: 500,
        minDiscount: 0,
        maxProducts: 3,
        frequency: '0 */6 * * *',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastRun: null,
        nextRun: null,
        userId: null
      }
      
      const products = await scraper.scrape(config)
      console.log(chalk.green(`   ✅ ${products.length} produtos encontrados`))
      
      // Save to database
      let saved = 0
      for (const product of products) {
        try {
          const existing = await prisma.product.findFirst({
            where: { productUrl: product.productUrl }
          })
          
          if (!existing) {
            await prisma.product.create({
              data: {
                title: product.title,
                price: product.price,
                originalPrice: product.originalPrice,
                discount: product.discount,
                imageUrl: product.imageUrl,
                productUrl: product.productUrl,
                platform: product.platform,
                category: product.category,
                ratings: product.ratings,
                reviewCount: product.reviewCount,
                salesCount: product.salesCount,
                status: 'PENDING',
                scrapedAt: product.scrapedAt
              }
            })
            saved++
            console.log(chalk.gray(`      • ${product.title.substring(0, 50)}...`))
          }
        } catch (error) {
          console.log(chalk.red(`      ❌ Erro: ${error}`))
        }
      }
      
      if (saved > 0) {
        console.log(chalk.blue(`   📊 ${saved} produtos salvos`))
      }
    }
    
    // 3. Final database state
    console.log(chalk.yellow('\n3. Estado final do banco:'))
    const finalCounts = await prisma.product.groupBy({
      by: ['platform'],
      _count: true
    })
    
    let total = 0
    finalCounts.forEach(p => {
      console.log(`   ${p.platform}: ${p._count} produtos`)
      total += p._count
    })
    console.log(chalk.green(`   TOTAL: ${total} produtos`))
    
    // 4. Sample products from each platform
    console.log(chalk.yellow('\n4. Amostra de produtos:'))
    for (const platform of [Platform.MERCADOLIVRE, Platform.AMAZON, Platform.SHOPEE]) {
      const sample = await prisma.product.findFirst({
        where: { platform },
        orderBy: { createdAt: 'desc' }
      })
      
      if (sample) {
        console.log(`   ${platform}:`)
        console.log(`      ${sample.title.substring(0, 60)}...`)
        console.log(`      R$ ${sample.price} ${sample.discount || ''}`)
      }
    }
    
  } catch (error) {
    console.error(chalk.red('Erro:'), error)
  } finally {
    await prisma.$disconnect()
  }
}

testAllPlatforms().catch(console.error)