import puppeteer, { Browser, Page } from 'puppeteer'
import { VideoConfig, ProductCard, Platform, PLATFORM_DIMENSIONS } from './types'

export class VideoGenerator {
  private browser: Browser | null = null
  private page: Page | null = null

  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    this.page = await this.browser.newPage()
  }

  async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close()
    }
    if (this.browser) {
      await this.browser.close()
    }
  }

  async generateProductVideo(
    product: ProductCard,
    platform: Platform,
    config: VideoConfig
  ): Promise<Buffer> {
    try {
      await this.initialize()

      if (!this.page) {
        throw new Error('Page not initialized')
      }

      const dimensions = platform === 'tiktok' 
        ? PLATFORM_DIMENSIONS.tiktok.video
        : PLATFORM_DIMENSIONS.instagram.reel

      // Set viewport
      await this.page.setViewport({
        width: dimensions.width,
        height: dimensions.height
      })

      // Create HTML template for video
      const html = this.createVideoHTML(product, dimensions)
      await this.page.setContent(html)

      // Add animations
      await this.addAnimations(product)

      // Record video (using puppeteer-screen-recorder or similar)
      // For now, we'll capture screenshots as frames
      const frames = await this.captureFrames(config.duration, config.fps)

      // Convert frames to video (would use ffmpeg in production)
      const videoBuffer = await this.framesToVideo(frames, config)

      await this.cleanup()
      return videoBuffer
    } catch (error) {
      console.error('Failed to generate product video:', error)
      await this.cleanup()
      throw error
    }
  }

  async generateSlideshow(
    products: ProductCard[],
    platform: Platform,
    config: VideoConfig
  ): Promise<Buffer> {
    try {
      await this.initialize()

      if (!this.page) {
        throw new Error('Page not initialized')
      }

      const dimensions = platform === 'tiktok'
        ? PLATFORM_DIMENSIONS.tiktok.video
        : PLATFORM_DIMENSIONS.instagram.reel

      await this.page.setViewport({
        width: dimensions.width,
        height: dimensions.height
      })

      // Create slideshow HTML
      const html = this.createSlideshowHTML(products, dimensions)
      await this.page.setContent(html)

      // Start slideshow animation
      await this.page.evaluate((productCount, duration) => {
        let currentSlide = 0
        const slideDuration = (duration * 1000) / productCount
        
        setInterval(() => {
          const slides = document.querySelectorAll('.slide')
          slides.forEach((slide, index) => {
            (slide as HTMLElement).style.display = index === currentSlide ? 'block' : 'none'
          })
          currentSlide = (currentSlide + 1) % productCount
        }, slideDuration)
      }, products.length, config.duration)

      // Capture video
      const frames = await this.captureFrames(config.duration, config.fps)
      const videoBuffer = await this.framesToVideo(frames, config)

      await this.cleanup()
      return videoBuffer
    } catch (error) {
      console.error('Failed to generate slideshow:', error)
      await this.cleanup()
      throw error
    }
  }

  async generatePromoVideo(
    products: ProductCard[],
    platform: Platform,
    config: VideoConfig,
    template: 'flash-sale' | 'countdown' | 'carousel' = 'carousel'
  ): Promise<Buffer> {
    try {
      await this.initialize()

      if (!this.page) {
        throw new Error('Page not initialized')
      }

      const dimensions = platform === 'tiktok'
        ? PLATFORM_DIMENSIONS.tiktok.video
        : PLATFORM_DIMENSIONS.instagram.reel

      await this.page.setViewport({
        width: dimensions.width,
        height: dimensions.height
      })

      // Create promo video HTML based on template
      let html: string
      switch (template) {
        case 'flash-sale':
          html = this.createFlashSaleHTML(products, dimensions)
          break
        case 'countdown':
          html = this.createCountdownHTML(products, dimensions)
          break
        default:
          html = this.createCarouselHTML(products, dimensions)
      }

      await this.page.setContent(html)

      // Start animations
      await this.startPromoAnimations(template)

      // Capture video
      const frames = await this.captureFrames(config.duration, config.fps)
      const videoBuffer = await this.framesToVideo(frames, config)

      await this.cleanup()
      return videoBuffer
    } catch (error) {
      console.error('Failed to generate promo video:', error)
      await this.cleanup()
      throw error
    }
  }

  private createVideoHTML(product: ProductCard, dimensions: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              width: ${dimensions.width}px;
              height: ${dimensions.height}px;
              font-family: Arial, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            }
            .product-container {
              text-align: center;
              color: white;
              animation: fadeIn 1s ease-in;
            }
            .product-image {
              width: 80%;
              max-width: 600px;
              height: auto;
              border-radius: 20px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.3);
              animation: slideIn 1.5s ease-out;
            }
            .product-title {
              font-size: 48px;
              font-weight: bold;
              margin: 30px 0;
              animation: slideUp 1s ease-out 0.5s both;
            }
            .price-container {
              animation: pulse 2s infinite;
            }
            .price {
              font-size: 72px;
              font-weight: bold;
              color: #4CAF50;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            .discount {
              position: absolute;
              top: 50px;
              right: 50px;
              background: #FF5722;
              color: white;
              padding: 20px;
              border-radius: 50%;
              font-size: 36px;
              font-weight: bold;
              animation: rotate 10s linear infinite;
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideIn {
              from { transform: translateX(-100%); }
              to { transform: translateX(0); }
            }
            @keyframes slideUp {
              from { transform: translateY(50px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.1); }
            }
            @keyframes rotate {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="product-container">
            <img class="product-image" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600'%3E%3Crect fill='%23ddd' width='600' height='600'/%3E%3Ctext fill='%23999' font-size='48' x='50%25' y='50%25' text-anchor='middle'%3EProduct Image%3C/text%3E%3C/svg%3E" />
            <h1 class="product-title">${product.title}</h1>
            <div class="price-container">
              <div class="price">R$ ${product.price.toFixed(2)}</div>
            </div>
            ${product.discount ? `<div class="discount">${product.discount}</div>` : ''}
          </div>
        </body>
      </html>
    `
  }

  private createSlideshowHTML(products: ProductCard[], dimensions: any): string {
    const slidesHTML = products.map((product, index) => `
      <div class="slide" style="display: ${index === 0 ? 'block' : 'none'};">
        <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600'%3E%3Crect fill='%23ddd' width='600' height='600'/%3E%3Ctext fill='%23999' font-size='48' x='50%25' y='50%25' text-anchor='middle'%3EProduct ${index + 1}%3C/text%3E%3C/svg%3E" />
        <h2>${product.title}</h2>
        <div class="price">R$ ${product.price.toFixed(2)}</div>
      </div>
    `).join('')

    return `
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
              align-items: center;
              justify-content: center;
              font-family: Arial, sans-serif;
            }
            .slide {
              text-align: center;
              color: white;
              animation: fadeIn 1s;
            }
            .slide img {
              width: 80%;
              border-radius: 20px;
              margin-bottom: 30px;
            }
            .slide h2 {
              font-size: 42px;
              margin-bottom: 20px;
            }
            .price {
              font-size: 64px;
              font-weight: bold;
              color: #4CAF50;
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          </style>
        </head>
        <body>
          ${slidesHTML}
        </body>
      </html>
    `
  }

  private createFlashSaleHTML(products: ProductCard[], dimensions: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              width: ${dimensions.width}px;
              height: ${dimensions.height}px;
              background: radial-gradient(circle, #ff6b6b, #c92a2a);
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              color: white;
              font-family: Arial, sans-serif;
            }
            .flash-title {
              font-size: 72px;
              font-weight: bold;
              animation: flash 0.5s infinite;
              margin-bottom: 50px;
            }
            @keyframes flash {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.3; }
            }
          </style>
        </head>
        <body>
          <div class="flash-title">⚡ FLASH SALE ⚡</div>
          <div>${products.length} produtos com até 70% OFF!</div>
        </body>
      </html>
    `
  }

  private createCountdownHTML(products: ProductCard[], dimensions: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              width: ${dimensions.width}px;
              height: ${dimensions.height}px;
              background: linear-gradient(135deg, #1e3c72, #2a5298);
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              color: white;
              font-family: Arial, sans-serif;
            }
            .countdown {
              font-size: 96px;
              font-weight: bold;
              margin: 50px 0;
            }
          </style>
        </head>
        <body>
          <h1>Oferta Termina Em:</h1>
          <div class="countdown" id="countdown">24:00:00</div>
          <div>${products.length} produtos selecionados</div>
        </body>
      </html>
    `
  }

  private createCarouselHTML(products: ProductCard[], dimensions: any): string {
    return this.createSlideshowHTML(products, dimensions)
  }

  private async addAnimations(product: ProductCard): Promise<void> {
    if (!this.page) return

    await this.page.evaluate(() => {
      // Add dynamic animations
      const elements = document.querySelectorAll('.product-container > *')
      elements.forEach((el, index) => {
        (el as HTMLElement).style.animationDelay = `${index * 0.2}s`
      })
    })
  }

  private async startPromoAnimations(template: string): Promise<void> {
    if (!this.page) return

    if (template === 'countdown') {
      await this.page.evaluate(() => {
        let seconds = 86400 // 24 hours
        setInterval(() => {
          const hours = Math.floor(seconds / 3600)
          const minutes = Math.floor((seconds % 3600) / 60)
          const secs = seconds % 60
          const countdown = document.getElementById('countdown')
          if (countdown) {
            countdown.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
          }
          seconds--
        }, 1000)
      })
    }
  }

  private async captureFrames(duration: number, fps: number): Promise<Buffer[]> {
    if (!this.page) return []

    const frames: Buffer[] = []
    const totalFrames = duration * fps
    const frameInterval = 1000 / fps

    for (let i = 0; i < totalFrames; i++) {
      const screenshot = await this.page.screenshot({ type: 'png' })
      frames.push(screenshot)
      await new Promise(resolve => setTimeout(resolve, frameInterval))
    }

    return frames
  }

  private async framesToVideo(frames: Buffer[], config: VideoConfig): Promise<Buffer> {
    // In production, this would use ffmpeg to convert frames to video
    // For now, return a placeholder
    console.log(`Converting ${frames.length} frames to ${config.format} video`)
    
    // Placeholder: return first frame as "video"
    return frames[0] || Buffer.from('')
  }
}