#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import chalk from 'chalk'

const prisma = new PrismaClient()

const templates = [
  {
    name: 'Super Oferta com Link',
    category: 'super-oferta',
    content: `🔥 *SUPER OFERTA IMPERDÍVEL!* 🔥
{{separator}}

{{discount_emoji}} *{{discount}} DE DESCONTO*

📦 *{{product_name_short}}*

💰 De: ~{{original_price}}~
✨ Por: *{{price}}*

{{urgency_text}}

🛒 *Comprar agora:*
{{affiliate_url}}

{{dots}}
_Oferta por tempo limitado_
_Enviado via Achadinhos da Gabi_`,
    variables: ['product_name_short', 'price', 'original_price', 'discount', 'affiliate_url', 'discount_emoji', 'urgency_text', 'separator', 'dots'],
    isActive: true,
    isDefault: false
  },
  {
    name: 'Promoção Flash com Link',
    category: 'promocao',
    content: `⚡ *PROMOÇÃO RELÂMPAGO* ⚡

{{category_emoji}} {{product_name_short}}

💵 Apenas *{{price}}*
📉 Economia de {{discount}}

{{platform_emoji}} Disponível agora!

👉 *Clique para comprar:*
{{affiliate_url}}

{{separator}}
_Corre que acaba!_`,
    variables: ['product_name_short', 'price', 'discount', 'affiliate_url', 'platform_emoji', 'category_emoji', 'separator'],
    isActive: true,
    isDefault: false
  },
  {
    name: 'Produto Novo com Link',
    category: 'produto',
    content: `🆕 *NOVIDADE CHEGOU!*

{{category_emoji}} *{{product_name_short}}*

💎 Por apenas: *{{price}}*

✅ Produto original
✅ Entrega rápida
✅ Garantia inclusa

🛒 *Compre agora:*
{{affiliate_url}}

{{dots}}
_Achadinhos da Gabi_`,
    variables: ['product_name_short', 'price', 'affiliate_url', 'category_emoji', 'dots'],
    isActive: true,
    isDefault: false
  },
  {
    name: 'Template Padrão com Link',
    category: 'geral',
    content: `🛍️ *OFERTA ESPECIAL*

*{{product_name_short}}*

💰 *{{price}}*
{{discount_emoji}} {{discount}} OFF

📱 Veja mais detalhes:
{{affiliate_url}}

{{separator}}
_Compartilhe com amigos!_`,
    variables: ['product_name_short', 'price', 'discount', 'affiliate_url', 'discount_emoji', 'separator'],
    isActive: true,
    isDefault: true
  },
  {
    name: 'Cupom Especial com Link',
    category: 'cupom',
    content: `🎟️ *CUPOM DE DESCONTO*
{{separator}}

{{discount_emoji}} *{{discount}} OFF*

Em: {{product_name_short}}

💳 Preço final: *{{price}}*

{{urgency_text}}

🎯 *Pegue seu cupom:*
{{affiliate_url}}

{{dots}}
_Válido por tempo limitado_`,
    variables: ['product_name_short', 'price', 'discount', 'affiliate_url', 'discount_emoji', 'urgency_text', 'separator', 'dots'],
    isActive: true,
    isDefault: false
  }
]

async function updateTemplates() {
  console.log(chalk.bold.cyan('🔄 Atualizando Templates com Melhor Formatação'))
  console.log(chalk.gray('═'.repeat(60)))
  console.log()

  try {
    // Templates don't have userId in this schema
    console.log(chalk.cyan('📝 Criando/atualizando templates...'))

    // First, deactivate all existing templates
    await prisma.template.updateMany({
      data: { isActive: false }
    })
    console.log(chalk.yellow('⚠️ Templates existentes desativados'))
    console.log()

    // Create or update templates
    for (const templateData of templates) {
      try {
        const existing = await prisma.template.findFirst({
          where: {
            name: templateData.name
          }
        })

        if (existing) {
          // Update existing template
          const updated = await prisma.template.update({
            where: { id: existing.id },
            data: {
              content: templateData.content,
              variables: templateData.variables,
              isActive: templateData.isActive,
              isDefault: templateData.isDefault,
              category: templateData.category
            }
          })
          console.log(chalk.blue(`📝 Atualizado: ${templateData.name}`))
        } else {
          // Create new template
          const created = await prisma.template.create({
            data: templateData
          })
          console.log(chalk.green(`✅ Criado: ${templateData.name}`))
        }

        // Show preview
        console.log(chalk.dim('   Preview:'))
        const lines = templateData.content.split('\n').slice(0, 3)
        lines.forEach(line => {
          console.log(chalk.dim(`   ${line}`))
        })
        console.log(chalk.dim('   ...'))
        console.log()

      } catch (error) {
        console.error(chalk.red(`❌ Erro ao processar template ${templateData.name}:`), error)
      }
    }

    // Verify templates
    const activeTemplates = await prisma.template.count({
      where: { isActive: true }
    })

    console.log(chalk.gray('═'.repeat(60)))
    console.log(chalk.bold.green(`✅ ${activeTemplates} templates ativos`))
    console.log()

    // Show tips
    console.log(chalk.cyan('💡 Dicas de uso:'))
    console.log('   • Os templates usam variáveis como {{product_name_short}}')
    console.log('   • Títulos são truncados para 60 caracteres')
    console.log('   • Links são formatados como "🛒 Ver no Mercado Livre"')
    console.log('   • Preços são formatados como "R$ 99,90"')
    console.log('   • Use {{separator}} para linhas divisórias')
    console.log('   • Use {{double_line_break}} para espaçamento')
    console.log()

  } catch (error) {
    console.error(chalk.red('❌ Erro ao atualizar templates:'), error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run update
updateTemplates()
  .then(() => {
    console.log(chalk.gray('═'.repeat(60)))
    console.log(chalk.dim('Templates atualizados com sucesso!'))
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })