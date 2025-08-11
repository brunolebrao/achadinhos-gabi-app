import dotenv from 'dotenv'
import { Platform } from '@repo/shared'
import { MercadoLivreScraper } from './src/scrapers/mercadolivre'
import { ShopeeScraperV2 } from './src/scrapers/shopee-v2'
import { AmazonScraperV2 } from './src/scrapers/amazon-v2'
import chalk from 'chalk'

dotenv.config()

async function testScrapers() {
  console.log(chalk.bold.cyan('\n🧪 Testando Scrapers\n'))
  
  const testConfig = {
    id: 'test',
    name: 'Test Scraper',
    platform: 'MERCADOLIVRE' as Platform,
    keywords: ['notebook'],
    categories: [],
    minPrice: 100,
    maxPrice: 5000,
    minDiscount: 10,
    maxProducts: 3,
    frequency: '0 */6 * * *',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastRun: null,
    nextRun: null,
    userId: null
  }
  
  const scrapers = [
    { name: 'Mercado Livre', scraper: new MercadoLivreScraper(), platform: Platform.MERCADOLIVRE },
    { name: 'Shopee', scraper: new ShopeeScraperV2(), platform: Platform.SHOPEE },
    { name: 'Amazon', scraper: new AmazonScraperV2(), platform: Platform.AMAZON }
  ]
  
  for (const { name, scraper, platform } of scrapers) {
    console.log(chalk.yellow(`\nTestando ${name}...`))
    
    try {
      const config = { ...testConfig, platform }
      const products = await scraper.scrape(config)
      
      if (products.length > 0) {
        console.log(chalk.green(`✅ ${name}: ${products.length} produtos encontrados`))
        
        const product = products[0]
        console.log(chalk.gray('  Exemplo:'))
        console.log(chalk.gray(`    Título: ${product.title?.substring(0, 50)}...`))
        console.log(chalk.gray(`    Preço: R$ ${product.price}`))
        console.log(chalk.gray(`    Plataforma: ${product.platform}`))
        console.log(chalk.gray(`    URL: ${product.productUrl?.substring(0, 50)}...`))
        
        // Verificar se a plataforma está correta
        if (product.platform !== platform) {
          console.log(chalk.red(`    ⚠️ ERRO: Plataforma incorreta! Esperado: ${platform}, Recebido: ${product.platform}`))
        }
        
        // Verificar se a URL é da plataforma correta
        const urlCheck = {
          [Platform.MERCADOLIVRE]: 'mercadolivre.com.br',
          [Platform.SHOPEE]: 'shopee.com.br',
          [Platform.AMAZON]: 'amazon.com.br'
        }
        
        if (!product.productUrl?.includes(urlCheck[platform])) {
          console.log(chalk.red(`    ⚠️ ERRO: URL incorreta! Deveria conter: ${urlCheck[platform]}`))
        }
      } else {
        console.log(chalk.red(`❌ ${name}: Nenhum produto encontrado`))
      }
    } catch (error) {
      console.log(chalk.red(`❌ ${name}: Erro ao executar`))
      console.error(chalk.red(`   ${error}`))
    }
  }
  
  console.log(chalk.cyan('\n✨ Teste concluído!\n'))
  process.exit(0)
}

testScrapers().catch(err => {
  console.error(chalk.red('Erro fatal:'), err)
  process.exit(1)
})