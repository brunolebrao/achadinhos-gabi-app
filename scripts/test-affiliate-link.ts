#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import chalk from 'chalk'
import { mapProductToVariables, renderTemplate, type ProductForTemplate } from '../apps/api/src/utils/template-utils'

const prisma = new PrismaClient()

// Set environment variables for testing
process.env.MERCADOLIVRE_AFFILIATE_ID = 'ML-TEST-AFFILIATE-123'
process.env.SHOPEE_AFFILIATE_ID = 'SHOPEE-TEST-456'
process.env.AMAZON_ASSOCIATE_TAG = 'amazon-test-20'

async function testAffiliateLinks() {
  console.log(chalk.bold.cyan('🧪 Teste de Links de Afiliados'))
  console.log(chalk.gray('═'.repeat(60)))
  console.log()

  try {
    // Test products from different platforms
    const testProducts: ProductForTemplate[] = [
      {
        id: 'ml-123',
        title: 'Produto Mercado Livre',
        price: 199.90,
        originalPrice: 299.90,
        discount: '33%',
        productUrl: 'https://www.mercadolivre.com.br/produto-teste/p/MLB12345678',
        imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_763456-MLU72655491952_112023-F.webp',
        platform: 'MERCADO_LIVRE',
        category: 'Eletrônicos',
        isNew: false
      },
      {
        id: 'shopee-456',
        title: 'Produto Shopee',
        price: 89.90,
        originalPrice: 149.90,
        discount: '40%',
        productUrl: 'https://shopee.com.br/product-i.123456.7890123',
        imageUrl: 'https://cf.shopee.com.br/file/test-image.jpg',
        platform: 'SHOPEE',
        category: 'Moda',
        isNew: false
      },
      {
        id: 'amazon-789',
        title: 'Produto Amazon',
        price: 599.00,
        originalPrice: 799.00,
        discount: '25%',
        productUrl: 'https://www.amazon.com.br/dp/B08N5WRWNW',
        imageUrl: 'https://m.media-amazon.com/images/I/test-image.jpg',
        platform: 'AMAZON',
        category: 'Livros',
        isNew: true
      }
    ]

    console.log(chalk.green('📦 Testando geração de links de afiliados:'))
    console.log()

    for (const product of testProducts) {
      console.log(chalk.yellow(`Platform: ${product.platform}`))
      console.log(`Original URL: ${product.productUrl}`)
      
      const variables = mapProductToVariables(product)
      console.log(chalk.green(`Affiliate URL: ${variables.affiliate_url}`))
      
      // Check if affiliate parameter was added
      if (variables.affiliate_url.includes('tracking_id=') || 
          variables.affiliate_url.includes('af_id=') || 
          variables.affiliate_url.includes('tag=')) {
        console.log(chalk.green('✅ Link de afiliado gerado com sucesso!'))
      } else {
        console.log(chalk.red('❌ Link de afiliado não foi gerado'))
      }
      
      console.log()
    }

    // Test template rendering with affiliate link
    console.log(chalk.gray('─'.repeat(60)))
    console.log(chalk.bold.cyan('📨 Teste de Template com Link de Afiliado:'))
    console.log()

    const template = await prisma.template.findFirst({
      where: { isDefault: true }
    })

    if (!template) {
      console.log(chalk.red('❌ Nenhum template padrão encontrado'))
      return
    }

    const product = testProducts[0] // Use Mercado Livre product
    const variables = mapProductToVariables(product)
    const rendered = renderTemplate(template.content, variables)

    console.log(chalk.white.bgGray(' Mensagem com Link de Afiliado: '))
    console.log()
    console.log(rendered)
    console.log()

    // Show the actual affiliate URL
    console.log(chalk.cyan('🔗 Link completo de afiliado:'))
    console.log(variables.affiliate_url)
    console.log()

    // Check if the link contains the affiliate ID
    if (variables.affiliate_url.includes('ML-TEST-AFFILIATE-123')) {
      console.log(chalk.green('✅ ID de afiliado está presente no link!'))
    } else {
      console.log(chalk.red('❌ ID de afiliado não encontrado no link'))
    }

    // Test with image
    console.log()
    console.log(chalk.gray('─'.repeat(60)))
    console.log(chalk.bold.cyan('🖼️ Teste de Imagem do Produto:'))
    console.log()
    
    if (product.imageUrl) {
      console.log(chalk.green(`✅ Produto tem imagem: ${product.imageUrl}`))
      console.log(`   Variável product_image: "${variables.product_image}"`)
      console.log(`   Variável has_image: "${variables.has_image}"`)
    } else {
      console.log(chalk.yellow('⚠️ Produto sem imagem'))
    }

  } catch (error) {
    console.error(chalk.red('❌ Erro no teste:'), error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run test
testAffiliateLinks()
  .then(() => {
    console.log()
    console.log(chalk.gray('═'.repeat(60)))
    console.log(chalk.dim('Teste concluído'))
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })