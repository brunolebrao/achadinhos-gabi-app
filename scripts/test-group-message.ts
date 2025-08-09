#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import chalk from 'chalk'

const prisma = new PrismaClient()

async function testGroupMessage() {
  console.log(chalk.bold.cyan('🧪 Teste de Envio para Grupos WhatsApp'))
  console.log(chalk.gray('═'.repeat(60)))
  console.log()

  try {
    // Get a group
    const group = await prisma.group.findFirst({
      where: {
        name: 'Achadinhos da Gabi'
      }
    })

    if (!group) {
      console.log(chalk.red('❌ Grupo "Achadinhos da Gabi" não encontrado'))
      return
    }

    console.log(chalk.green('✅ Grupo encontrado:'))
    console.log(`   ID: ${group.id}`)
    console.log(`   Nome: ${group.name}`)
    console.log(`   GroupId: ${group.groupId}`)
    console.log()

    // Check format
    if (group.groupId.includes('@g.us')) {
      console.log(chalk.green('✅ GroupId já está no formato correto (@g.us)'))
    } else if (group.groupId.includes('@c.us')) {
      console.log(chalk.red('❌ GroupId está incorreto (@c.us) - deveria ser @g.us'))
    } else {
      console.log(chalk.yellow('⚠️ GroupId sem formato: ' + group.groupId))
    }
    console.log()

    // Create a test message
    console.log(chalk.cyan('📝 Criando mensagem de teste...'))
    
    const message = await prisma.scheduledMessage.create({
      data: {
        content: '🧪 Teste de envio para grupo - ' + new Date().toLocaleTimeString(),
        recipients: [group.groupId],
        recipientType: 'GROUP',
        scheduledAt: new Date(),
        status: 'PENDING'
      }
    })

    console.log(chalk.green('✅ Mensagem criada:'))
    console.log(`   ID: ${message.id}`)
    console.log(`   Recipients: ${message.recipients}`)
    console.log(`   Type: ${message.recipientType}`)
    console.log(`   Status: ${message.status}`)
    console.log()

    console.log(chalk.yellow('📤 Para processar a mensagem:'))
    console.log('   1. Certifique-se que o WhatsApp está conectado')
    console.log('   2. A mensagem será processada pelo message-queue')
    console.log('   3. Verifique os logs da API para ver o debug')
    console.log()
    console.log(chalk.dim('Logs esperados:'))
    console.log(chalk.dim('   [MessageQueue] Recipient already formatted: 120363402670473675@g.us'))
    console.log(chalk.dim('   [WhatsApp] Sending to group: 120363402670473675@g.us'))

  } catch (error) {
    console.error(chalk.red('❌ Erro no teste:'), error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run test
testGroupMessage()
  .then(() => {
    console.log()
    console.log(chalk.gray('═'.repeat(60)))
    console.log(chalk.dim('Teste concluído'))
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })