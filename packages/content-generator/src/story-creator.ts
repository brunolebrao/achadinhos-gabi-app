import { ImageGenerator } from './image-generator'
import { VideoGenerator } from './video-generator'
import { ProductCard, Platform, StoryConfig, PLATFORM_DIMENSIONS } from './types'

export class StoryCreator {
  private imageGenerator: ImageGenerator
  private videoGenerator: VideoGenerator

  constructor() {
    this.imageGenerator = new ImageGenerator()
    this.videoGenerator = new VideoGenerator()
  }

  async createProductStory(
    product: ProductCard,
    platform: Platform,
    config?: StoryConfig
  ): Promise<Buffer> {
    try {
      const dimensions = platform === 'instagram'
        ? PLATFORM_DIMENSIONS.instagram.story
        : platform === 'tiktok'
        ? PLATFORM_DIMENSIONS.tiktok.video
        : PLATFORM_DIMENSIONS.whatsapp.status

      // For static story (image)
      if (!config || !config.duration) {
        return await this.createStaticStory(product, platform)
      }

      // For animated story (video)
      return await this.createAnimatedStory(product, platform, config)
    } catch (error) {
      console.error('Failed to create product story:', error)
      throw error
    }
  }

  async createMultiProductStory(
    products: ProductCard[],
    platform: Platform,
    config?: StoryConfig
  ): Promise<Buffer[]> {
    const stories: Buffer[] = []

    // Create intro story
    const intro = await this.createIntroStory(
      `${products.length} Ofertas Imperdíveis!`,
      platform
    )
    stories.push(intro)

    // Create product stories
    for (const product of products.slice(0, 5)) {
      const story = await this.createProductStory(product, platform, config)
      stories.push(story)
    }

    // Create CTA story
    const cta = await this.createCTAStory(
      'Aproveite Agora!',
      'Clique no link da bio',
      platform
    )
    stories.push(cta)

    return stories
  }

  async createCountdownStory(
    title: string,
    endTime: Date,
    platform: Platform,
    products?: ProductCard[]
  ): Promise<Buffer> {
    // Create countdown story with timer
    const html = this.generateCountdownHTML(title, endTime, products)
    
    // Convert to image/video based on platform
    if (platform === 'whatsapp') {
      return await this.htmlToImage(html, PLATFORM_DIMENSIONS.whatsapp.status)
    }

    return await this.htmlToVideo(
      html,
      platform === 'instagram' 
        ? PLATFORM_DIMENSIONS.instagram.story
        : PLATFORM_DIMENSIONS.tiktok.video,
      15 // 15 second story
    )
  }

  async createPollStory(
    question: string,
    options: string[],
    platform: Platform,
    product?: ProductCard
  ): Promise<Buffer> {
    if (platform !== 'instagram') {
      throw new Error('Poll stories are only supported on Instagram')
    }

    const html = this.generatePollHTML(question, options, product)
    return await this.htmlToImage(html, PLATFORM_DIMENSIONS.instagram.story)
  }

  async createQuizStory(
    question: string,
    options: string[],
    correctAnswer: number,
    platform: Platform,
    product?: ProductCard
  ): Promise<Buffer> {
    if (platform !== 'instagram') {
      throw new Error('Quiz stories are only supported on Instagram')
    }

    const html = this.generateQuizHTML(question, options, correctAnswer, product)
    return await this.htmlToImage(html, PLATFORM_DIMENSIONS.instagram.story)
  }

  private async createStaticStory(
    product: ProductCard,
    platform: Platform
  ): Promise<Buffer> {
    const dimensions = platform === 'instagram'
      ? PLATFORM_DIMENSIONS.instagram.story
      : platform === 'tiktok'
      ? PLATFORM_DIMENSIONS.tiktok.video
      : PLATFORM_DIMENSIONS.whatsapp.status

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; }
            body {
              width: ${dimensions.width}px;
              height: ${dimensions.height}px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              padding: 60px 40px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: white;
            }
            .header {
              text-align: center;
            }
            .brand {
              font-size: 24px;
              opacity: 0.9;
              margin-bottom: 10px;
            }
            .title {
              font-size: 42px;
              font-weight: bold;
              line-height: 1.2;
            }
            .product-image {
              width: 90%;
              max-width: 800px;
              height: auto;
              border-radius: 30px;
              box-shadow: 0 30px 60px rgba(0,0,0,0.3);
            }
            .price-section {
              text-align: center;
            }
            .original-price {
              font-size: 32px;
              text-decoration: line-through;
              opacity: 0.7;
              margin-bottom: 10px;
            }
            .price {
              font-size: 72px;
              font-weight: bold;
              color: #4CAF50;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            .discount-badge {
              position: absolute;
              top: 100px;
              right: 50px;
              background: #FF5722;
              padding: 25px;
              border-radius: 50%;
              font-size: 36px;
              font-weight: bold;
              box-shadow: 0 10px 20px rgba(0,0,0,0.3);
            }
            .cta {
              background: white;
              color: #667eea;
              padding: 20px 40px;
              border-radius: 50px;
              font-size: 28px;
              font-weight: bold;
              margin-top: 30px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${product.brand ? `<div class="brand">${product.brand}</div>` : ''}
            <div class="title">${this.truncateText(product.title, 50)}</div>
          </div>
          
          <img class="product-image" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='800'%3E%3Crect fill='%23ddd' width='800' height='800'/%3E%3Ctext fill='%23999' font-size='48' x='50%25' y='50%25' text-anchor='middle'%3EProduct Image%3C/text%3E%3C/svg%3E" />
          
          <div class="price-section">
            ${product.originalPrice ? `<div class="original-price">R$ ${product.originalPrice.toFixed(2)}</div>` : ''}
            <div class="price">R$ ${product.price.toFixed(2)}</div>
            <div class="cta">COMPRAR AGORA</div>
          </div>
          
          ${product.discount ? `<div class="discount-badge">${product.discount}</div>` : ''}
        </body>
      </html>
    `

    return await this.htmlToImage(html, dimensions)
  }

  private async createAnimatedStory(
    product: ProductCard,
    platform: Platform,
    config: StoryConfig
  ): Promise<Buffer> {
    const videoConfig = {
      duration: config.duration,
      fps: 30,
      resolution: '1080p' as const,
      format: 'mp4' as const
    }

    return await this.videoGenerator.generateProductVideo(product, platform, videoConfig)
  }

  private async createIntroStory(
    title: string,
    platform: Platform
  ): Promise<Buffer> {
    const dimensions = platform === 'instagram'
      ? PLATFORM_DIMENSIONS.instagram.story
      : platform === 'tiktok'
      ? PLATFORM_DIMENSIONS.tiktok.video
      : PLATFORM_DIMENSIONS.whatsapp.status

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              width: ${dimensions.width}px;
              height: ${dimensions.height}px;
              background: radial-gradient(circle at center, #ff6b6b, #c92a2a);
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: white;
            }
            .content {
              text-align: center;
            }
            .emoji {
              font-size: 120px;
              margin-bottom: 30px;
            }
            .title {
              font-size: 64px;
              font-weight: bold;
              line-height: 1.2;
            }
          </style>
        </head>
        <body>
          <div class="content">
            <div class="emoji">🎉</div>
            <div class="title">${title}</div>
          </div>
        </body>
      </html>
    `

    return await this.htmlToImage(html, dimensions)
  }

