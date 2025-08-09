import { prisma } from '@repo/database'
import { whatsappService } from '../services/whatsapp-service'

export class MessageWorker {
  private intervalId: NodeJS.Timeout | null = null
  private isProcessing = false
  private readonly PROCESS_INTERVAL = 30000 // 30 seconds
  private readonly BATCH_SIZE = 10

  constructor() {}

  start(): void {
    console.log('🚀 Starting Message Worker...')
    console.log(`📊 Processing interval: ${this.PROCESS_INTERVAL / 1000} seconds`)
    console.log(`📦 Batch size: ${this.BATCH_SIZE} messages per batch`)

    this.intervalId = setInterval(async () => {
      await this.processMessages()
    }, this.PROCESS_INTERVAL)

    // Process immediately on start
    setTimeout(() => this.processMessages(), 1000)
  }

  stop(): void {
    console.log('🛑 Stopping Message Worker...')
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private async processMessages(): Promise<void> {
    if (this.isProcessing) {
      console.log('⚠️  Message processing already in progress, skipping...')
      return
    }

    this.isProcessing = true

    try {
      // Get pending messages that should be processed
      const now = new Date()
      const pendingMessages = await prisma.scheduledMessage.findMany({
        where: {
          status: 'PENDING',
          scheduledAt: { lte: now }
        },
        include: {
          product: true
        },
        orderBy: { scheduledAt: 'asc' },
        take: this.BATCH_SIZE
      })

      if (pendingMessages.length === 0) {
        return // No messages to process
      }

      console.log(`📤 Processing ${pendingMessages.length} pending messages...`)

      for (const message of pendingMessages) {
        await this.processMessage(message)
      }

      console.log(`✅ Finished processing batch of ${pendingMessages.length} messages`)

    } catch (error) {
      console.error('❌ Error in message worker:', error)
    } finally {
      this.isProcessing = false
    }
  }

  private async processMessage(message: any): Promise<void> {
    try {
      console.log(`📤 Processing message ${message.id} with ${message.recipients.length} recipients`)
      
      // Get optimal WhatsApp session
      const sessionId = await whatsappService.getOptimalSession()
      
      if (!sessionId) {
        throw new Error('No available WhatsApp sessions')
      }

      // Send to each recipient
      const sendResults = []
      for (const recipient of message.recipients) {
        try {
          const result = await whatsappService.sendMessage(sessionId, {
            to: recipient,
            message: message.content,
            type: 'text'
          })
          
          sendResults.push({
            recipient,
            success: result.success,
            error: result.error
          })
          
          // Add small delay between messages to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000))
          
        } catch (error) {
          console.error(`Failed to send message to ${recipient}:`, error)
          sendResults.push({
            recipient,
            success: false,
            error: error.message
          })
        }
      }

      // Check if all sends were successful
      const allSuccessful = sendResults.every(r => r.success)
      const anySuccessful = sendResults.some(r => r.success)
      const now = new Date()

      if (allSuccessful) {
        // All messages sent successfully
        await prisma.scheduledMessage.update({
          where: { id: message.id },
          data: { 
            status: 'SENT', 
            sentAt: now,
            error: null
          }
        })
        
        console.log(`✅ Message ${message.id} sent successfully to all ${message.recipients.length} recipients`)

      } else if (anySuccessful) {
        // Some messages sent, some failed - mark as partially sent
        const failedCount = sendResults.filter(r => !r.success).length
        await prisma.scheduledMessage.update({
          where: { id: message.id },
          data: { 
            status: 'FAILED', 
            error: `Partial failure: ${failedCount} of ${sendResults.length} failed`
          }
        })
        
        console.log(`⚠️  Message ${message.id} partially sent: ${sendResults.filter(r => r.success).length}/${sendResults.length} successful`)

      } else {
        // All messages failed
        await prisma.scheduledMessage.update({
          where: { id: message.id },
          data: { 
            status: 'FAILED',
            error: `All sends failed: ${sendResults[0]?.error || 'Unknown error'}`
          }
        })
        
        console.log(`❌ Message ${message.id} failed to send to all recipients: ${sendResults[0]?.error}`)
      }

    } catch (error) {
      console.error(`❌ Failed to process message ${message.id}:`, error)
      
      // Mark message as failed
      await prisma.scheduledMessage.update({
        where: { id: message.id },
        data: { 
          status: 'FAILED',
          error: error.message || 'Unknown processing error'
        }
      })
    }
  }

  async getStats(): Promise<any> {
    const [pendingCount, failedCount, sentToday] = await Promise.all([
      prisma.scheduledMessage.count({
        where: { status: 'PENDING' }
      }),
      prisma.scheduledMessage.count({
        where: { status: 'FAILED' }
      }),
      prisma.scheduledMessage.count({
        where: { 
          status: 'SENT',
          sentAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ])

    return {
      isRunning: this.intervalId !== null,
      isProcessing: this.isProcessing,
      pendingMessages: pendingCount,
      failedMessages: failedCount,
      sentToday,
      processInterval: this.PROCESS_INTERVAL / 1000,
      batchSize: this.BATCH_SIZE
    }
  }
}

// Create singleton instance
export const messageWorker = new MessageWorker()