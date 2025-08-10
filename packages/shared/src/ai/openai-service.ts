import OpenAI from 'openai'

export interface Product {
  title: string
  price: number
  originalPrice?: number
  discount?: string
  category: string
  platform: string
  description?: string
  imageUrl?: string
}

export interface ContentGenerationOptions {
  product: Product
  platform: 'whatsapp' | 'instagram' | 'tiktok' | 'telegram'
  contentType: 'post' | 'story' | 'reel' | 'message'
  tone?: 'casual' | 'professional' | 'enthusiastic' | 'urgent'
  includeEmojis?: boolean
  maxLength?: number
  language?: string
}

export interface HashtagGenerationOptions {
  product: Product
  platform: 'instagram' | 'tiktok'
  maxHashtags?: number
  includeTrending?: boolean
  category?: string
}

export class OpenAIService {
  private client: OpenAI
  private model: string

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  }

  async generateCaption(options: ContentGenerationOptions): Promise<string> {
    try {
      const prompt = this.buildCaptionPrompt(options)
      
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(options.platform, options.contentType)
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
        max_tokens: options.maxLength || 500
      })

      const caption = completion.choices[0]?.message?.content || ''
      return this.sanitizeCaption(caption, options)
    } catch (error) {
      console.error('Failed to generate caption:', error)
      throw new Error('AI caption generation failed')
    }
  }

  async generateHashtags(options: HashtagGenerationOptions): Promise<string[]> {
    try {
      const prompt = this.buildHashtagPrompt(options)
      
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a social media hashtag expert. Generate relevant, trending hashtags for product promotions. Return only hashtags, one per line, without # symbol.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.6,
        max_tokens: 200
      })

      const response = completion.choices[0]?.message?.content || ''
      return this.parseHashtags(response, options.maxHashtags)
    } catch (error) {
      console.error('Failed to generate hashtags:', error)
      throw new Error('AI hashtag generation failed')
    }
  }

  async optimizeContentForPlatform(
    content: string, 
    fromPlatform: string, 
    toPlatform: string
  ): Promise<string> {
    try {
      const prompt = `
        Adapt this ${fromPlatform} content for ${toPlatform}:
        
        "${content}"
        
        Consider platform-specific requirements:
        - Character limits
        - Tone and style
        - Hashtag usage
        - Call-to-action format
        
        Return only the adapted content.
      `

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a multi-platform social media expert. Adapt content while maintaining the core message and promotional value.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })

      return completion.choices[0]?.message?.content || content
    } catch (error) {
      console.error('Failed to optimize content:', error)
      return content // Return original if optimization fails
    }
  }

  async suggestBestPostingTime(
    platform: string,
    targetAudience: string,
    timezone: string = 'America/Sao_Paulo'
  ): Promise<string[]> {
    try {
      const prompt = `
        Suggest the 3 best times to post on ${platform} for ${targetAudience} audience in ${timezone} timezone.
        
        Consider:
        - Peak engagement hours
        - Audience behavior patterns
        - Platform-specific algorithms
        
        Return times in 24h format (HH:MM), one per line.
      `

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a social media timing expert with deep knowledge of platform algorithms and user behavior patterns.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 100
      })

      const response = completion.choices[0]?.message?.content || ''
      return response.split('\n').filter(time => time.match(/\d{1,2}:\d{2}/))
    } catch (error) {
      console.error('Failed to suggest posting times:', error)
      // Return default times if AI fails
      return ['09:00', '12:00', '19:00']
    }
  }

  async analyzeProductForVirality(product: Product): Promise<number> {
    try {
      const prompt = `
        Analyze this product's viral potential on a scale of 1-100:
        
        Title: ${product.title}
        Price: R$ ${product.price}
        Original Price: R$ ${product.originalPrice || product.price}
        Discount: ${product.discount || '0%'}
        Category: ${product.category}
        Platform: ${product.platform}
        
        Consider:
        - Price attractiveness
        - Discount percentage
        - Product category popularity
        - Seasonal relevance
        - General appeal
        
        Return only a number between 1-100.
      `

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a viral marketing expert. Analyze products for their viral potential based on market trends and consumer psychology.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 10
      })

      const response = completion.choices[0]?.message?.content || '50'
      const score = parseInt(response.replace(/\D/g, ''))
      return isNaN(score) ? 50 : Math.min(100, Math.max(1, score))
    } catch (error) {
      console.error('Failed to analyze virality:', error)
      return 50 // Return neutral score if analysis fails
    }
  }

  private getSystemPrompt(platform: string, contentType: string): string {
    const prompts: Record<string, string> = {
      'whatsapp-message': 'You are a WhatsApp marketing expert. Create concise, engaging messages with emojis that drive immediate action. Keep it personal and conversational.',
      'instagram-post': 'You are an Instagram content creator. Write engaging captions that tell a story, include a clear call-to-action, and work well with visual content.',
      'instagram-story': 'You are an Instagram Stories specialist. Create brief, punchy text that works as an overlay on images/videos. Maximum 100 characters.',
      'instagram-reel': 'You are an Instagram Reels expert. Write catchy, trendy captions that hook viewers and encourage engagement. Include trending sounds references when relevant.',
      'tiktok-post': 'You are a TikTok content creator. Write fun, trendy captions using Gen Z language and current memes. Keep it authentic and entertaining.',
      'telegram-message': 'You are a Telegram channel manager. Write informative yet concise messages that provide value and encourage sharing.'
    }

    return prompts[`${platform}-${contentType}`] || prompts['instagram-post']
  }

  private buildCaptionPrompt(options: ContentGenerationOptions): string {
    const { product, includeEmojis, tone, language } = options
    
    let prompt = `Create a ${tone || 'enthusiastic'} promotional caption for this product:\n\n`
    prompt += `Product: ${product.title}\n`
    prompt += `Price: R$ ${product.price.toFixed(2)}\n`
    
    if (product.originalPrice && product.originalPrice > product.price) {
      const discount = Math.round((1 - product.price / product.originalPrice) * 100)
      prompt += `Original Price: R$ ${product.originalPrice.toFixed(2)}\n`
      prompt += `Discount: ${discount}% OFF\n`
    }
    
    prompt += `Category: ${product.category}\n`
    prompt += `Store: ${product.platform}\n\n`
    
    prompt += `Requirements:\n`
    prompt += `- Language: ${language || 'Portuguese (Brazil)'}\n`
    prompt += `- Include emojis: ${includeEmojis !== false ? 'Yes' : 'No'}\n`
    prompt += `- Maximum length: ${options.maxLength || 500} characters\n`
    prompt += `- Include a clear call-to-action\n`
    prompt += `- Highlight the discount/deal if significant\n`
    
    return prompt
  }

  private buildHashtagPrompt(options: HashtagGenerationOptions): string {
    const { product, maxHashtags, includeTrending, category } = options
    
    let prompt = `Generate ${maxHashtags || 10} hashtags for this product:\n\n`
    prompt += `Product: ${product.title}\n`
    prompt += `Category: ${category || product.category}\n`
    prompt += `Store: ${product.platform}\n`
    prompt += `Platform: ${options.platform}\n\n`
    
    if (product.discount) {
      prompt += `Discount: ${product.discount}\n`
    }
    
    prompt += `Requirements:\n`
    prompt += `- Mix of specific and general hashtags\n`
    prompt += `- Include Portuguese and English hashtags\n`
    
    if (includeTrending) {
      prompt += `- Include trending hashtags for ${options.platform}\n`
    }
    
    prompt += `- Relevant to Brazilian market\n`
    prompt += `- Mix of high and medium competition hashtags\n`
    
    return prompt
  }

  private sanitizeCaption(caption: string, options: ContentGenerationOptions): string {
    // Remove quotes if present
    caption = caption.replace(/^["']|["']$/g, '')
    
    // Ensure maximum length
    if (options.maxLength && caption.length > options.maxLength) {
      caption = caption.substring(0, options.maxLength - 3) + '...'
    }
    
    // Add line breaks for better readability
    if (options.platform === 'instagram' || options.platform === 'whatsapp') {
      // Add line breaks after sentences for better formatting
      caption = caption.replace(/([.!?])\s+/g, '$1\n\n')
    }
    
    return caption.trim()
  }

  private parseHashtags(response: string, maxHashtags?: number): string[] {
    const hashtags = response
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(tag => tag.replace(/^#/, '')) // Remove # if present
      .filter(tag => tag.match(/^[a-zA-Z0-9_À-ÿ]+$/)) // Valid hashtag characters
    
    if (maxHashtags && hashtags.length > maxHashtags) {
      return hashtags.slice(0, maxHashtags)
    }
    
    return hashtags
  }

  async generateProductDescription(product: Product): Promise<string> {
    try {
      const prompt = `
        Write a compelling product description for:
        
        ${product.title}
        Category: ${product.category}
        Price: R$ ${product.price}
        ${product.discount ? `Discount: ${product.discount}` : ''}
        
        Make it SEO-friendly, highlight key benefits, and keep it under 200 words.
        Write in Portuguese (Brazil).
      `

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an e-commerce copywriter specializing in product descriptions that convert.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      })

      return completion.choices[0]?.message?.content || ''
    } catch (error) {
      console.error('Failed to generate product description:', error)
      throw new Error('AI description generation failed')
    }
  }
}