  private async createCTAStory(
    title: string,
    subtitle: string,
    platform: Platform
  ): Promise<Buffer> {
    const dimensions = platform === 'instagram'
      ? PLATFORM_DIMENSIONS.instagram.story
      : platform === 'tiktok'
      ? PLATFORM_DIMENSIONS.tiktok.video
      : PLATFORM_DIMENSIONS.whatsapp.status

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              width: ${dimensions.width}px;
              height: ${dimensions.height}px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: white;
            }
            .title {
              font-size: 72px;
              font-weight: bold;
              margin-bottom: 30px;
            }
            .subtitle {
              font-size: 36px;
              opacity: 0.9;
              margin-bottom: 50px;
            }
            .arrow {
              font-size: 80px;
              animation: bounce 2s infinite;
            }
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-30px); }
            }
          </style>
        </head>
        <body>
          <div class="title">${title}</div>
          <div class="subtitle">${subtitle}</div>
          <div class="arrow">👆</div>
        </body>
      </html>
    `

    return await this.htmlToImage(html, dimensions)
  }

  private generateCountdownHTML(
    title: string,
    endTime: Date,
    products?: ProductCard[]
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              width: 1080px;
              height: 1920px;
              background: linear-gradient(135deg, #1e3c72, #2a5298);
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: white;
            }
            .title {
              font-size: 56px;
              font-weight: bold;
              margin-bottom: 50px;
              text-align: center;
            }
            .countdown {
              font-size: 96px;
              font-weight: bold;
              margin: 50px 0;
              font-variant-numeric: tabular-nums;
            }
            .products-info {
              font-size: 32px;
              opacity: 0.9;
            }
          </style>
        </head>
        <body>
          <div class="title">${title}</div>
          <div class="countdown">24:00:00</div>
          ${products ? `<div class="products-info">${products.length} produtos com desconto!</div>` : ''}
        </body>
      </html>
    `
  }

  private generatePollHTML(
    question: string,
    options: string[],
    product?: ProductCard
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              width: 1080px;
              height: 1920px;
              background: linear-gradient(135deg, #f093fb, #f5576c);
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: white;
              padding: 60px;
            }
            .question {
              font-size: 48px;
              font-weight: bold;
              text-align: center;
              margin-bottom: 50px;
            }
            .options {
              width: 100%;
            }
            .option {
              background: rgba(255,255,255,0.2);
              padding: 30px;
              margin: 20px 0;
              border-radius: 20px;
              font-size: 36px;
              text-align: center;
              backdrop-filter: blur(10px);
            }
          </style>
        </head>
        <body>
          <div class="question">${question}</div>
          <div class="options">
            ${options.map(opt => `<div class="option">${opt}</div>`).join('')}
          </div>
        </body>
      </html>
    `
  }

  private generateQuizHTML(
    question: string,
    options: string[],
    correctAnswer: number,
    product?: ProductCard
  ): string {
    return this.generatePollHTML(question, options, product)
  }

  private async htmlToImage(html: string, dimensions: any): Promise<Buffer> {
    // In production, this would use puppeteer or similar to render HTML to image
    // For now, return a placeholder
    console.log('Converting HTML to image with dimensions:', dimensions)
    return Buffer.from(html)
  }

  private async htmlToVideo(html: string, dimensions: any, duration: number): Promise<Buffer> {
    // In production, this would use puppeteer + ffmpeg to render HTML to video
    console.log('Converting HTML to video with dimensions:', dimensions, 'duration:', duration)
    return Buffer.from(html)
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength - 3) + '...'
  }
}