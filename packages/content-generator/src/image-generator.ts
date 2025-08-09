import { createCanvas, loadImage, registerFont, Canvas, CanvasRenderingContext2D } from 'canvas'
import sharp from 'sharp'
import { ProductCard, Dimensions, Platform, PLATFORM_DIMENSIONS } from './types'

export class ImageGenerator {
  private canvas: Canvas | null = null
  private ctx: CanvasRenderingContext2D | null = null

  async generateProductCard(
    product: ProductCard,
    platform: Platform,
    format: string = 'post'
  ): Promise<Buffer> {
    try {
      const dimensions = PLATFORM_DIMENSIONS[platform][format]
      if (!dimensions) {
        throw new Error(`Invalid format ${format} for platform ${platform}`)
      }

      // Create canvas
      this.canvas = createCanvas(dimensions.width, dimensions.height)
      this.ctx = this.canvas.getContext('2d')

      // Set background
      await this.setBackground('#ffffff')

      // Load and draw product image
      await this.drawProductImage(product.imageUrl, dimensions)

      // Draw price badge
      await this.drawPriceBadge(product, dimensions)

      // Draw discount badge if applicable
      if (product.discount) {
        await this.drawDiscountBadge(product.discount, dimensions)
      }

      // Draw title
      await this.drawTitle(product.title, dimensions)

      // Draw brand if available
      if (product.brand) {
        await this.drawBrand(product.brand, dimensions)
      }

      // Draw rating if available
      if (product.rating) {
        await this.drawRating(product.rating, dimensions)
      }

      // Convert to buffer
      return this.canvas.toBuffer('image/png')
    } catch (error) {
      console.error('Failed to generate product card:', error)
      throw error
    }
  }

  async generateBatchCards(
    products: ProductCard[],
    platform: Platform,
    format: string = 'post'
  ): Promise<Buffer[]> {
    const cards: Buffer[] = []
    
    for (const product of products) {
      const card = await this.generateProductCard(product, platform, format)
      cards.push(card)
    }

    return cards
  }

  async generateCarousel(
    products: ProductCard[],
    platform: Platform
  ): Promise<Buffer[]> {
    const dimensions = PLATFORM_DIMENSIONS[platform]['post']
    const slides: Buffer[] = []

    // First slide: Title slide
    const titleSlide = await this.generateTitleSlide(
      'Ofertas Imperdíveis!',
      products.length,
      dimensions
    )
    slides.push(titleSlide)

    // Product slides
    for (const product of products.slice(0, 9)) {
      const slide = await this.generateProductCard(product, platform, 'post')
      slides.push(slide)
    }

    return slides
  }

  async generateCollage(
    products: ProductCard[],
    platform: Platform,
    layout: '2x2' | '3x3' | '1x3' = '2x2'
  ): Promise<Buffer> {
    const dimensions = PLATFORM_DIMENSIONS[platform]['post']
    this.canvas = createCanvas(dimensions.width, dimensions.height)
    this.ctx = this.canvas.getContext('2d')

    await this.setBackground('#f5f5f5')

    const gridConfig = {
      '2x2': { cols: 2, rows: 2, max: 4 },
      '3x3': { cols: 3, rows: 3, max: 9 },
      '1x3': { cols: 1, rows: 3, max: 3 }
    }

    const config = gridConfig[layout]
    const cellWidth = dimensions.width / config.cols
    const cellHeight = dimensions.height / config.rows
    const padding = 10

    for (let i = 0; i < Math.min(products.length, config.max); i++) {
      const row = Math.floor(i / config.cols)
      const col = i % config.cols
      const x = col * cellWidth + padding
      const y = row * cellHeight + padding
      
      await this.drawProductCell(
        products[i],
        x,
        y,
        cellWidth - padding * 2,
        cellHeight - padding * 2
      )
    }

    return this.canvas.toBuffer('image/png')
  }

  private async setBackground(color: string | Buffer): Promise<void> {
    if (!this.ctx || !this.canvas) return

    if (typeof color === 'string') {
      this.ctx.fillStyle = color
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    } else {
      const image = await loadImage(color)
      this.ctx.drawImage(image, 0, 0, this.canvas.width, this.canvas.height)
    }
  }

