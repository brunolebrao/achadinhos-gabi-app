#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import chalk from 'chalk'
import { generateAffiliateUrl } from '../apps/api/src/services/affiliate-service'

const prisma = new PrismaClient()

async function testAffiliateFromDB() {
  console.log(chalk.bold.cyan('🧪 Teste de Links de Afiliado com Configuração do Banco'))
  console.log(chalk.gray('═'.repeat(60)))
  console.log()

  try {
    // 1. Criar/atualizar configuração de teste
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })

    if (!adminUser) {
      console.log(chalk.red('❌ Nenhum usuário admin encontrado'))
      console.log(chalk.yellow('💡 Crie um usuário admin primeiro'))
      return
    }

    console.log(chalk.green(`✅ Usuário admin: ${adminUser.name || adminUser.email}`))

    // Criar ou atualizar configuração
    const config = await prisma.affiliateConfig.upsert({
      where: { userId: adminUser.id },
      update: {
        mercadolivreId: 'c79d6fa8-1168-4f44-9ca3-383385ea2b61' // UUID real
      },
      create: {
        userId: adminUser.id,
        mercadolivreId: 'c79d6fa8-1168-4f44-9ca3-383385ea2b61',
        enableTracking: true
      }
    })

    console.log(chalk.green('✅ Configuração salva no banco:'))
    console.log(`   ML tracking_id: ${config.mercadolivreId}`)
    console.log()

    // 2. Testar geração de URL com tracking_id existente
    const urlComTracking = 'https://www.mercadolivre.com.br/produto?tracking_id=old-id-12345#polycard_client=search&other=params'
    
    console.log(chalk.yellow('📝 URL Original (com tracking_id antigo):'))
    console.log(chalk.dim(urlComTracking))
    console.log()

    const novaUrl = generateAffiliateUrl(urlComTracking, 'MERCADOLIVRE', config.mercadolivreId)
    
    console.log(chalk.green('✅ URL Modificada (com SEU tracking_id):'))
    console.log(chalk.blue(novaUrl))
    console.log()

    // Verificar parâmetros
    const [baseUrl, fragment] = novaUrl.split('#')
    const url = new URL(baseUrl)
    
    console.log(chalk.cyan('🔍 Análise da URL:'))
    console.log(`   tracking_id: ${url.searchParams.get('tracking_id')}`)
    console.log(`   source: ${url.searchParams.get('source')}`)
    console.log(`   Fragmento preservado: ${fragment ? '✅ Sim' : '❌ Não'}`)
    console.log()

    // 3. Testar com URL sem tracking_id
    const urlSemTracking = 'https://www.mercadolivre.com.br/produto-novo/p/MLB123456'
    
    console.log(chalk.yellow('📝 URL sem tracking_id:'))
    console.log(chalk.dim(urlSemTracking))
    
    const urlComAfiliado = generateAffiliateUrl(urlSemTracking, 'MERCADOLIVRE', config.mercadolivreId)
    
    console.log(chalk.green('✅ URL com afiliado adicionado:'))
    console.log(chalk.blue(urlComAfiliado))
    console.log()

    // 4. Verificar se está correto
    const urlFinal = new URL(urlComAfiliado)
    const trackingId = urlFinal.searchParams.get('tracking_id')
    const source = urlFinal.searchParams.get('source')

    if (trackingId === config.mercadolivreId && source === 'affiliate-profile') {
      console.log(chalk.green.bold('🎉 Sistema funcionando perfeitamente!'))
      console.log(chalk.green('✅ tracking_id correto'))
      console.log(chalk.green('✅ source=affiliate-profile presente'))
      console.log(chalk.green('✅ URLs prontas para gerar comissão!'))
    } else {
      console.log(chalk.red('❌ Algo deu errado na geração da URL'))
    }

  } catch (error) {
    console.error(chalk.red('❌ Erro no teste:'), error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar teste
testAffiliateFromDB()
  .then(() => {
    console.log()
    console.log(chalk.gray('═'.repeat(60)))
    console.log(chalk.dim('Teste concluído'))
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })