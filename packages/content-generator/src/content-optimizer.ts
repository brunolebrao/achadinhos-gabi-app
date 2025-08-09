import sharp from 'sharp'
import { Platform, Dimensions, PLATFORM_DIMENSIONS } from './types'

export class ContentOptimizer {
  async optimizeForPlatform(
    buffer: Buffer,
    platform: Platform,
    format: string = 'post'
  ): Promise<Buffer> {
    const dimensions = PLATFORM_DIMENSIONS[platform][format]
    if (!dimensions) {
      throw new Error(`Invalid format ${format} for platform ${platform}`)
    }

    return await this.optimizeImage(buffer, dimensions, platform)
  }

  private async optimizeImage(
    buffer: Buffer,
    dimensions: Dimensions,
    platform: Platform
  ): Promise<Buffer> {
    let optimized = sharp(buffer)
      .resize(dimensions.width, dimensions.height, {
        fit: 'cover',
        position: 'center'
      })

    // Platform-specific optimizations
    switch (platform) {
      case 'instagram':
        // Instagram prefers JPEG with high quality
        return await optimized
          .jpeg({ quality: 95, progressive: true })
          .toBuffer()
      
      case 'tiktok':
        // TikTok handles various formats well
        return await optimized
          .jpeg({ quality: 90, progressive: true })
          .toBuffer()
      
      case 'whatsapp':
        // WhatsApp compresses images, so we optimize for smaller size
        return await optimized
          .jpeg({ quality: 85, progressive: true })
          .toBuffer()
      
      default:
        return await optimized
          .jpeg({ quality: 90, progressive: true })
          .toBuffer()
    }
  }

  async generateThumbnail(
    buffer: Buffer,
    width: number = 400,
    height: number = 400
  ): Promise<Buffer> {
    return await sharp(buffer)
      .resize(width, height, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toBuffer()
  }

  async addWatermark(
    buffer: Buffer,
    watermarkText: string,
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'bottom-right'
  ): Promise<Buffer> {
    const image = sharp(buffer)
    const metadata = await image.metadata()
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Could not get image dimensions')
    }

    // Create watermark SVG
    const watermark = Buffer.from(`
      <svg width="200" height="50">
        <text x="10" y="35" font-size="20" fill="white" opacity="0.7">
          ${watermarkText}
        </text>
      </svg>
    `)

    // Calculate position
    let left = 10
    let top = 10
    
    switch (position) {
      case 'top-right':
        left = metadata.width - 210
        break
      case 'bottom-left':
        top = metadata.height - 60
        break
      case 'bottom-right':
        left = metadata.width - 210
        top = metadata.height - 60
        break
    }

    return await image
      .composite([{
        input: watermark,
        left,
        top
      }])
      .toBuffer()
  }

  async batchOptimize(
    buffers: Buffer[],
    platform: Platform,
    format: string = 'post'
  ): Promise<Buffer[]> {
    return await Promise.all(
      buffers.map(buffer => this.optimizeForPlatform(buffer, platform, format))
    )
  }

  getOptimalSettings(platform: Platform): any {
    const settings = {
      instagram: {
        maxFileSize: 30 * 1024 * 1024, // 30MB
        formats: ['jpg', 'png'],
        videoFormats: ['mp4', 'mov'],
        maxVideoDuration: 60,
        aspectRatios: ['1:1', '4:5', '16:9']
      },
      tiktok: {
        maxFileSize: 287 * 1024 * 1024, // 287MB
        formats: ['mp4', 'mov', 'webm'],
        maxVideoDuration: 180,
        aspectRatios: ['9:16']
      },
      whatsapp: {
        maxFileSize: 16 * 1024 * 1024, // 16MB
        formats: ['jpg', 'png'],
        videoFormats: ['mp4'],
        maxVideoDuration: 90,
        aspectRatios: ['any']
      }
    }

    return settings[platform]
  }
}