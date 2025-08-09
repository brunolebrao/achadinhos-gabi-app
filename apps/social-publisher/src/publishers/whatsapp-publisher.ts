import { PrismaClient } from '@repo/database'
import { WhatsAppClient } from '@repo/whatsapp'
import { logger } from '../utils/logger'

export class WhatsAppPublisher {
  private prisma: PrismaClient
  private whatsappClient: WhatsAppClient | null = null

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async initialize(): Promise<void> {
    // Initialize WhatsApp client
    this.whatsappClient = new WhatsAppClient({
      sessionPath: process.env.WHATSAPP_SESSION_PATH || './sessions'
    })

    await this.whatsappClient.initialize()
    logger.info('WhatsApp client initialized')
  }

  async publish(content: any): Promise<any> {
    if (!this.whatsappClient) {
      throw new Error('WhatsApp client not initialized')
    }

    const results: any[] = []

    // Send to groups
    if (content.groups && content.groups.length > 0) {
      for (const groupId of content.groups) {
        try {
          await this.whatsappClient.sendMessage(groupId, content.message, {
            mediaUrl: content.mediaUrl
          })
          
          results.push({
            recipient: groupId,
            type: 'group',
            status: 'sent'
          })

          // Update group stats
          await this.prisma.group.update({
            where: { groupId },
            data: {
              lastSentAt: new Date(),
              messageCount: { increment: 1 }
            }
          })
        } catch (error) {
          logger.error(`Failed to send to group ${groupId}:`, error)
          results.push({
            recipient: groupId,
            type: 'group',
            status: 'failed',
            error: error.message
          })
        }
      }
    }

    // Send to contacts
    if (content.contacts && content.contacts.length > 0) {
      for (const contactNumber of content.contacts) {
        try {
          await this.whatsappClient.sendMessage(contactNumber, content.message, {
            mediaUrl: content.mediaUrl
          })
          
          results.push({
            recipient: contactNumber,
            type: 'contact',
            status: 'sent'
          })

          // Update contact stats
          await this.prisma.contact.update({
            where: { phoneNumber: contactNumber },
            data: {
              lastSentAt: new Date(),
              messageCount: { increment: 1 }
            }
          })
        } catch (error) {
          logger.error(`Failed to send to contact ${contactNumber}:`, error)
          results.push({
            recipient: contactNumber,
            type: 'contact',
            status: 'failed',
            error: error.message
          })
        }
      }
    }

    return {
      platform: 'whatsapp',
      results,
      totalSent: results.filter(r => r.status === 'sent').length,
      totalFailed: results.filter(r => r.status === 'failed').length
    }
  }

  async sendBroadcast(message: string, recipients: string[]): Promise<any> {
    if (!this.whatsappClient) {
      throw new Error('WhatsApp client not initialized')
    }

    const results: any[] = []

    for (const recipient of recipients) {
      try {
        await this.whatsappClient.sendMessage(recipient, message)
        results.push({ recipient, status: 'sent' })
      } catch (error) {
        logger.error(`Failed to send to ${recipient}:`, error)
        results.push({ recipient, status: 'failed', error: error.message })
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return {
      platform: 'whatsapp',
      type: 'broadcast',
      results,
      totalSent: results.filter(r => r.status === 'sent').length,
      totalFailed: results.filter(r => r.status === 'failed').length
    }
  }

  async getStatus(): Promise<any> {
    if (!this.whatsappClient) {
      return { connected: false }
    }

    return await this.whatsappClient.getStatus()
  }

  async disconnect(): Promise<void> {
    if (this.whatsappClient) {
      await this.whatsappClient.disconnect()
      logger.info('WhatsApp client disconnected')
    }
  }
}