  private async drawProductImage(
    imageUrl: string,
    dimensions: Dimensions
  ): Promise<void> {
    if (!this.ctx) return

    try {
      // For remote URLs, we would fetch the image
      // For now, we'll create a placeholder
      const imageHeight = dimensions.height * 0.6
      const imageY = dimensions.height * 0.1
      
      this.ctx.fillStyle = '#e0e0e0'
      this.ctx.fillRect(0, imageY, dimensions.width, imageHeight)
      
      // Draw placeholder text
      this.ctx.fillStyle = '#666'
      this.ctx.font = '24px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('Product Image', dimensions.width / 2, imageY + imageHeight / 2)
    } catch (error) {
      console.error('Failed to draw product image:', error)
    }
  }

  private async drawPriceBadge(
    product: ProductCard,
    dimensions: Dimensions
  ): Promise<void> {
    if (!this.ctx) return

    const badgeX = dimensions.width * 0.1
    const badgeY = dimensions.height * 0.72
    const badgeWidth = dimensions.width * 0.35
    const badgeHeight = 80

    // Draw badge background
    this.ctx.fillStyle = '#4CAF50'
    this.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 10)
    this.ctx.fill()

    // Draw price
    this.ctx.fillStyle = '#ffffff'
    this.ctx.font = 'bold 36px Arial'
    this.ctx.textAlign = 'left'
    this.ctx.fillText(
      `R$ ${product.price.toFixed(2)}`,
      badgeX + 15,
      badgeY + 50
    )

