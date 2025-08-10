import { WhatsAppClient } from './whatsapp-client'
import { prisma } from '@repo/database'
import { 
  WhatsAppSession, 
  WhatsAppMessage, 
  WhatsAppMessageResult,
  SessionEventHandlers,
  WhatsAppClientConfig
} from './types'
import { ChromeDetector } from './utils/chrome-detector'
import path from 'path'
import QRCode from 'qrcode'

export class SessionManager {
  private sessions = new Map<string, WhatsAppClient>()
  private qrCodes = new Map<string, string>()
  private sessionPath: string
  private eventHandlers: SessionEventHandlers

  constructor(sessionPath: string = './sessions', eventHandlers: SessionEventHandlers = {}) {
    this.sessionPath = path.resolve(sessionPath)
    this.eventHandlers = eventHandlers
  }

  async initializeAllSessions(): Promise<void> {
    console.log('Initializing all WhatsApp sessions...')

    const accounts = await prisma.whatsAppAccount.findMany({
      where: { isActive: true }
    })

    for (const account of accounts) {
      try {
        await this.createSession(account.id, account.phoneNumber, account.name)
      } catch (error) {
        console.error(`Failed to initialize session for ${account.phoneNumber}:`, error)
      }
    }
  }

  async createSession(accountId: string, phoneNumber: string, name: string): Promise<void> {
    if (this.sessions.has(accountId)) {
      console.log(`Session ${accountId} already exists`)
      return
    }

    // Get dynamic Puppeteer configuration
    const puppeteerOptions = await ChromeDetector.getRecommendedPuppeteerOptions()

    const config: WhatsAppClientConfig = {
      sessionId: accountId,
      sessionPath: this.sessionPath,
      qrMaxRetries: 3,
      restartOnAuthFail: true,
      puppeteerOptions
    }

    const handlers: SessionEventHandlers = {
      onQRCode: async (qr: string, sessionId: string) => {
        try {
          const qrCodeDataURL = await QRCode.toDataURL(qr)
          this.qrCodes.set(sessionId, qrCodeDataURL)
          
          await prisma.whatsAppAccount.update({
            where: { id: sessionId },
            data: { 
              isConnected: false,
              sessionData: { qrCode: qrCodeDataURL }
            }
          })

          this.eventHandlers.onQRCode?.(qr, sessionId)
        } catch (error) {
          console.error(`Failed to generate QR code for ${sessionId}:`, error)
        }
      },

      onReady: async (sessionId: string) => {
        try {
          const client = this.sessions.get(sessionId)
          const info = await client?.getInfo()

          await prisma.whatsAppAccount.update({
            where: { id: sessionId },
            data: { 
              isConnected: true,
              sessionData: info ? JSON.parse(JSON.stringify(info)) : null
            }
          })

          this.qrCodes.delete(sessionId)
          this.eventHandlers.onReady?.(sessionId)
        } catch (error) {
          console.error(`Failed to update session ${sessionId} on ready:`, error)
        }
      },

      onDisconnected: async (sessionId: string, reason: string) => {
        try {
          await prisma.whatsAppAccount.update({
            where: { id: sessionId },
            data: { 
              isConnected: false,
              sessionData: { disconnectedReason: reason }
            }
          })

          this.eventHandlers.onDisconnected?.(sessionId, reason)

          if (config.restartOnAuthFail) {
            setTimeout(() => {
              console.log(`Attempting to restart session ${sessionId}...`)
              this.restartSession(sessionId)
            }, 30000)
          }
        } catch (error) {
          console.error(`Failed to update session ${sessionId} on disconnect:`, error)
        }
      },

      onAuthFailure: async (sessionId: string, error: string) => {
        try {
          await prisma.whatsAppAccount.update({
            where: { id: sessionId },
            data: { 
              isConnected: false,
              sessionData: { authError: error }
            }
          })

          this.eventHandlers.onAuthFailure?.(sessionId, error)
        } catch (dbError) {
          console.error(`Failed to update session ${sessionId} on auth failure:`, dbError)
        }
      },

      onMessage: (message: any, sessionId: string) => {
        this.eventHandlers.onMessage?.(message, sessionId)
      }
    }

    const client = new WhatsAppClient(config, handlers)
    this.sessions.set(accountId, client)

    try {
      await client.initialize()
    } catch (error) {
      console.error(`Failed to initialize client for ${accountId}:`, error)
      this.sessions.delete(accountId)
      throw error
    }
  }

