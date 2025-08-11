import { Product } from '@repo/database'
import { 
  ImageGenerator, 
  // VideoGenerator, // Temporarily disabled
  // StoryCreator, // Temporarily disabled
  ContentOptimizer 
} from '@repo/content-generator'
import { logger } from '../utils/logger'

export class ContentGenerator {
  private imageGenerator: ImageGenerator
  // private videoGenerator: VideoGenerator // Temporarily disabled
  // private storyCreator: StoryCreator // Temporarily disabled
  private optimizer: ContentOptimizer

  constructor() {
    this.imageGenerator = new ImageGenerator()
    // this.videoGenerator = new VideoGenerator() // Temporarily disabled
    // this.storyCreator = new StoryCreator() // Temporarily disabled
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
    // Temporarily disabled - VideoGenerator not available
    throw new Error('TikTok video generation temporarily disabled')
  }

  async generateStory(product: any, platform: 'instagram' | 'tiktok'): Promise<any> {
    // Temporarily disabled - StoryCreator not available
    throw new Error('Story generation temporarily disabled')
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
    // Temporarily disabled - VideoGenerator not available
    throw new Error('Promo video generation temporarily disabled')
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