    // Draw original price if available
    if (product.originalPrice) {
      this.ctx.font = '18px Arial'
      this.ctx.fillStyle = '#cccccc'
      this.ctx.textAlign = 'left'
      
      const originalText = `R$ ${product.originalPrice.toFixed(2)}`
      this.ctx.fillText(originalText, badgeX + 15, badgeY + 75)
      
      // Strike through
      this.ctx.strokeStyle = '#cccccc'
      this.ctx.lineWidth = 2
      this.ctx.beginPath()
      this.ctx.moveTo(badgeX + 15, badgeY + 72)
      this.ctx.lineTo(badgeX + 15 + this.ctx.measureText(originalText).width, badgeY + 72)
      this.ctx.stroke()
    }
  }

  private async drawDiscountBadge(
    discount: string,
    dimensions: Dimensions
  ): Promise<void> {
    if (!this.ctx) return

    const badgeSize = 100
    const badgeX = dimensions.width - badgeSize - 30
    const badgeY = 30

    // Draw circular badge
    this.ctx.fillStyle = '#FF5722'
    this.ctx.beginPath()
    this.ctx.arc(badgeX + badgeSize/2, badgeY + badgeSize/2, badgeSize/2, 0, Math.PI * 2)
    this.ctx.fill()

    // Draw discount text
    this.ctx.fillStyle = '#ffffff'
    this.ctx.font = 'bold 28px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText(discount, badgeX + badgeSize/2, badgeY + badgeSize/2 + 10)
  }

  private async drawTitle(
    title: string,
    dimensions: Dimensions
  ): Promise<void> {
    if (!this.ctx) return

    this.ctx.fillStyle = '#333333'
    this.ctx.font = '28px Arial'
    this.ctx.textAlign = 'center'
    
    // Wrap text if too long
    const maxWidth = dimensions.width * 0.9
    const words = title.split(' ')
    let line = ''
    let y = dimensions.height * 0.85

    for (const word of words) {
      const testLine = line + word + ' '
      const metrics = this.ctx.measureText(testLine)
      
      if (metrics.width > maxWidth && line !== '') {
        this.ctx.fillText(line, dimensions.width / 2, y)
        line = word + ' '
        y += 35
      } else {
        line = testLine
      }
    }
    
    this.ctx.fillText(line, dimensions.width / 2, y)
  }

  private async drawBrand(
    brand: string,
    dimensions: Dimensions
  ): Promise<void> {
    if (!this.ctx) return

    this.ctx.fillStyle = '#666666'
    this.ctx.font = '20px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText(brand.toUpperCase(), dimensions.width / 2, dimensions.height * 0.95)
  }

  private async drawRating(
    rating: number,
    dimensions: Dimensions
  ): Promise<void> {
    if (!this.ctx) return

    const starSize = 20
    const startX = dimensions.width * 0.55
    const startY = dimensions.height * 0.75

    for (let i = 0; i < 5; i++) {
      this.ctx.fillStyle = i < Math.floor(rating) ? '#FFD700' : '#CCCCCC'
      this.drawStar(startX + i * (starSize + 5), startY, starSize)
    }

    // Draw rating number
    this.ctx.fillStyle = '#333333'
    this.ctx.font = '18px Arial'
    this.ctx.textAlign = 'left'
    this.ctx.fillText(rating.toFixed(1), startX + 5 * (starSize + 5) + 10, startY + 5)
  }

  private async drawProductCell(
    product: ProductCard,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<void> {
    if (!this.ctx) return

    // Draw cell background
    this.ctx.fillStyle = '#ffffff'
    this.roundRect(x, y, width, height, 5)
    this.ctx.fill()

    // Draw product image placeholder
    this.ctx.fillStyle = '#e0e0e0'
    this.ctx.fillRect(x + 5, y + 5, width - 10, height * 0.6)

    // Draw price
    this.ctx.fillStyle = '#4CAF50'
    this.ctx.font = 'bold 18px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText(
      `R$ ${product.price.toFixed(2)}`,
      x + width / 2,
      y + height * 0.8
    )

    // Draw title (truncated)
    this.ctx.fillStyle = '#333333'
    this.ctx.font = '14px Arial'
    const truncatedTitle = product.title.length > 20 
      ? product.title.substring(0, 20) + '...'
      : product.title
    this.ctx.fillText(truncatedTitle, x + width / 2, y + height * 0.95)
  }

  private async generateTitleSlide(
    title: string,
    productCount: number,
    dimensions: Dimensions
  ): Promise<Buffer> {
    this.canvas = createCanvas(dimensions.width, dimensions.height)
    this.ctx = this.canvas.getContext('2d')

    // Gradient background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, dimensions.height)
    gradient.addColorStop(0, '#667eea')
    gradient.addColorStop(1, '#764ba2')
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    // Title
    this.ctx.fillStyle = '#ffffff'
    this.ctx.font = 'bold 64px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText(title, dimensions.width / 2, dimensions.height / 2)

    // Subtitle
    this.ctx.font = '32px Arial'
    this.ctx.fillText(
      `${productCount} produtos selecionados`,
      dimensions.width / 2,
      dimensions.height / 2 + 80
    )

    return this.canvas.toBuffer('image/png')
  }

  private roundRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    if (!this.ctx) return

    this.ctx.beginPath()
    this.ctx.moveTo(x + radius, y)
    this.ctx.lineTo(x + width - radius, y)
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    this.ctx.lineTo(x + width, y + height - radius)
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    this.ctx.lineTo(x + radius, y + height)
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    this.ctx.lineTo(x, y + radius)
    this.ctx.quadraticCurveTo(x, y, x + radius, y)
    this.ctx.closePath()
  }

  private drawStar(x: number, y: number, size: number): void {
    if (!this.ctx) return

    const spikes = 5
    const outerRadius = size / 2
    const innerRadius = size / 4
    
    this.ctx.beginPath()
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius
      const angle = (i * Math.PI) / spikes - Math.PI / 2
      const starX = x + Math.cos(angle) * radius
      const starY = y + Math.sin(angle) * radius
      
      if (i === 0) {
        this.ctx.moveTo(starX, starY)
      } else {
        this.ctx.lineTo(starX, starY)
      }
    }
    this.ctx.closePath()
    this.ctx.fill()
  }

  async optimizeImage(buffer: Buffer, quality: number = 85): Promise<Buffer> {
    return await sharp(buffer)
      .jpeg({ quality })
      .toBuffer()
  }

  async resizeImage(
    buffer: Buffer,
    width: number,
    height: number,
    fit: 'cover' | 'contain' | 'fill' = 'cover'
  ): Promise<Buffer> {
    return await sharp(buffer)
      .resize(width, height, { fit })
      .toBuffer()
  }
}