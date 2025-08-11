const { PrismaClient } = require('../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client')

const prisma = new PrismaClient()

async function bulkApproveProducts() {
  try {
    console.log('🔍 Verificando produtos pendentes...')

    // Get current stats
    const stats = await prisma.product.groupBy({
      by: ['status'],
      _count: true
    })

    console.log('📊 Status atual dos produtos:')
    stats.forEach(stat => {
      console.log(`  - ${stat.status}: ${stat._count}`)
    })

    const pendingCount = stats.find(s => s.status === 'PENDING')?._count || 0
    
    if (pendingCount === 0) {
      console.log('✅ Não há produtos pendentes para aprovar')
      return
    }

    // Show samples before approving
    console.log('\n📦 Exemplos de produtos que serão aprovados:')
    const samples = await prisma.product.findMany({
      where: { status: 'PENDING' },
      take: 3,
      select: {
        id: true,
        title: true,
        price: true,
        platform: true,
        discount: true
      }
    })

    samples.forEach((product, index) => {
      const shortTitle = product.title.substring(0, 50) + (product.title.length > 50 ? '...' : '')
      const discount = product.discount ? ` (${product.discount})` : ''
      console.log(`  ${index + 1}. ${shortTitle} - R$ ${product.price}${discount} [${product.platform}]`)
    })

    // Ask for confirmation unless --force flag is provided
    const force = process.argv.includes('--force')
    if (!force) {
      console.log(`\n⚠️  Você vai aprovar ${pendingCount} produtos. Use --force para confirmar.`)
      return
    }

    console.log(`\n🚀 Aprovando ${pendingCount} produtos...`)
    
    // Approve all pending products
    const result = await prisma.product.updateMany({
      where: { status: 'PENDING' },
      data: { status: 'APPROVED' }
    })

    console.log(`✅ ${result.count} produtos aprovados com sucesso!`)

    // Show updated stats
    console.log('\n📊 Status atualizado dos produtos:')
    const newStats = await prisma.product.groupBy({
      by: ['status'],
      _count: true
    })

    newStats.forEach(stat => {
      console.log(`  - ${stat.status}: ${stat._count}`)
    })

    // Check if we can create campaigns now
    console.log('\n🎯 Verificando se campanhas podem ser criadas...')
    
    // Check templates
    const templateCount = await prisma.template.count({ where: { isActive: true } })
    console.log(`📝 Templates ativos: ${templateCount}`)
    
    // Check approved products
    const approvedCount = await prisma.product.count({ where: { status: 'APPROVED' } })
    console.log(`✅ Produtos aprovados: ${approvedCount}`)
    
    // Check groups
    const groupCount = await prisma.group.count({ where: { isActive: true } })
    console.log(`👥 Grupos WhatsApp ativos: ${groupCount}`)

    const canCreateCampaigns = templateCount > 0 && approvedCount > 0 && groupCount > 0
    
    if (canCreateCampaigns) {
      console.log('\n🎉 Sistema pronto para criar campanhas!')
      console.log('   ✅ Templates: OK')
      console.log('   ✅ Produtos aprovados: OK')
      console.log('   ✅ Grupos WhatsApp: OK')
    } else {
      console.log('\n⚠️  Sistema ainda não está pronto:')
      console.log(`   ${templateCount > 0 ? '✅' : '❌'} Templates: ${templateCount > 0 ? 'OK' : 'FALTANDO'}`)
      console.log(`   ${approvedCount > 0 ? '✅' : '❌'} Produtos aprovados: ${approvedCount > 0 ? 'OK' : 'FALTANDO'}`)
      console.log(`   ${groupCount > 0 ? '✅' : '❌'} Grupos WhatsApp: ${groupCount > 0 ? 'OK' : 'FALTANDO'}`)
    }

  } catch (error) {
    console.error('❌ Erro ao aprovar produtos:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Função para aprovar produtos específicos por IDs
async function approveSpecificProducts(productIds) {
  try {
    console.log(`🚀 Aprovando ${productIds.length} produtos específicos...`)
    
    const result = await prisma.product.updateMany({
      where: { 
        id: { in: productIds },
        status: 'PENDING'
      },
      data: { status: 'APPROVED' }
    })

    console.log(`✅ ${result.count} produtos aprovados com sucesso!`)
    return result.count

  } catch (error) {
    console.error('❌ Erro ao aprovar produtos específicos:', error)
    throw error
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  const specificIds = process.argv.slice(2).filter(arg => !arg.startsWith('--'))
  
  if (specificIds.length > 0 && specificIds[0] !== 'all') {
    // Approve specific products
    approveSpecificProducts(specificIds).then(() => process.exit(0))
  } else {
    // Approve all pending products
    bulkApproveProducts().then(() => process.exit(0))
  }
}

module.exports = { bulkApproveProducts, approveSpecificProducts }