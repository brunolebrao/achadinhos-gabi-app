import { PrismaClient, SocialAccount } from '@repo/database'
import { InstagramClient, PostPublisher, StoryPublisher, ReelsPublisher } from '@repo/instagram'
import { logger } from '../utils/logger'

export class InstagramPublisher {
  private prisma: PrismaClient
  private clients: Map<string, InstagramClient> = new Map()

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async initialize(): Promise<void> {
    // Load Instagram accounts from database
    const accounts = await this.prisma.socialAccount.findMany({
      where: {
        platform: 'INSTAGRAM',
        isActive: true
      }
    })

    for (const account of accounts) {
      const config = {
        appId: process.env.INSTAGRAM_APP_ID!,
        appSecret: process.env.INSTAGRAM_APP_SECRET!,
        accessToken: account.accessToken,
        businessAccountId: account.accountId
      }

      const client = new InstagramClient(config)
      this.clients.set(account.id, client)
      
      logger.info(`Instagram client initialized for account: ${account.username}`)
    }
  }

  async publish(content: any): Promise<any> {
    // Get the first active account (or implement account selection logic)
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        platform: 'INSTAGRAM',
        isActive: true
      }
    })

    if (!account) {
      throw new Error('No active Instagram account found')
    }

    const client = this.clients.get(account.id)
    if (!client) {
      throw new Error('Instagram client not initialized')
    }

    const config = {
      appId: process.env.INSTAGRAM_APP_ID!,
      appSecret: process.env.INSTAGRAM_APP_SECRET!,
      accessToken: account.accessToken,
      businessAccountId: account.accountId
    }

    let result: any = {}

    switch (content.type) {
      case 'post':
        const postPublisher = new PostPublisher(config)
        result.postId = await postPublisher.publishPost({
          caption: content.caption,
          mediaUrl: content.mediaUrl,
          mediaType: 'IMAGE',
          hashtags: content.hashtags
        })
        break

      case 'story':
        const storyPublisher = new StoryPublisher(config)
        result.storyId = await storyPublisher.publishStory({
          mediaUrl: content.mediaUrl,
          mediaType: content.mediaType || 'IMAGE'
        })
        break

      case 'reel':
        const reelsPublisher = new ReelsPublisher(config)
        result.reelId = await reelsPublisher.publishReel({
          caption: content.caption,
          videoUrl: content.videoUrl,
          coverUrl: content.coverUrl,
          hashtags: content.hashtags
        })
        break

      default:
        throw new Error(`Unsupported content type: ${content.type}`)
    }

    result.accountId = account.id
    result.platform = 'instagram'

    return result
  }

  async schedulePost(content: any, scheduledAt: Date): Promise<any> {
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        platform: 'INSTAGRAM',
        isActive: true
      }
    })

    if (!account) {
      throw new Error('No active Instagram account found')
    }

    const config = {
      appId: process.env.INSTAGRAM_APP_ID!,
      appSecret: process.env.INSTAGRAM_APP_SECRET!,
      accessToken: account.accessToken,
      businessAccountId: account.accountId
    }

    const postPublisher = new PostPublisher(config)
    const postId = await postPublisher.publishPost({
      caption: content.caption,
      mediaUrl: content.mediaUrl,
      mediaType: 'IMAGE',
      hashtags: content.hashtags,
      scheduledPublishTime: scheduledAt
    })

    return {
      postId,
      accountId: account.id,
      platform: 'instagram',
      scheduledAt
    }
  }

  async getAnalytics(postId: string): Promise<any> {
    const post = await this.prisma.socialPost.findFirst({
      where: {
        postId,
        platform: 'INSTAGRAM'
      },
      include: {
        account: true
      }
    })

    if (!post) {
      throw new Error('Post not found')
    }

    const client = this.clients.get(post.accountId)
    if (!client) {
      throw new Error('Instagram client not initialized')
    }

    return await client.getMediaInsights(postId)
  }
}