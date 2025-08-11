import { PrismaClient, SocialPlatform, PostStatus } from '@repo/database'
import { QueueManager, PublishJob } from '../queue/queue-manager'
import { InstagramPublisher } from '../publishers/instagram-publisher'
import { TikTokPublisher } from '../publishers/tiktok-publisher'
import { WhatsAppPublisher } from '../publishers/whatsapp-publisher'
import { ContentGenerator } from '../services/content-generator-service'
import { logger } from '../utils/logger'

export class SocialPublisherService {
  private prisma: PrismaClient
  private queueManager: QueueManager
  private publishers: Map<string, any> = new Map()
  private contentGenerator: ContentGenerator

  constructor(queueManager: QueueManager) {
    this.prisma = new PrismaClient()
    this.queueManager = queueManager
    this.contentGenerator = new ContentGenerator()
  }

  async initialize(): Promise<void> {
    // Initialize publishers
    this.publishers.set('instagram', new InstagramPublisher(this.prisma))
    this.publishers.set('tiktok', new TikTokPublisher(this.prisma))
    this.publishers.set('whatsapp', new WhatsAppPublisher(this.prisma))

    // Register queue processors
    await this.registerProcessors()

    logger.info('Social Publisher Service initialized')
  }

  private async registerProcessors(): Promise<void> {
    // Instagram processor
    const instagramQueue = this.queueManager.getQueue('instagram')
    if (instagramQueue) {
      instagramQueue.process(async (job) => {
        return await this.processInstagramJob(job.data)
      })
    }

    // TikTok processor
    const tiktokQueue = this.queueManager.getQueue('tiktok')
    if (tiktokQueue) {
      tiktokQueue.process(async (job) => {
        return await this.processTikTokJob(job.data)
      })
    }

    // WhatsApp processor
    const whatsappQueue = this.queueManager.getQueue('whatsapp')
    if (whatsappQueue) {
      whatsappQueue.process(async (job) => {
        return await this.processWhatsAppJob(job.data)
      })
    }

    // Multi-platform processor
    const multiQueue = this.queueManager.getQueue('multi-platform')
    if (multiQueue) {
      multiQueue.process(async (job) => {
        return await this.processMultiPlatformJob(job.data)
      })
    }
  }

  async publishToSinglePlatform(
    platform: SocialPlatform,
    productId: string,
    content: any,
    scheduledAt?: Date
  ): Promise<void> {
    const job: PublishJob = {
      productId,
      platforms: [platform],
      content,
      scheduledAt
    }

    await this.queueManager.addJob(platform.toLowerCase(), job)
  }

  async publishToMultiplePlatforms(
    platforms: SocialPlatform[],
    productId: string,
    content: any,
    scheduledAt?: Date
  ): Promise<void> {
    const job: PublishJob = {
      productId,
      platforms: platforms.map(p => p.toLowerCase()),
      content,
      scheduledAt
    }

    await this.queueManager.addJob('multi-platform', job)
  }

  private async processInstagramJob(data: PublishJob): Promise<any> {
    logger.info('Processing Instagram job:', data)

    try {
      const publisher = this.publishers.get('instagram') as InstagramPublisher
      
      // Generate content if needed
      if (data.productId && !data.content.mediaUrl) {
        const product = await this.prisma.product.findUnique({
          where: { id: data.productId }
        })

        if (product) {
          const generatedContent = await this.contentGenerator.generateForInstagram(product)
          data.content.mediaUrl = generatedContent.url
        }
      }

      // Publish content
      const result = await publisher.publish(data.content)

      // Update database
      if (data.productId) {
        await this.prisma.socialPost.create({
          data: {
            productId: data.productId,
            platform: SocialPlatform.INSTAGRAM,
            accountId: result.accountId,
            postId: result.postId,
            content: data.content.caption || '',
            mediaUrls: [data.content.mediaUrl],
            hashtags: data.content.hashtags || [],
            status: PostStatus.PUBLISHED,
            publishedAt: new Date()
          }
        })
      }

      logger.info('Instagram job completed successfully:', result)
      return result
    } catch (error) {
      logger.error('Instagram job failed:', error)
      throw error
    }
  }

  private async processTikTokJob(data: PublishJob): Promise<any> {
    logger.info('Processing TikTok job:', data)

    try {
      const publisher = this.publishers.get('tiktok') as TikTokPublisher
      
      // Generate content if needed
      if (data.productId && !data.content.videoUrl) {
        const product = await this.prisma.product.findUnique({
          where: { id: data.productId }
        })

        if (product) {
          const generatedContent = await this.contentGenerator.generateForTikTok(product)
          data.content.videoUrl = generatedContent.url
        }
      }

      // Publish content
      const result = await publisher.publish(data.content)

      // Update database
      if (data.productId) {
        await this.prisma.socialPost.create({
          data: {
            productId: data.productId,
            platform: SocialPlatform.TIKTOK,
            accountId: result.accountId,
            postId: result.postId,
            content: data.content.caption || '',
            mediaUrls: [data.content.videoUrl],
            hashtags: data.content.hashtags || [],
            status: PostStatus.PUBLISHED,
            publishedAt: new Date()
          }
        })
      }

      logger.info('TikTok job completed successfully:', result)
      return result
    } catch (error) {
      logger.error('TikTok job failed:', error)
      throw error
    }
  }

  private async processWhatsAppJob(data: PublishJob): Promise<any> {
    logger.info('Processing WhatsApp job:', data)

    try {
      const publisher = this.publishers.get('whatsapp') as WhatsAppPublisher
      
      // Process WhatsApp message
      const result = await publisher.publish(data.content)

      logger.info('WhatsApp job completed successfully:', result)
      return result
    } catch (error) {
      logger.error('WhatsApp job failed:', error)
      throw error
    }
  }

  private async processMultiPlatformJob(data: PublishJob): Promise<any> {
    logger.info('Processing multi-platform job:', data)

    const results: any[] = []

    for (const platform of data.platforms) {
      try {
        const jobData = { ...data, platforms: [platform] }
        
        switch (platform) {
          case 'instagram':
            results.push(await this.processInstagramJob(jobData))
            break
          case 'tiktok':
            results.push(await this.processTikTokJob(jobData))
            break
          case 'whatsapp':
            results.push(await this.processWhatsAppJob(jobData))
            break
        }
      } catch (error) {
        logger.error(`Failed to publish to ${platform}:`, error)
        results.push({ platform, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    return results
  }

  async getScheduledPosts(platform?: SocialPlatform): Promise<any[]> {
    const where: any = {
      status: PostStatus.SCHEDULED,
      scheduledAt: { gte: new Date() }
    }

    if (platform) {
      where.platform = platform
    }

    return await this.prisma.socialPost.findMany({
      where,
      include: {
        product: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })
  }

  async cancelScheduledPost(postId: string): Promise<void> {
    await this.prisma.socialPost.update({
      where: { id: postId },
      data: { status: PostStatus.FAILED }
    })
  }
}