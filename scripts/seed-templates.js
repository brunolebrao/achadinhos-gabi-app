const { PrismaClient } = require('../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client')

const prisma = new PrismaClient()

const defaultTemplates = [
  {
    name: 'Template Padrão',
    content: `🛍️ {{platform_emoji}} **OFERTA IMPERDÍVEL!**

{{product_name_short}}

💰 **{{price}}**
{{urgency_text}}

{{short_link}}

#Promoção #{{platform}} #AchadinhosDaGabi`,
    category: 'geral',
    isDefault: true,
    isActive: true
  },
  
  {
    name: 'Super Oferta',
    content: `🔥🔥🔥 **SUPER OFERTA - CORRE QUE ACABA!**

{{product_name_short}}

💸 De ~~{{original_price}}~~ por **{{price}}**
🔥 **{{discount}}** de desconto!

{{urgency_text}}
⏰ Por tempo LIMITADO!

{{separator}}
{{short_link}}
{{separator}}

#SuperOferta #{{platform}} #Desconto #AchadinhosDaGabi`,
    category: 'super-oferta',
    isDefault: false,
    isActive: true
  },
  
  {
    name: 'Promoção Flash',
    content: `⚡⚡ **PROMOÇÃO FLASH** ⚡⚡

{{category_emoji}} {{product_name_short}}

💰 **APENAS {{price}}**
{{discount_emoji}} {{discount}} OFF!

{{urgency_text}}

🛒 {{short_link}}

{{dots}} Aproveite antes que acabe! {{dots}}

#PromoçãoFlash #{{platform}} #AchadinhosDaGabi`,
    category: 'promocao',
    isDefault: false,
    isActive: true
  },
  
  {
    name: 'Produto Novo',
    content: `✨ **PRODUTO NOVO** ✨

{{category_emoji}} {{product_name_short}}

💰 Por apenas **{{price}}**

🛒 {{short_link}}

{{line_break}}Chegou novidade! Confira já! 👆

#NovosProdutos #{{platform}} #{{category}} #AchadinhosDaGabi`,
    category: 'produto',
    isDefault: false,
    isActive: true
  },
  
  {
    name: 'Eletrônicos',
    content: `📱💻 **ELETRÔNICOS COM DESCONTO!**

{{product_name_short}}

💰 **{{price}}**

{{urgency_text}}

🔗 {{short_link}}

{{separator}}
📱 Tecnologia em suas mãos!
{{separator}}

#Eletrônicos #Tecnologia #{{platform}} #AchadinhosDaGabi`,
    category: 'eletronicos',
    isDefault: false,
    isActive: true
  }
]

async function seedTemplates() {
  try {
    console.log('🌱 Iniciando seed de templates...')

    // Verifica se já existem templates
    const existingTemplates = await prisma.template.findMany()
    console.log(`📊 Encontrados ${existingTemplates.length} templates existentes`)

    if (existingTemplates.length > 0) {
      console.log('📝 Templates existentes:')
      existingTemplates.forEach(template => {
        console.log(`  - ${template.name} (${template.category}) - Ativo: ${template.isActive} - Padrão: ${template.isDefault}`)
      })
      
      const confirmOverwrite = process.argv.includes('--force')
      if (!confirmOverwrite) {
        console.log('⚠️  Templates já existem. Use --force para sobrescrever.')
        return
      } else {
        console.log('🗑️  Removendo templates existentes...')
        await prisma.template.deleteMany({})
      }
    }

    // Criar novos templates
    console.log('🏗️  Criando templates padrão...')
    
    for (const templateData of defaultTemplates) {
      const template = await prisma.template.create({
        data: templateData
      })
      console.log(`✅ Template criado: ${template.name} (${template.category})`)
    }

    // Estatísticas finais
    const finalCount = await prisma.template.count()
    const defaultTemplate = await prisma.template.findFirst({ where: { isDefault: true } })
    
    console.log(``)
    console.log(`🎉 Seed concluído com sucesso!`)
    console.log(`📊 Total de templates: ${finalCount}`)
    console.log(`🏆 Template padrão: ${defaultTemplate?.name}`)
    
    // Verificar sistema de sugestão
    console.log(``)
    console.log(`🔍 Testando sistema de sugestão de templates...`)
    
    const testProducts = [
      { discount: '55%', isNew: false },
      { discount: '35%', isNew: false },
      { discount: '10%', isNew: true },
      { discount: '0%', isNew: false }
    ]
    
    // Simular lógica de sugestão (baseado no template-utils.ts)
    for (const product of testProducts) {
      const discount = parseInt(product.discount.replace('%', ''))
      let suggestedCategory = 'geral'
      
      if (discount >= 50) {
        suggestedCategory = 'super-oferta'
      } else if (discount >= 30) {
        suggestedCategory = 'promocao'
      } else if (product.isNew) {
        suggestedCategory = 'produto'
      }
      
      const template = await prisma.template.findFirst({
        where: suggestedCategory === 'geral' 
          ? { isDefault: true, isActive: true }
          : { category: suggestedCategory, isActive: true }
      })
      
      console.log(`  📦 ${product.discount} desconto (${product.isNew ? 'novo' : 'existente'}): ${template ? template.name : 'Nenhum template encontrado'}`)
    }

  } catch (error) {
    console.error('❌ Erro ao fazer seed dos templates:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  seedTemplates()
}

module.exports = { seedTemplates, defaultTemplates }