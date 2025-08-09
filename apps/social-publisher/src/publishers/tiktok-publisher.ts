import { PrismaClient } from '@repo/database'
import { TikTokClient, VideoPublisher, HashtagAnalyzer } from '@repo/tiktok'
import { logger } from '../utils/logger'

export class TikTokPublisher {
  private prisma: PrismaClient
  private clients: Map<string, TikTokClient> = new Map()

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async initialize(): Promise<void> {
    // Load TikTok accounts from database
    const accounts = await this.prisma.socialAccount.findMany({
      where: {
        platform: 'TIKTOK',
        isActive: true
      }
    })

    for (const account of accounts) {
      const config = {
        clientKey: process.env.TIKTOK_CLIENT_KEY!,
        clientSecret: process.env.TIKTOK_CLIENT_SECRET!,
        accessToken: account.accessToken,
        openId: account.accountId
      }

      const client = new TikTokClient(config)
      this.clients.set(account.id, client)
      
      logger.info(`TikTok client initialized for account: ${account.username}`)
    }
  }

  async publish(content: any): Promise<any> {
    // Get the first active account
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        platform: 'TIKTOK',
        isActive: true
      }
    })

    if (!account) {
      throw new Error('No active TikTok account found')
    }

    const config = {
      clientKey: process.env.TIKTOK_CLIENT_KEY!,
      clientSecret: process.env.TIKTOK_CLIENT_SECRET!,
      accessToken: account.accessToken,
      openId: account.accountId
    }

    const videoPublisher = new VideoPublisher(config)

    // Optimize hashtags before publishing
    let optimizedHashtags = content.hashtags || []
    if (content.hashtags && content.hashtags.length > 0) {
      const hashtagAnalyzer = new HashtagAnalyzer(config)
      const analysis = await hashtagAnalyzer.analyzeHashtagPerformance(content.hashtags)
      optimizedHashtags = analysis.hashtags
        .filter((h: any) => h.avgViewsPerVideo > 10000)
        .map((h: any) => h.hashtag)
        .slice(0, 10)
    }

    const videoId = await videoPublisher.publishVideo({
      caption: content.caption,
      videoUrl: content.videoUrl,
      hashtags: optimizedHashtags,
      privacy: content.privacy || 'PUBLIC',
      allowComments: content.allowComments !== false,
      allowDuet: content.allowDuet !== false,
      allowStitch: content.allowStitch !== false
    })

    return {
      videoId,
      accountId: account.id,
      platform: 'tiktok',
      hashtags: optimizedHashtags
    }
  }

  async scheduleVideo(content: any, scheduledAt: Date): Promise<any> {
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        platform: 'TIKTOK',
        isActive: true
      }
    })

    if (!account) {
      throw new Error('No active TikTok account found')
    }

    const config = {
      clientKey: process.env.TIKTOK_CLIENT_KEY!,
      clientSecret: process.env.TIKTOK_CLIENT_SECRET!,
      accessToken: account.accessToken,
      openId: account.accountId
    }

    const videoPublisher = new VideoPublisher(config)
    const videoId = await videoPublisher.scheduleVideo({
      caption: content.caption,
      videoUrl: content.videoUrl,
      hashtags: content.hashtags,
      scheduledPublishTime: scheduledAt
    })

    return {
      videoId,
      accountId: account.id,
      platform: 'tiktok',
      scheduledAt
    }
  }

  async getOptimalHashtags(keyword: string): Promise<string[]> {
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        platform: 'TIKTOK',
        isActive: true
      }
    })

    if (!account) {
      throw new Error('No active TikTok account found')
    }

    const config = {
      clientKey: process.env.TIKTOK_CLIENT_KEY!,
      clientSecret: process.env.TIKTOK_CLIENT_SECRET!,
      accessToken: account.accessToken,
      openId: account.accountId
    }

    const hashtagAnalyzer = new HashtagAnalyzer(config)
    return await hashtagAnalyzer.getOptimalHashtagMix(keyword)
  }

  async getAnalytics(videoId: string): Promise<any> {
    const post = await this.prisma.socialPost.findFirst({
      where: {
        postId: videoId,
        platform: 'TIKTOK'
      }
    })

    if (!post) {
      throw new Error('Video not found')
    }

    const client = this.clients.get(post.accountId)
    if (!client) {
      throw new Error('TikTok client not initialized')
    }

    return await client.getVideoInsights([videoId])
  }
}