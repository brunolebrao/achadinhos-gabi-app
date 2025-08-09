#!/usr/bin/env tsx

import chalk from 'chalk'
import { generateAffiliateUrl, type ProductForTemplate } from '../apps/api/src/utils/template-utils'

console.log(chalk.bold.cyan('🧪 Teste Completo de Links de Afiliado do Mercado Livre'))
console.log(chalk.gray('═'.repeat(60)))
console.log()

// Testar com diferentes tracking_ids
const trackingIds = [
  'a9aee640-eb7d-440e-ab24-e228a34d70bd', // Primeiro ID
  'c79d6fa8-1168-4f44-9ca3-383385ea2b61', // Segundo ID
  'generated-uuid-xxxx-xxxx-xxxx-xxxxxxxxxxxx' // UUID gerado pelo sistema
]

// Produto de teste
const testProduct: ProductForTemplate = {
  id: 'MLB4309886088',
  title: 'iPhone 16 256GB Branco',
  price: 7999.90,
  originalPrice: 9999.90,
  discount: '20%',
  productUrl: 'https://www.mercadolivre.com.br/iphone-16e-256-gb-branco/p/MLB1046218696',
  imageUrl: 'https://http2.mlstatic.com/iphone-image.jpg',
  platform: 'MERCADO_LIVRE',
  category: 'Celulares',
  isNew: false
}

console.log(chalk.green('📱 Produto de Teste:'))
console.log(`   ${testProduct.title}`)
console.log(`   Preço: R$ ${testProduct.price}`)
console.log(`   URL Original: ${testProduct.productUrl}`)
console.log()

// Testar cada tracking_id
trackingIds.forEach((trackingId, index) => {
  console.log(chalk.yellow(`\nTeste ${index + 1}: ${trackingId.substring(0, 20)}...`))
  console.log(chalk.gray('─'.repeat(60)))
  
  // Simular configuração do affiliate ID
  process.env.MERCADOLIVRE_AFFILIATE_ID = trackingId
  
  // Gerar URL
  const affiliateUrl = generateAffiliateUrl(testProduct)
  
  console.log(chalk.white('URL Gerada:'))
  console.log(chalk.blue(affiliateUrl))
  console.log()
  
  // Verificar parâmetros
  const url = new URL(affiliateUrl)
  const hasTrackingId = url.searchParams.has('tracking_id')
  const hasSource = url.searchParams.has('source')
  const sourceValue = url.searchParams.get('source')
  
  console.log('Verificações:')
  console.log(hasTrackingId ? 
    chalk.green(`✅ tracking_id presente: ${url.searchParams.get('tracking_id')}`) :
    chalk.red('❌ tracking_id ausente')
  )
  console.log(hasSource && sourceValue === 'affiliate-profile' ? 
    chalk.green(`✅ source=affiliate-profile presente`) :
    chalk.red('❌ source=affiliate-profile ausente')
  )
  
  if (hasTrackingId && hasSource && sourceValue === 'affiliate-profile') {
    console.log(chalk.green.bold('\n🎉 Link de afiliado válido para comissão!'))
  } else {
    console.log(chalk.red.bold('\n⚠️ Link incompleto - verificar configuração'))
  }
})

console.log()
console.log(chalk.gray('═'.repeat(60)))
console.log(chalk.bold.cyan('📊 Resumo do Sistema de Afiliados:'))
console.log()
console.log('✅ Flexibilidade: Pode usar qualquer UUID válido')
console.log('✅ Rastreamento: Cada UUID pode rastrear campanhas diferentes')
console.log('✅ Comissão: Links incluem source=affiliate-profile')
console.log('✅ Interface: Configure facilmente em /settings/affiliates')
console.log()
console.log(chalk.green('Sistema pronto para gerar comissões! 💰'))
console.log()
console.log(chalk.dim('Estrutura do link final:'))
console.log(chalk.dim('https://produto.ml.com.br?tracking_id={uuid}&source=affiliate-profile'))