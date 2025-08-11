import { prisma, Platform } from '@repo/database'
import { AmazonScraperV2 } from './apps/scraper/src/scrapers/amazon-v2'
import chalk from 'chalk'

async function testAmazonDatabase() {
  console.log(chalk.bold.cyan('\n🔍 Testando Amazon Scraper com Banco de Dados\n'))
  
  try {
    // 1. Check current products in database
    console.log(chalk.yellow('1. Produtos atuais no banco:'))
    const productCounts = await prisma.product.groupBy({
      by: ['platform'],
      _count: true
    })
    
    productCounts.forEach(p => {
      console.log(`   ${p.platform}: ${p._count} produtos`)
    })
    
    // 2. Run Amazon scraper
    console.log(chalk.yellow('\n2. Executando Amazon Scraper:'))
    const scraper = new AmazonScraperV2()
    
    const config = {
      id: 'test-amazon',
      name: 'Test Amazon',
      platform: Platform.AMAZON,
      keywords: ['notebook gamer'],
      categories: [],
      minPrice: 1000,
      maxPrice: 10000,
      minDiscount: 10,
      maxProducts: 5,
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
    
    // 3. Save products to database
    console.log(chalk.yellow('\n3. Salvando produtos no banco:'))
    let saved = 0
    let errors = 0
    
    for (const product of products) {
      try {
        // Check if product already exists
        const existing = await prisma.product.findFirst({
          where: {
            productUrl: product.productUrl
          }
        })
        
        if (existing) {
          console.log(chalk.gray(`   ⏭️ Produto já existe: ${product.title?.substring(0, 40)}...`))
          continue
        }
        
        // Save new product
        const created = await prisma.product.create({
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
        
        console.log(chalk.green(`   ✅ Salvo: ${created.title.substring(0, 40)}...`))
        saved++
      } catch (error) {
        console.log(chalk.red(`   ❌ Erro ao salvar: ${error}`))
        errors++
      }
    }
    
    console.log(chalk.blue(`\n📊 Resultado: ${saved} salvos, ${errors} erros`))
    
    // 4. List Amazon products from database
    console.log(chalk.yellow('\n4. Produtos Amazon no banco:'))
    const amazonProducts = await prisma.product.findMany({
      where: {
        platform: Platform.AMAZON
      },
      take: 10,
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    if (amazonProducts.length === 0) {
      console.log(chalk.red('   ❌ Nenhum produto Amazon encontrado no banco'))
    } else {
      console.log(chalk.green(`   ✅ ${amazonProducts.length} produtos Amazon no banco:`))
      amazonProducts.forEach(p => {
        console.log(`      • ${p.title.substring(0, 50)}... - R$ ${p.price}`)
      })
    }
    
    // 5. Check if it's a platform enum issue
    console.log(chalk.yellow('\n5. Verificando valores de Platform:'))
    const allPlatforms = await prisma.product.findMany({
      select: {
        platform: true
      },
      distinct: ['platform']
    })
    
    console.log('   Plataformas únicas no banco:')
    allPlatforms.forEach(p => {
      console.log(`      • ${p.platform}`)
    })
    
  } catch (error) {
    console.error(chalk.red('Erro:'), error)
  } finally {
    await prisma.$disconnect()
  }
}

testAmazonDatabase().catch(console.error)