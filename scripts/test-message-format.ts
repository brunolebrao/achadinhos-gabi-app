#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import chalk from 'chalk'
import { mapProductToVariables, renderTemplate, type ProductForTemplate } from '../apps/api/src/utils/template-utils'

const prisma = new PrismaClient()

async function testMessageFormat() {
  console.log(chalk.bold.cyan('🧪 Teste de Formatação de Mensagens'))
  console.log(chalk.gray('═'.repeat(60)))
  console.log()

  try {
    // Create a test product
    const testProduct: ProductForTemplate = {
      id: 'test-123',
      title: 'Smartphone Samsung Galaxy S23 Ultra 256GB 5G Câmera Tripla + Selfie 12MP - Preto',
      price: 3999.90,
      originalPrice: 5999.90,
      discount: '33%',
      productUrl: 'https://www.mercadolivre.com.br/samsung-galaxy-s23-ultra-256gb-preto/p/MLB12345678',
      platform: 'MERCADO_LIVRE',
      category: 'Eletrônicos',
      isNew: false
    }

    console.log(chalk.green('📱 Produto de Teste:'))
    console.log(`   Título: ${testProduct.title}`)
    console.log(`   Preço: R$ ${testProduct.price}`)
    console.log(`   Desconto: ${testProduct.discount}`)
    console.log()

    // Get variables
    const variables = mapProductToVariables(testProduct)
    
    console.log(chalk.cyan('📝 Variáveis Geradas:'))
    console.log(`   product_name_short: "${variables.product_name_short}"`)
    console.log(`   price: "${variables.price}"`)
    console.log(`   short_link: "${variables.short_link}"`)
    console.log(`   discount_emoji: "${variables.discount_emoji}"`)
    console.log()

    // Get all templates
    const templates = await prisma.template.findMany({
      where: { isActive: true }
    })

    if (templates.length === 0) {
      console.log(chalk.red('❌ Nenhum template ativo encontrado'))
      console.log(chalk.yellow('💡 Execute: pnpm tsx scripts/update-templates.ts'))
      return
    }

    console.log(chalk.bold.magenta(`📨 Testando ${templates.length} templates:`))
    console.log()

    for (const template of templates) {
      console.log(chalk.gray('─'.repeat(60)))
      console.log(chalk.bold.yellow(`Template: ${template.name}`))
      console.log(chalk.dim(`Categoria: ${template.category || 'N/A'}`))
      console.log()
      
      // Render the template
      const rendered = renderTemplate(template.content, variables)
      
      // Show the rendered message
      console.log(chalk.white.bgGray(' Mensagem Renderizada: '))
      console.log()
      
      // Display each line with proper formatting
      const lines = rendered.split('\n')
      lines.forEach(line => {
        // Highlight special formatting
        if (line.includes('*')) {
          console.log(chalk.bold(line))
        } else if (line.includes('_')) {
          console.log(chalk.italic.dim(line))
        } else if (line.includes('━') || line.includes('•')) {
          console.log(chalk.gray(line))
        } else {
          console.log(line)
        }
      })
      console.log()

      // Show character count
      const charCount = rendered.length
      const lineCount = lines.length
      console.log(chalk.dim(`📊 Estatísticas: ${charCount} caracteres, ${lineCount} linhas`))
      
      if (charCount > 1000) {
        console.log(chalk.yellow('⚠️ Mensagem muito longa (>1000 caracteres)'))
      } else if (charCount < 100) {
        console.log(chalk.yellow('⚠️ Mensagem muito curta (<100 caracteres)'))
      } else {
        console.log(chalk.green('✅ Tamanho ideal'))
      }
      console.log()
    }

    // Test with a product with very long title
    console.log(chalk.gray('═'.repeat(60)))
    console.log(chalk.bold.cyan('🧪 Teste com Título Muito Longo:'))
    console.log()

    const longTitleProduct: ProductForTemplate = {
      ...testProduct,
      title: 'Kit Completo Gamer RGB Pro Max Ultra Deluxe com Teclado Mecânico Switch Blue, Mouse 16000 DPI, Headset 7.1 Surround, Mousepad XXL, Suporte para Headset, Hub USB 3.0 e Iluminação LED RGB Personalizável'
    }

    const longVariables = mapProductToVariables(longTitleProduct)
    console.log(`   Título original (${longTitleProduct.title.length} chars)`)
    console.log(`   Título truncado: "${longVariables.product_name_short}"`)
    console.log()

    // Test super discount
    console.log(chalk.bold.cyan('🧪 Teste com Super Desconto:'))
    const superDiscountProduct: ProductForTemplate = {
      ...testProduct,
      discount: '70%'
    }
    
    const superVariables = mapProductToVariables(superDiscountProduct)
    console.log(`   Desconto: ${superVariables.discount}`)
    console.log(`   Emoji: ${superVariables.discount_emoji}`)
    console.log(`   Urgência: ${superVariables.urgency_text}`)
    console.log()

  } catch (error) {
    console.error(chalk.red('❌ Erro no teste:'), error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run test
testMessageFormat()
  .then(() => {
    console.log(chalk.gray('═'.repeat(60)))
    console.log(chalk.dim('Teste concluído'))
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })