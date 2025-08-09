import dotenv from 'dotenv'
import cron from 'node-cron'
import { prisma } from '@repo/database'
import { ScraperManager } from './lib/scraper-manager'
import { MercadoLivreScraper } from './scrapers/mercadolivre'
import { ShopeeScraper } from './scrapers/shopee'
import { AmazonScraper } from './scrapers/amazon'
import { AliExpressScraper } from './scrapers/aliexpress'
import { logger } from './lib/logger'
import { progress } from './lib/progress'
import chalk from 'chalk'

dotenv.config()

async function bootstrap() {
  // Welcome message
  console.log(chalk.bold.cyan('\n🚀 Achadinhos da Gabi - Scraper Service'))
  console.log(chalk.gray('═'.repeat(60)))
  logger.info('Starting scraper service...')

  const scraperManager = new ScraperManager()

  scraperManager.registerScraper('MERCADOLIVRE', new MercadoLivreScraper())
  scraperManager.registerScraper('SHOPEE', new ShopeeScraper())
  scraperManager.registerScraper('AMAZON', new AmazonScraper())
  scraperManager.registerScraper('ALIEXPRESS', new AliExpressScraper())

  // Check for pending executions every minute
  cron.schedule('* * * * *', async () => {
    logger.info('Checking for pending executions...')
    
    // First, check for PENDING executions (manual runs)
    const pendingExecutions = await prisma.scraperExecution.findMany({
      where: {
        status: 'PENDING'
      },
      include: {
        scraper: true
      },
      orderBy: {
        startedAt: 'asc' // Process oldest first
      },
      take: 3 // Process up to 3 at a time
    })

    if (pendingExecutions.length > 0) {
      logger.info(`Found ${pendingExecutions.length} pending executions`)
      progress.showSection('Processando Execuções Pendentes', '⚡')
      
      for (const execution of pendingExecutions) {
        try {
          // Mark as RUNNING immediately
          await prisma.scraperExecution.update({
            where: { id: execution.id },
            data: {
              status: 'RUNNING',
              startedAt: new Date()
            }
          })
          
          logger.info(`Running pending scraper: ${execution.scraper.name}`)
          await scraperManager.runScraper(execution.scraper, execution.id)
          
        } catch (error) {
          logger.error(`Failed to run pending scraper ${execution.scraper.name}`, { error })
          
          // Mark as failed
          await prisma.scraperExecution.update({
            where: { id: execution.id },
            data: {
              status: 'FAILED',
              finishedAt: new Date(),
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          })
        }
      }
    }
  })

  // Check for scheduled scrapers every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    logger.info('Checking for scheduled scraper runs...')
    progress.showSection('Verificação de Scrapers Agendados', '🔍')
    
    const now = new Date()
    const scrapers = await prisma.scraperConfig.findMany({
      where: {
        isActive: true,
        OR: [
          { nextRun: null },
          { nextRun: { lte: now } }
        ]
      }
    })

    if (scrapers.length === 0) {
      progress.showInfo('Nenhum scraper agendado para execução')
    } else {
      progress.showSuccess(`${scrapers.length} scraper(s) encontrado(s) para execução`)
      
      // Run scrapers in parallel with a limit of 3 concurrent
      const MAX_CONCURRENT_SCRAPERS = 3
      const results = []
      
      for (let i = 0; i < scrapers.length; i += MAX_CONCURRENT_SCRAPERS) {
        const batch = scrapers.slice(i, i + MAX_CONCURRENT_SCRAPERS)
        const startTime = Date.now()
        
        logger.info(`Running batch of ${batch.length} scrapers in parallel`, {
          batch: batch.map(s => ({ name: s.name, platform: s.platform }))
        })
        
        // Run batch in parallel
        const batchResults = await Promise.allSettled(
          batch.map(async (scraper) => {
            logger.info(`Starting scraper: ${scraper.name}`, { 
              platform: scraper.platform,
              keywords: scraper.keywords.length,
              categories: scraper.categories.length
            })
            
            try {
              await scraperManager.runScraper(scraper)
              return { name: scraper.name, status: 'success' }
            } catch (error) {
              logger.error(`Scraper ${scraper.name} failed`, { error })
              return { name: scraper.name, status: 'failed', error }
            }
          })
        )
        
        const duration = Date.now() - startTime
        const succeeded = batchResults.filter(r => r.status === 'fulfilled').length
        const failed = batchResults.filter(r => r.status === 'rejected').length
        
        logger.info(`Batch completed in ${duration}ms`, {
          succeeded,
          failed,
          duration
        })
        
        results.push(...batchResults)
      }
      
      // Log summary
      const totalSucceeded = results.filter(r => r.status === 'fulfilled').length
      const totalFailed = results.filter(r => r.status === 'rejected').length
      
      logger.info('All scrapers completed', {
        total: scrapers.length,
        succeeded: totalSucceeded,
        failed: totalFailed
      })
      
      if (totalSucceeded > 0) {
        progress.showSuccess(`✅ ${totalSucceeded} scraper(s) executado(s) com sucesso`)
      }
      if (totalFailed > 0) {
        progress.showWarning(`⚠️ ${totalFailed} scraper(s) falharam`)
      }
    }
  })

  // Cleanup stuck executions every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    logger.info('Checking for stuck executions...')
    
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
    
    const stuckExecutions = await prisma.scraperExecution.findMany({
      where: {
        status: 'RUNNING',
        startedAt: {
          lt: thirtyMinutesAgo
        }
      }
    })
    
    if (stuckExecutions.length > 0) {
      logger.warn(`Found ${stuckExecutions.length} stuck executions, marking as failed`)
      
      for (const execution of stuckExecutions) {
        const duration = Date.now() - new Date(execution.startedAt).getTime()
        const minutes = Math.floor(duration / 60000)
        
        await prisma.scraperExecution.update({
          where: { id: execution.id },
          data: {
            status: 'FAILED',
            finishedAt: new Date(),
            error: `Execution timeout after ${minutes} minutes`
          }
        })
      }
    }
  })

  cron.schedule('0 * * * *', async () => {
    logger.info('Resetting daily WhatsApp limits...')
    
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    await prisma.whatsAppAccount.updateMany({
      where: {
        lastResetAt: { lte: oneDayAgo }
      },
      data: {
        sentToday: 0,
        lastResetAt: new Date()
      }
    })
  })

  // Show service status
  console.log(chalk.green('\n✅ Serviço iniciado com sucesso!'))
  console.log(chalk.gray('═'.repeat(60)))
  
  progress.showDetails({
    'Execuções Pendentes': 'A cada minuto',
    'Scrapers Agendados': 'A cada 15 minutos', 
    'Limpeza de Travamentos': 'A cada 10 minutos',
    'Reset de Limites WhatsApp': 'A cada hora',
    'Scrapers Registrados': '4 (ML, Shopee, Amazon, AliExpress)',
    'Ambiente': process.env.NODE_ENV || 'development'
  })
  
  console.log(chalk.gray('\n═'.repeat(60)))
  console.log(chalk.dim('Logs salvos em: apps/scraper/logs/'))
  console.log(chalk.dim('Pressione Ctrl+C para parar o serviço\n'))
  
  logger.info('Scraper service is running!', {
    scraperCheck: 'every 15 minutes',
    whatsappReset: 'every hour'
  })

  process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n⏹️ Encerrando serviço...'))
    logger.info('Shutting down scraper service...')
    
    progress.showSpinner('Fechando conexões...')
    await prisma.$disconnect()
    progress.hideSpinner(true, 'Conexões fechadas')
    
    console.log(chalk.green('✅ Serviço encerrado com sucesso\n'))
    process.exit(0)
  })
}

bootstrap().catch(err => {
  console.error(chalk.red.bold('\n❌ Falha ao iniciar serviço de scraper'))
  logger.error('Failed to start scraper service:', err)
  console.error(err)
  process.exit(1)
})