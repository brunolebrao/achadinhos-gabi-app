import Bull, { Queue, Job } from 'bull'
import { logger } from '../utils/logger'

export interface PublishJob {
  productId?: string
  platforms: string[]
  content: any
  scheduledAt?: Date
  priority?: number
}

export class QueueManager {
  private queues: Map<string, Queue> = new Map()
  private redisConfig: any

  constructor() {
    this.redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    }
  }

  async initialize(): Promise<void> {
    // Create queues for each platform
    const platforms = ['instagram', 'tiktok', 'whatsapp', 'multi-platform']
    
    for (const platform of platforms) {
      const queue = new Bull(`social-${platform}`, {
        redis: this.redisConfig,
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        }
      })

      this.queues.set(platform, queue)
      logger.info(`Queue initialized: social-${platform}`)
    }
  }

  getQueue(platform: string): Queue | undefined {
    return this.queues.get(platform)
  }

  async addJob(platform: string, data: PublishJob): Promise<Job> {
    const queue = this.getQueue(platform)
    if (!queue) {
      throw new Error(`Queue not found for platform: ${platform}`)
    }

    const jobOptions: any = {
      priority: data.priority || 0
    }

    if (data.scheduledAt) {
      const delay = new Date(data.scheduledAt).getTime() - Date.now()
      if (delay > 0) {
        jobOptions.delay = delay
      }
    }

    const job = await queue.add(data, jobOptions)
    logger.info(`Job added to ${platform} queue:`, { jobId: job.id, data })
    
    return job
  }

  async addBulkJobs(platform: string, jobs: PublishJob[]): Promise<Job[]> {
    const queue = this.getQueue(platform)
    if (!queue) {
      throw new Error(`Queue not found for platform: ${platform}`)
    }

    const bulkJobs = jobs.map(data => ({
      data,
      opts: {
        priority: data.priority || 0,
        delay: data.scheduledAt 
          ? Math.max(0, new Date(data.scheduledAt).getTime() - Date.now())
          : 0
      }
    }))

    const addedJobs = await queue.addBulk(bulkJobs)
    logger.info(`${jobs.length} jobs added to ${platform} queue`)
    
    return addedJobs
  }

  async getJobCounts(platform: string): Promise<any> {
    const queue = this.getQueue(platform)
    if (!queue) {
      throw new Error(`Queue not found for platform: ${platform}`)
    }

    const counts = await queue.getJobCounts()
    return counts
  }

  async getAllJobCounts(): Promise<Record<string, any>> {
    const counts: Record<string, any> = {}
    
    for (const [platform, queue] of this.queues) {
      counts[platform] = await queue.getJobCounts()
    }

    return counts
  }

  async cleanQueue(platform: string, grace: number = 5000): Promise<void> {
    const queue = this.getQueue(platform)
    if (!queue) {
      throw new Error(`Queue not found for platform: ${platform}`)
    }

    await queue.clean(grace, 'completed')
    await queue.clean(grace, 'failed')
    logger.info(`Queue ${platform} cleaned`)
  }

  async close(): Promise<void> {
    for (const [platform, queue] of this.queues) {
      await queue.close()
      logger.info(`Queue ${platform} closed`)
    }
  }

  async pauseQueue(platform: string): Promise<void> {
    const queue = this.getQueue(platform)
    if (!queue) {
      throw new Error(`Queue not found for platform: ${platform}`)
    }

    await queue.pause()
    logger.info(`Queue ${platform} paused`)
  }

  async resumeQueue(platform: string): Promise<void> {
    const queue = this.getQueue(platform)
    if (!queue) {
      throw new Error(`Queue not found for platform: ${platform}`)
    }

    await queue.resume()
    logger.info(`Queue ${platform} resumed`)
  }
}