  async restartSession(sessionId: string): Promise<void> {
    console.log(`Restarting session: ${sessionId}`)
    
    const existingClient = this.sessions.get(sessionId)
    if (existingClient) {
      await existingClient.destroy()
      this.sessions.delete(sessionId)
    }

    const account = await prisma.whatsAppAccount.findUnique({
      where: { id: sessionId }
    })

    if (account && account.isActive) {
      await this.createSession(account.id, account.phoneNumber, account.name)
    }
  }

  async sendMessage(sessionId: string, message: WhatsAppMessage): Promise<WhatsAppMessageResult> {
    const client = this.sessions.get(sessionId)
    
    if (!client) {
      return {
        success: false,
        error: 'Session not found',
        timestamp: new Date()
      }
    }

    if (!client.connected) {
      return {
        success: false,
        error: 'Session not connected',
        timestamp: new Date()
      }
    }

    const account = await prisma.whatsAppAccount.findUnique({
      where: { id: sessionId }
    })

    if (!account) {
      return {
        success: false,
        error: 'Account not found',
        timestamp: new Date()
      }
    }

    if (account.sentToday >= account.dailyLimit) {
      return {
        success: false,
        error: 'Daily message limit reached',
        timestamp: new Date()
      }
    }

    const result = await client.sendMessage(message)

    if (result.success) {
      await prisma.whatsAppAccount.update({
        where: { id: sessionId },
        data: { sentToday: { increment: 1 } }
      })
    }

    return result
  }

  async getSessionStatus(sessionId: string): Promise<WhatsAppSession | null> {
    const client = this.sessions.get(sessionId)
    const account = await prisma.whatsAppAccount.findUnique({
      where: { id: sessionId }
    })

    if (!account) {
      return null
    }

    return {
      id: sessionId,
      name: account.name,
      phoneNumber: account.phoneNumber,
      isConnected: client?.connected || false,
      qrCode: this.qrCodes.get(sessionId)
    }
  }

  async getAllSessions(): Promise<WhatsAppSession[]> {
    // Fetch all accounts in a single query
    const accounts = await prisma.whatsAppAccount.findMany({
      where: { isActive: true }
    })

    // Build sessions array using in-memory data
    const sessions: WhatsAppSession[] = accounts.map(account => {
      const client = this.sessions.get(account.id)
      return {
        id: account.id,
        name: account.name,
        phoneNumber: account.phoneNumber,
        isConnected: client?.connected || false,
        qrCode: this.qrCodes.get(account.id)
      }
    })

    return sessions
  }

  async destroySession(sessionId: string): Promise<void> {
    const client = this.sessions.get(sessionId)
    if (client) {
      await client.destroy()
      this.sessions.delete(sessionId)
    }
    this.qrCodes.delete(sessionId)

    await prisma.whatsAppAccount.update({
      where: { id: sessionId },
      data: { isConnected: false }
    })
  }

  async destroyAllSessions(): Promise<void> {
    console.log('Destroying all WhatsApp sessions...')
    
    const sessionIds = Array.from(this.sessions.keys())
    for (const sessionId of sessionIds) {
      await this.destroySession(sessionId)
    }
  }

  getAvailableSessions(): string[] {
    return Array.from(this.sessions.keys()).filter(id => {
      const client = this.sessions.get(id)
      return client?.connected
    })
  }

  async getOptimalSession(): Promise<string | null> {
    const availableAccounts = await prisma.whatsAppAccount.findMany({
      where: {
        isActive: true,
        isConnected: true
      },
      orderBy: {
        sentToday: 'asc'
      }
    })

    for (const account of availableAccounts) {
      if (account.sentToday < account.dailyLimit) {
        const client = this.sessions.get(account.id)
        if (client?.connected) {
          return account.id
        }
      }
    }

    return null
  }

  async getContacts(sessionId: string) {
    const client = this.sessions.get(sessionId)
    if (!client || !client.connected) {
      throw new Error('Session not found or not connected')
    }
    return client.getContacts()
  }

  async getGroups(sessionId: string) {
    const client = this.sessions.get(sessionId)
    if (!client || !client.connected) {
      throw new Error('Session not found or not connected')
    }
    return client.getGroups()
  }
}