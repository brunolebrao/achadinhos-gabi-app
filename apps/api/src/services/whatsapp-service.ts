import { SessionManager } from '@repo/whatsapp'
import { prisma } from '@repo/database'
import { FastifyInstance } from 'fastify'
import { EventEmitter } from 'events'

export class WhatsAppService extends EventEmitter {
  private sessionManager: SessionManager
  private fastify: FastifyInstance | null = null

  constructor() {
    super()
    
    this.sessionManager = new SessionManager('./sessions', {
      onQRCode: (qr, sessionId) => {
        console.log(`📱 QR Code generated for session ${sessionId}`)
        this.emit('qrcode', { sessionId, qr })
      },
      
      onReady: (sessionId) => {
        console.log(`✅ WhatsApp session ${sessionId} is ready`)
        this.emit('ready', { sessionId })
      },
      
      onDisconnected: (sessionId, reason) => {
        console.log(`❌ WhatsApp session ${sessionId} disconnected: ${reason}`)
        this.emit('disconnected', { sessionId, reason })
      },
      
      onAuthFailure: (sessionId, error) => {
        console.error(`🔐 Auth failure for session ${sessionId}: ${error}`)
        this.emit('auth-failure', { sessionId, error })
      },
      
      onMessage: (message, sessionId) => {
        console.log(`📩 New message in session ${sessionId}`)
        this.emit('message', { sessionId, message })
      }
    })
  }

  setFastify(fastify: FastifyInstance) {
    this.fastify = fastify
  }

  async initialize() {
    console.log('🚀 Initializing WhatsApp Service...')
    
    try {
      // Reset daily message counts if needed
      await this.resetDailyLimits()
      
      // Initialize existing sessions
      await this.sessionManager.initializeAllSessions()
      
      console.log('✅ WhatsApp Service initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize WhatsApp Service:', error)
      throw error
    }
  }

  async resetDailyLimits() {
    const now = new Date()
    const accounts = await prisma.whatsAppAccount.findMany({
      where: {
        lastResetAt: {
          lt: new Date(now.getFullYear(), now.getMonth(), now.getDate())
        }
      }
    })

    for (const account of accounts) {
      await prisma.whatsAppAccount.update({
        where: { id: account.id },
        data: {
          sentToday: 0,
          lastResetAt: now
        }
      })
    }

    console.log(`📊 Reset daily limits for ${accounts.length} accounts`)
  }

  async createSession(phoneNumber: string, name: string) {
    // Check if account already exists
    let account = await prisma.whatsAppAccount.findUnique({
      where: { phoneNumber }
    })

    if (!account) {
      account = await prisma.whatsAppAccount.create({
        data: {
          phoneNumber,
          name,
          isActive: true
        }
      })
    }

    await this.sessionManager.createSession(account.id, account.phoneNumber, account.name)
    return account
  }

  async getSession(sessionId: string) {
    return this.sessionManager.getSessionStatus(sessionId)
  }

  async getAllSessions() {
    return this.sessionManager.getAllSessions()
  }

  async destroySession(sessionId: string) {
    await this.sessionManager.destroySession(sessionId)
  }

  async sendMessage(sessionId: string, message: any) {
    return this.sessionManager.sendMessage(sessionId, message)
  }

  async getOptimalSession() {
    return this.sessionManager.getOptimalSession()
  }

  async broadcastMessage(message: any, recipients: string[]) {
    const results = []
    const sessionId = await this.getOptimalSession()
    
    if (!sessionId) {
      throw new Error('No available WhatsApp sessions')
    }

    for (const recipient of recipients) {
      const result = await this.sendMessage(sessionId, {
        ...message,
        to: recipient
      })
      
      results.push({
        recipient,
        ...result
      })
      
      // Add delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    return results
  }

  async getContacts(sessionId: string) {
    return this.sessionManager.getContacts(sessionId)
  }

  async getGroups(sessionId: string) {
    return this.sessionManager.getGroups(sessionId)
  }

  async shutdown() {
    console.log('🛑 Shutting down WhatsApp Service...')
    await this.sessionManager.destroyAllSessions()
  }
}

// Create singleton instance
export const whatsappService = new WhatsAppService()