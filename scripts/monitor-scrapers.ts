#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import chalk from 'chalk'

const prisma = new PrismaClient()

async function monitorScrapers() {
  console.clear()
  console.log(chalk.bold.cyan('📊 Monitor de Scrapers - Achadinhos da Gabi'))
  console.log(chalk.gray('═'.repeat(60)))
  console.log()

  try {
    // Buscar execuções recentes
    const recentExecutions = await prisma.scraperExecution.findMany({
      take: 10,
      orderBy: { startedAt: 'desc' },
      include: {
        scraper: true
      }
    })

    // Contar produtos
    const totalProducts = await prisma.product.count()
    const todayProducts = await prisma.product.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    })

    // Scrapers ativos
    const activeScrapers = await prisma.scraperConfig.count({
      where: { isActive: true }
    })

    // Próximas execuções
    const nextRuns = await prisma.scraperConfig.findMany({
      where: {
        isActive: true,
        nextRun: { not: null }
      },
      orderBy: { nextRun: 'asc' },
      take: 5
    })

    // Estatísticas gerais
    console.log(chalk.bold('📈 Estatísticas Gerais:'))
    console.log(`   • Total de produtos: ${chalk.green(totalProducts)}`)
    console.log(`   • Produtos hoje: ${chalk.yellow(todayProducts)}`)
    console.log(`   • Scrapers ativos: ${chalk.cyan(activeScrapers)}`)
    console.log()

    // Próximas execuções
    if (nextRuns.length > 0) {
      console.log(chalk.bold('⏰ Próximas Execuções:'))
      for (const scraper of nextRuns) {
        const nextRunTime = scraper.nextRun ? new Date(scraper.nextRun).toLocaleTimeString() : 'Não agendado'
        console.log(`   • ${scraper.name}: ${chalk.cyan(nextRunTime)}`)
      }
      console.log()
    }

    // Execuções recentes
    if (recentExecutions.length > 0) {
      console.log(chalk.bold('📜 Execuções Recentes:'))
      for (const exec of recentExecutions) {
        const time = new Date(exec.startedAt).toLocaleTimeString()
        const duration = exec.finishedAt 
          ? Math.round((exec.finishedAt.getTime() - exec.startedAt.getTime()) / 1000) 
          : null
        
        let statusIcon = '⏳'
        let statusColor = chalk.yellow
        
        if (exec.status === 'SUCCESS') {
          statusIcon = '✅'
          statusColor = chalk.green
        } else if (exec.status === 'FAILED') {
          statusIcon = '❌'
          statusColor = chalk.red
        }
        
        console.log(`   ${statusIcon} ${exec.scraper.name}`)
        console.log(`      Hora: ${time}`)
        if (exec.productsFound !== null) {
          console.log(`      Produtos: ${chalk.cyan(exec.productsFound)} encontrados, ${chalk.green(exec.productsAdded || 0)} novos`)
        }
        if (duration) {
          console.log(`      Duração: ${duration}s`)
        }
        if (exec.error) {
          console.log(`      ${chalk.red('Erro:')} ${exec.error}`)
        }
        console.log()
      }
    } else {
      console.log(chalk.yellow('   Nenhuma execução recente'))
    }

    // Verificar se há scrapers rodando agora
    const runningExecutions = await prisma.scraperExecution.count({
      where: { status: 'RUNNING' }
    })

    if (runningExecutions > 0) {
      console.log(chalk.bold.green(`\n🔄 ${runningExecutions} scraper(s) em execução agora!`))
    }

  } catch (error) {
    console.error(chalk.red('❌ Erro ao monitorar scrapers:'), error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar o monitor
monitorScrapers()
  .then(() => {
    console.log(chalk.gray('\n═'.repeat(60)))
    console.log(chalk.dim('Atualizado em: ' + new Date().toLocaleString()))
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })