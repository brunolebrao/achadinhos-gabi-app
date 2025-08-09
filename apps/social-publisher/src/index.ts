import 'dotenv/config'
import { SocialPublisherService } from './services/social-publisher-service'
import { QueueManager } from './queue/queue-manager'
import { Scheduler } from './services/scheduler'
import { logger } from './utils/logger'

async function main() {
  logger.info('🚀 Starting Social Publisher Service...')

  try {
    // Initialize queue manager
    const queueManager = new QueueManager()
    await queueManager.initialize()

    // Initialize social publisher service
    const publisherService = new SocialPublisherService(queueManager)
    await publisherService.initialize()

    // Initialize scheduler
    const scheduler = new Scheduler(publisherService)
    scheduler.start()

    logger.info('✅ Social Publisher Service is running')

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down gracefully...')
      scheduler.stop()
      await queueManager.close()
      process.exit(0)
    })

    process.on('SIGTERM', async () => {
      logger.info('Shutting down gracefully...')
      scheduler.stop()
      await queueManager.close()
      process.exit(0)
    })

  } catch (error) {
    logger.error('Failed to start Social Publisher Service:', error)
    process.exit(1)
  }
}

main().catch(error => {
  logger.error('Unhandled error:', error)
  process.exit(1)
})