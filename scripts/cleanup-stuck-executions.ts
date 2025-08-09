#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import chalk from 'chalk'

const prisma = new PrismaClient()

async function cleanupStuckExecutions() {
  console.log(chalk.bold.cyan('🧹 Limpando execuções travadas'))
  console.log(chalk.gray('═'.repeat(60)))

  try {
    // Find stuck executions (RUNNING for more than 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
    
    const stuckExecutions = await prisma.scraperExecution.findMany({
      where: {
        status: 'RUNNING',
        startedAt: {
          lt: thirtyMinutesAgo
        }
      },
      include: {
        scraper: true
      }
    })

    if (stuckExecutions.length === 0) {
      console.log(chalk.green('✅ Nenhuma execução travada encontrada'))
      return
    }

    console.log(chalk.yellow(`⚠️ Encontradas ${stuckExecutions.length} execuções travadas:`))
    console.log()

    for (const exec of stuckExecutions) {
      const duration = Date.now() - new Date(exec.startedAt).getTime()
      const hours = Math.floor(duration / 3600000)
      const minutes = Math.floor((duration % 3600000) / 60000)
      
      console.log(chalk.red(`❌ ${exec.scraper.name}`))
      console.log(`   ID: ${exec.id}`)
      console.log(`   Plataforma: ${exec.scraper.platform}`)
      console.log(`   Iniciado: ${exec.startedAt.toLocaleString()}`)
      console.log(`   Travado há: ${hours}h ${minutes}m`)
      console.log()

      // Mark as failed
      await prisma.scraperExecution.update({
        where: { id: exec.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          error: `Execução expirou após ${hours}h ${minutes}m (timeout automático)`
        }
      })
    }

    console.log(chalk.green(`✅ ${stuckExecutions.length} execuções marcadas como FAILED`))

    // Also check for old PENDING executions (more than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    const oldPendingExecutions = await prisma.scraperExecution.findMany({
      where: {
        status: 'PENDING',
        startedAt: {
          lt: oneHourAgo
        }
      }
    })

    if (oldPendingExecutions.length > 0) {
      console.log()
      console.log(chalk.yellow(`⚠️ Encontradas ${oldPendingExecutions.length} execuções PENDING antigas`))
      
      // Mark old pending as failed
      await prisma.scraperExecution.updateMany({
        where: {
          status: 'PENDING',
          startedAt: {
            lt: oneHourAgo
          }
        },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          error: 'Execução nunca foi processada (timeout)'
        }
      })

      console.log(chalk.green(`✅ ${oldPendingExecutions.length} execuções PENDING marcadas como FAILED`))
    }

  } catch (error) {
    console.error(chalk.red('❌ Erro ao limpar execuções:'), error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run cleanup
cleanupStuckExecutions()
  .then(() => {
    console.log()
    console.log(chalk.gray('═'.repeat(60)))
    console.log(chalk.dim('Limpeza concluída'))
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })