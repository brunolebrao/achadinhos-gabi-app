import cron from 'node-cron'
import { PrismaClient, ScheduledContent, ScheduleStatus, SocialPlatform } from '@repo/database'
import { SocialPublisherService } from './social-publisher-service'
import { logger } from '../utils/logger'

export class Scheduler {
  private prisma: PrismaClient
  private publisherService: SocialPublisherService
  private jobs: Map<string, cron.ScheduledTask> = new Map()

  constructor(publisherService: SocialPublisherService) {
    this.prisma = new PrismaClient()
    this.publisherService = publisherService
  }

  start(): void {
    // Check for scheduled content every minute
    const checkScheduledContent = cron.schedule('* * * * *', async () => {
      await this.processScheduledContent()
    })
    
    this.jobs.set('scheduled-content', checkScheduledContent)

    // Clean up old completed jobs daily at 2 AM
    const cleanupJob = cron.schedule('0 2 * * *', async () => {
      await this.cleanupOldJobs()
    })
    
    this.jobs.set('cleanup', cleanupJob)

    // Update analytics every hour
    const analyticsJob = cron.schedule('0 * * * *', async () => {
      await this.updateAnalytics()
    })
    
    this.jobs.set('analytics', analyticsJob)

    logger.info('Scheduler started with jobs: scheduled-content, cleanup, analytics')
  }

  stop(): void {
    for (const [name, job] of this.jobs) {
      job.stop()
      logger.info(`Stopped job: ${name}`)
    }
    this.jobs.clear()
  }

  private async processScheduledContent(): Promise<void> {
    try {
      // Find content scheduled for the next 5 minutes
      const now = new Date()
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

      const scheduledContent = await this.prisma.scheduledContent.findMany({
        where: {
          status: ScheduleStatus.PENDING,
          scheduledAt: {
            gte: now,
            lte: fiveMinutesFromNow
          }
        },
        include: {
          product: true
        }
      })

      for (const content of scheduledContent) {
        try {
          // Mark as processing
          await this.prisma.scheduledContent.update({
            where: { id: content.id },
            data: { status: ScheduleStatus.PROCESSING }
          })

          // Parse content for each platform
          const contentData = content.content as any

          // Publish to each platform
          if (content.platforms.includes(SocialPlatform.INSTAGRAM)) {
            await this.publisherService.publishToSinglePlatform(
              SocialPlatform.INSTAGRAM,
              content.productId!,
              contentData.instagram || contentData,
              content.scheduledAt
            )
          }

          if (content.platforms.includes(SocialPlatform.TIKTOK)) {
            await this.publisherService.publishToSinglePlatform(
              SocialPlatform.TIKTOK,
              content.productId!,
              contentData.tiktok || contentData,
              content.scheduledAt
            )
          }

          if (content.platforms.includes(SocialPlatform.WHATSAPP)) {
            await this.publisherService.publishToSinglePlatform(
              SocialPlatform.WHATSAPP,
              content.productId!,
              contentData.whatsapp || contentData,
              content.scheduledAt
            )
          }

          // Mark as completed
          await this.prisma.scheduledContent.update({
            where: { id: content.id },
            data: { status: ScheduleStatus.COMPLETED }
          })

          logger.info(`Scheduled content ${content.id} published successfully`)
        } catch (error) {
          logger.error(`Failed to publish scheduled content ${content.id}:`, error)
          
          // Mark as failed
          await this.prisma.scheduledContent.update({
            where: { id: content.id },
            data: { status: ScheduleStatus.FAILED }
          })
        }
      }
    } catch (error) {
      logger.error('Error processing scheduled content:', error)
    }
  }

  private async cleanupOldJobs(): Promise<void> {
    try {
      // Delete completed scheduled content older than 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const result = await this.prisma.scheduledContent.deleteMany({
        where: {
          status: ScheduleStatus.COMPLETED,
          createdAt: { lt: thirtyDaysAgo }
        }
      })

      logger.info(`Cleaned up ${result.count} old scheduled content records`)
    } catch (error) {
      logger.error('Error cleaning up old jobs:', error)
    }
  }

  private async updateAnalytics(): Promise<void> {
    try {
      // Get recent published posts
      const oneDayAgo = new Date()
      oneDayAgo.setDate(oneDayAgo.getDate() - 1)

      const recentPosts = await this.prisma.socialPost.findMany({
        where: {
          status: 'PUBLISHED',
          publishedAt: { gte: oneDayAgo },
          postId: { not: null }
        }
      })

      for (const post of recentPosts) {
        try {
          let analytics: any = null

          // Fetch analytics based on platform
          switch (post.platform) {
            case SocialPlatform.INSTAGRAM:
              // Fetch Instagram analytics
              logger.info(`Fetching Instagram analytics for post ${post.postId}`)
              break
            
            case SocialPlatform.TIKTOK:
              // Fetch TikTok analytics
              logger.info(`Fetching TikTok analytics for post ${post.postId}`)
              break
          }

          if (analytics) {
            // Update post with analytics
            await this.prisma.socialPost.update({
              where: { id: post.id },
              data: { analytics }
            })
          }
        } catch (error) {
          logger.error(`Failed to update analytics for post ${post.id}:`, error)
        }
      }
    } catch (error) {
      logger.error('Error updating analytics:', error)
    }
  }

  async schedulePost(
    productId: string,
    platforms: SocialPlatform[],
    content: any,
    scheduledAt: Date
  ): Promise<void> {
    // Create scheduled content record
    await this.prisma.scheduledContent.create({
      data: {
        productId,
        platforms,
        content,
        scheduledAt,
        status: ScheduleStatus.PENDING
      }
    })

    logger.info(`Post scheduled for ${scheduledAt} on platforms: ${platforms.join(', ')}`)
  }

  async cancelScheduledPost(scheduledContentId: string): Promise<void> {
    await this.prisma.scheduledContent.update({
      where: { id: scheduledContentId },
      data: { status: ScheduleStatus.FAILED }
    })

    logger.info(`Scheduled content ${scheduledContentId} cancelled`)
  }

  async getUpcomingSchedule(limit: number = 10): Promise<ScheduledContent[]> {
    return await this.prisma.scheduledContent.findMany({
      where: {
        status: ScheduleStatus.PENDING,
        scheduledAt: { gte: new Date() }
      },
      include: {
        product: true
      },
      orderBy: {
        scheduledAt: 'asc'
      },
      take: limit
    })
  }
}