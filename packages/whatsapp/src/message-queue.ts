import { prisma } from '@repo/database'
import { SessionManager } from './session-manager'
import { WhatsAppMessage } from './types'
import cron from 'node-cron'

export class MessageQueue {
  private sessionManager: SessionManager
  private isProcessing = false
  private processingInterval: NodeJS.Timeout | null = null

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager
  }

  start(): void {
    console.log('Starting WhatsApp message queue...')

    cron.schedule('* * * * *', async () => {
      if (!this.isProcessing) {
        await this.processMessages()
      }
    })

    cron.schedule('0 * * * *', async () => {
      await this.updateFailedMessages()
    })
  }

  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }
  }

  private async processMessages(): Promise<void> {
    this.isProcessing = true

    try {
      const now = new Date()
      const pendingMessages = await prisma.scheduledMessage.findMany({
        where: {
          status: 'PENDING',
          scheduledAt: { lte: now }
        },
        include: {
          product: true
        },
        orderBy: {
          scheduledAt: 'asc'
        },
        take: 10
      })

      for (const message of pendingMessages) {
        await this.processMessage(message)
        await this.delay(1000)
      }
    } catch (error) {
      console.error('Error processing messages:', error)
    } finally {
      this.isProcessing = false
    }
  }

  private async processMessage(scheduledMessage: any): Promise<void> {
    try {
      // Don't update status to SENDING since it doesn't exist in enum
      // We'll rely on the processing logic to update directly to SENT or FAILED

      let content = scheduledMessage.content
      let imageUrl: string | undefined

      if (scheduledMessage.product) {
        content = this.replaceProductVariables(content, scheduledMessage.product)
        imageUrl = scheduledMessage.product.imageUrl
      }

      const results = await this.sendToRecipients(
        scheduledMessage.recipients,
        content,
        scheduledMessage.recipientType,
        imageUrl
      )

      const allSuccessful = results.every(r => r.success)
      const errors = results.filter(r => !r.success).map(r => r.error).join('; ')

      await prisma.scheduledMessage.update({
        where: { id: scheduledMessage.id },
        data: {
          status: allSuccessful ? 'SENT' : 'FAILED',
          sentAt: new Date(),
          error: errors || null
        }
      })

      console.log(`Message ${scheduledMessage.id} processed: ${allSuccessful ? 'SUCCESS' : 'FAILED'}`)
    } catch (error) {
      console.error(`Failed to process message ${scheduledMessage.id}:`, error)
      
      await prisma.scheduledMessage.update({
        where: { id: scheduledMessage.id },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  private async sendToRecipients(
    recipients: string[],
    content: string,
    recipientType: string,
    imageUrl?: string
  ): Promise<Array<{ success: boolean; error?: string }>> {
    const results = []

    for (const recipient of recipients) {
      try {
        const sessionId = await this.sessionManager.getOptimalSession()
        
        if (!sessionId) {
          results.push({
            success: false,
            error: 'No available WhatsApp sessions'
          })
          continue
        }

        let chatId = recipient
        
        // Check if recipient already has @ format
        if (!recipient.includes('@')) {
          if (recipientType === 'GROUP') {
            chatId = `${recipient}@g.us`
            console.log(`[MessageQueue] Formatting group ID: ${recipient} -> ${chatId}`)
          } else if (recipientType === 'CONTACT') {
            chatId = `${recipient}@c.us`
            console.log(`[MessageQueue] Formatting contact ID: ${recipient} -> ${chatId}`)
          }
        } else {
          console.log(`[MessageQueue] Recipient already formatted: ${recipient} (type: ${recipientType})`)
        }

        // Create message based on whether we have an image
        const message: WhatsAppMessage = imageUrl ? {
          to: chatId,
          message: content,
          type: 'image',
          media: {
            url: imageUrl,
            caption: content
          }
        } : {
          to: chatId,
          message: content,
          type: 'text'
        }

        const result = await this.sessionManager.sendMessage(sessionId, message)
        results.push(result)

        if (result.success) {
          await this.updateContactLastSent(recipient, recipientType)
        }

        await this.delay(2000)
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return results
  }

  private replaceProductVariables(content: string, product: any): string {
    // Generate affiliate URL
    const affiliateUrl = this.generateAffiliateUrl(product)
    
    const variables: Record<string, string> = {
      title: product.title || '',
      price: product.price ? `R$ ${product.price.toFixed(2).replace('.', ',')}` : '',
      originalPrice: product.originalPrice ? `R$ ${product.originalPrice.toFixed(2).replace('.', ',')}` : '',
      discount: product.discount || '',
      productUrl: affiliateUrl,
      affiliateUrl: affiliateUrl,
      platform: product.platform || '',
      category: product.category || ''
    }

    let processedContent = content
    Object.entries(variables).forEach(([key, value]) => {
      processedContent = processedContent.replace(
        new RegExp(`{{${key}}}`, 'g'),
        value
      )
    })

    return processedContent
  }

  private generateAffiliateUrl(product: any): string {
    const url = product.productUrl
    if (!url) return ''
    
    const platform = product.platform?.toUpperCase()
    
    // Get affiliate IDs from environment variables
    const affiliateIds: Record<string, string | undefined> = {
      MERCADO_LIVRE: process.env.MERCADOLIVRE_AFFILIATE_ID,
      MERCADOLIVRE: process.env.MERCADOLIVRE_AFFILIATE_ID,
      SHOPEE: process.env.SHOPEE_AFFILIATE_ID,
      AMAZON: process.env.AMAZON_ASSOCIATE_TAG,
      ALIEXPRESS: process.env.ALIEXPRESS_AFFILIATE_ID
    }
    
    const affiliateId = affiliateIds[platform]
    if (!affiliateId) {
      return url
    }
    
    try {
      const urlObj = new URL(url)
      
      switch (platform) {
        case 'MERCADO_LIVRE':
        case 'MERCADOLIVRE':
          urlObj.searchParams.set('tracking_id', affiliateId)
          urlObj.searchParams.set('source', 'affiliate-profile')
          break
        case 'SHOPEE':
          urlObj.searchParams.set('af_id', affiliateId)
          urlObj.searchParams.set('af_type', 'cashback')
          break
        case 'AMAZON':
          urlObj.searchParams.set('tag', affiliateId)
          break
        case 'ALIEXPRESS':
          urlObj.searchParams.set('aff_fcid', affiliateId)
          urlObj.searchParams.set('aff_platform', 'promotion')
          break
      }
      
      return urlObj.toString()
    } catch (error) {
      console.error('[MessageQueue] Error generating affiliate URL:', error)
      return url
    }
  }

  private async updateContactLastSent(recipient: string, recipientType: string): Promise<void> {
    try {
      if (recipientType === 'CONTACT') {
        await prisma.contact.updateMany({
          where: { phoneNumber: recipient },
          data: {
            lastSentAt: new Date(),
            messageCount: { increment: 1 }
          }
        })
      } else if (recipientType === 'GROUP') {
        await prisma.group.updateMany({
          where: { groupId: recipient },
          data: {
            lastSentAt: new Date(),
            messageCount: { increment: 1 }
          }
        })
      }
    } catch (error) {
      console.error('Failed to update contact/group last sent:', error)
    }
  }

  private async updateFailedMessages(): Promise<void> {
    try {
      // Since we don't use SENDING status, we'll look for PENDING messages
      // that are overdue (more than 1 hour past their scheduled time)
      const oneHourAgo = new Date()
      oneHourAgo.setHours(oneHourAgo.getHours() - 1)

      const stalledMessages = await prisma.scheduledMessage.updateMany({
        where: {
          status: 'PENDING',
          scheduledAt: { lte: oneHourAgo }
        },
        data: {
          status: 'FAILED',
          error: 'Message sending timed out'
        }
      })

      if (stalledMessages.count > 0) {
        console.log(`Updated ${stalledMessages.count} stalled messages to FAILED`)
      }
    } catch (error) {
      console.error('Failed to update stalled messages:', error)
    }
  }

  async scheduleMessage(
    productId: string | null,
    content: string,
    recipients: string[],
    scheduledAt: Date,
    recipientType: 'CONTACT' | 'GROUP' | 'BROADCAST' = 'GROUP'
  ): Promise<string> {
    const message = await prisma.scheduledMessage.create({
      data: {
        productId,
        content,
        recipients,
        scheduledAt,
        recipientType,
        status: 'PENDING'
      }
    })

    return message.id
  }

  async scheduleProductMessage(
    productId: string,
    templateId: string,
    recipients: string[],
    scheduledAt: Date,
    recipientType: 'CONTACT' | 'GROUP' | 'BROADCAST' = 'GROUP'
  ): Promise<string> {
    const template = await prisma.template.findUnique({
      where: { id: templateId }
    })

    if (!template) {
      throw new Error('Template not found')
    }

    const message = await prisma.scheduledMessage.create({
      data: {
        productId,
        templateId,
        content: template.content,
        recipients,
        scheduledAt,
        recipientType,
        status: 'PENDING'
      }
    })

    return message.id
  }

  async cancelMessage(messageId: string): Promise<boolean> {
    try {
      const result = await prisma.scheduledMessage.updateMany({
        where: {
          id: messageId,
          status: 'PENDING'
        },
        data: {
          status: 'CANCELLED'
        }
      })

      return result.count > 0
    } catch (error) {
      console.error('Failed to cancel message:', error)
      return false
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}