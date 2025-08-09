import { Product } from '@repo/database'
import { 
  ImageGenerator, 
  VideoGenerator, 
  StoryCreator,
  ContentOptimizer 
} from '@repo/content-generator'
import { logger } from '../utils/logger'

export class ContentGenerator {
  private imageGenerator: ImageGenerator
  private videoGenerator: VideoGenerator
  private storyCreator: StoryCreator
  private optimizer: ContentOptimizer

  constructor() {
    this.imageGenerator = new ImageGenerator()
    this.videoGenerator = new VideoGenerator()
    this.storyCreator = new StoryCreator()
    this.optimizer = new ContentOptimizer()
  }

  async generateForInstagram(product: any): Promise<any> {
    try {
      // Generate product card image
      const imageBuffer = await this.imageGenerator.generateProductCard(
        {
          title: product.title,
          price: product.price,
          originalPrice: product.originalPrice,
          discount: product.discount,
          imageUrl: product.imageUrl,
          brand: product.brand,
          rating: product.ratings
        },
        'instagram',
        'post'
      )

      // Optimize for Instagram
      const optimizedBuffer = await this.optimizer.optimizeForPlatform(
        imageBuffer,
        'instagram',
        'post'
      )

      // Upload to CDN or return base64
      const url = await this.uploadToStorage(optimizedBuffer, 'instagram-post.jpg')

      return {
        url,
        type: 'image',
        platform: 'instagram'
      }
    } catch (error) {
      logger.error('Failed to generate Instagram content:', error)
      throw error
    }
  }

  async generateForTikTok(product: any): Promise<any> {
    try {
      // Generate product video
      const videoConfig = {
        duration: 15,
        fps: 30,
        resolution: '1080p' as const,
        format: 'mp4' as const
      }

      const videoBuffer = await this.videoGenerator.generateProductVideo(
        {
          title: product.title,
          price: product.price,
          originalPrice: product.originalPrice,
          discount: product.discount,
          imageUrl: product.imageUrl,
          brand: product.brand,
          rating: product.ratings
        },
        'tiktok',
        videoConfig
      )

      // Upload to CDN or return base64
      const url = await this.uploadToStorage(videoBuffer, 'tiktok-video.mp4')

      return {
        url,
        type: 'video',
        platform: 'tiktok'
      }
    } catch (error) {
      logger.error('Failed to generate TikTok content:', error)
      throw error
    }
  }

  async generateStory(product: any, platform: 'instagram' | 'tiktok'): Promise<any> {
    try {
      const storyBuffer = await this.storyCreator.createProductStory(
        {
          title: product.title,
          price: product.price,
          originalPrice: product.originalPrice,
          discount: product.discount,
          imageUrl: product.imageUrl,
          brand: product.brand,
          rating: product.ratings
        },
        platform
      )

      // Optimize for platform
      const optimizedBuffer = await this.optimizer.optimizeForPlatform(
        storyBuffer,
        platform,
        'story'
      )

      // Upload to CDN
      const url = await this.uploadToStorage(
        optimizedBuffer,
        `${platform}-story.jpg`
      )

      return {
        url,
        type: 'story',
        platform
      }
    } catch (error) {
      logger.error(`Failed to generate ${platform} story:`, error)
      throw error
    }
  }

  async generateCarousel(products: any[], platform: 'instagram'): Promise<any> {
    try {
      const slides = await this.imageGenerator.generateCarousel(
        products.map(p => ({
          title: p.title,
          price: p.price,
          originalPrice: p.originalPrice,
          discount: p.discount,
          imageUrl: p.imageUrl,
          brand: p.brand,
          rating: p.ratings
        })),
        platform
      )

      // Optimize each slide
      const optimizedSlides = await Promise.all(
        slides.map(slide => 
          this.optimizer.optimizeForPlatform(slide, platform, 'post')
        )
      )

      // Upload slides
      const urls = await Promise.all(
        optimizedSlides.map((slide, index) => 
          this.uploadToStorage(slide, `carousel-slide-${index}.jpg`)
        )
      )

      return {
        urls,
        type: 'carousel',
        platform
      }
    } catch (error) {
      logger.error('Failed to generate carousel:', error)
      throw error
    }
  }

  async generatePromoVideo(
    products: any[],
    platform: 'instagram' | 'tiktok',
    template: 'flash-sale' | 'countdown' | 'carousel' = 'carousel'
  ): Promise<any> {
    try {
      const videoConfig = {
        duration: platform === 'tiktok' ? 30 : 60,
        fps: 30,
        resolution: '1080p' as const,
        format: 'mp4' as const
      }

      const videoBuffer = await this.videoGenerator.generatePromoVideo(
        products.map(p => ({
          title: p.title,
          price: p.price,
          originalPrice: p.originalPrice,
          discount: p.discount,
          imageUrl: p.imageUrl,
          brand: p.brand,
          rating: p.ratings
        })),
        platform,
        videoConfig,
        template
      )

      // Upload to CDN
      const url = await this.uploadToStorage(
        videoBuffer,
        `${platform}-promo-${template}.mp4`
      )

      return {
        url,
        type: 'video',
        platform,
        template
      }
    } catch (error) {
      logger.error('Failed to generate promo video:', error)
      throw error
    }
  }

  private async uploadToStorage(buffer: Buffer, filename: string): Promise<string> {
    // In production, this would upload to S3, Cloudinary, or another CDN
    // For now, return a placeholder URL
    logger.info(`Uploading ${filename} to storage...`)
    
    // Convert to base64 data URL as placeholder
    const base64 = buffer.toString('base64')
    const mimeType = filename.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg'
    
    return `data:${mimeType};base64,${base64}`
  }
}