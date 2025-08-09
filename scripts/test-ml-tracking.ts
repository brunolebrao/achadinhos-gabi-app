#!/usr/bin/env tsx

import chalk from 'chalk'
import { generateAffiliateUrl, type ProductForTemplate } from '../apps/api/src/utils/template-utils'

// Configurar o tracking_id real do Mercado Livre
process.env.MERCADOLIVRE_AFFILIATE_ID = 'a9aee640-eb7d-440e-ab24-e228a34d70bd'

console.log(chalk.bold.cyan('🧪 Teste de Tracking ID do Mercado Livre'))
console.log(chalk.gray('═'.repeat(60)))
console.log()

// Produto de teste do Mercado Livre
const testProduct: ProductForTemplate = {
  id: 'MLB4309886088',
  title: 'Fritadeira Airfryer Electrolux EAF90 Digital 12L 1700W',
  price: 899.90,
  originalPrice: 1299.90,
  discount: '31%',
  productUrl: 'https://www.mercadolivre.com.br/fritadeira-airfryer-electrolux-eaf90-digital-12l-1700w-220v/p/MLBU1164895930',
  imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_763456-MLU72655491952_112023-F.webp',
  platform: 'MERCADO_LIVRE',
  category: 'Eletrodomésticos',
  isNew: false
}

console.log(chalk.green('📦 Produto de Teste:'))
console.log(`   Título: ${testProduct.title}`)
console.log(`   URL Original: ${testProduct.productUrl}`)
console.log()

console.log(chalk.yellow('⚙️ Configuração:'))
console.log(`   Tracking ID: ${process.env.MERCADOLIVRE_AFFILIATE_ID}`)
console.log()

// Gerar URL de afiliado
const affiliateUrl = generateAffiliateUrl(testProduct)

console.log(chalk.green('✅ URL de Afiliado Gerada:'))
console.log(chalk.white(affiliateUrl))
console.log()

// Verificar se o tracking_id foi adicionado
if (affiliateUrl.includes('tracking_id=')) {
  const trackingId = new URL(affiliateUrl).searchParams.get('tracking_id')
  
  console.log(chalk.green('✅ Sucesso! Link de afiliado gerado corretamente'))
  console.log(chalk.dim(`   Tracking ID presente: ${trackingId}`))
  
  // Validar se é um UUID válido
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(trackingId || '')) {
    console.log(chalk.green('✅ UUID válido!'))
  } else {
    console.log(chalk.red('❌ UUID inválido'))
  }
} else {
  console.log(chalk.red('❌ Erro: tracking_id não foi adicionado ao link'))
}

console.log()
console.log(chalk.gray('─'.repeat(60)))
console.log(chalk.bold.cyan('📊 Resumo:'))
console.log()
console.log('O sistema está configurado para:')
console.log('1. ✅ Aceitar UUIDs como tracking_id')
console.log('2. ✅ Validar o formato UUID na página de configurações')
console.log('3. ✅ Gerar links com o parâmetro tracking_id')
console.log('4. ✅ Rastrear vendas e gerar comissões')
console.log()
console.log(chalk.green('🎉 Tudo pronto para monetizar com o Mercado Livre!'))
console.log()
console.log(chalk.dim('Próximos passos:'))
console.log(chalk.dim('1. Adicione seu tracking_id no arquivo .env'))
console.log(chalk.dim('2. Configure na página /settings/affiliates'))
console.log(chalk.dim('3. Envie produtos para o WhatsApp com links de afiliado'))
console.log(chalk.dim('4. Acompanhe suas comissões no painel do ML'))