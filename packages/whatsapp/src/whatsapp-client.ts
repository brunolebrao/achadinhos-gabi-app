import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js'
import path from 'path'
import { 
  WhatsAppMessage, 
  WhatsAppMessageResult, 
  WhatsAppContact, 
  WhatsAppGroup,
  SessionEventHandlers,
  WhatsAppClientConfig
} from './types'

export class WhatsAppClient {
  private client: Client | null = null
  private sessionId: string
  private isConnecting = false
  private isReady = false
  private eventHandlers: SessionEventHandlers
  private config: WhatsAppClientConfig

  constructor(config: WhatsAppClientConfig, eventHandlers: SessionEventHandlers = {}) {
    this.sessionId = config.sessionId
    this.eventHandlers = eventHandlers
    this.config = config
  }

  async initialize(): Promise<void> {
    if (this.client || this.isConnecting) {
      return
    }

    this.isConnecting = true

    try {
      const sessionPath = path.join(this.config.sessionPath, this.sessionId)
      
      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: this.sessionId,
          dataPath: sessionPath
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=IsolateOrigins',
            '--disable-site-isolation-trials'
          ],
          ...this.config.puppeteerOptions
        }
      })

      this.setupEventHandlers()
      await this.client.initialize()
    } catch (error) {
      this.isConnecting = false
      console.error(`Failed to initialize WhatsApp client ${this.sessionId}:`, error)
      throw error
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return

    this.client.on('qr', (qr) => {
      console.log(`QR Code generated for session ${this.sessionId}`)
      this.eventHandlers.onQRCode?.(qr, this.sessionId)
    })

    this.client.on('ready', () => {
      console.log(`WhatsApp client ${this.sessionId} is ready!`)
      this.isReady = true
      this.isConnecting = false
      this.eventHandlers.onReady?.(this.sessionId)
    })

    this.client.on('authenticated', () => {
      console.log(`WhatsApp client ${this.sessionId} authenticated`)
    })

    this.client.on('auth_failure', (msg) => {
      console.error(`Authentication failed for ${this.sessionId}:`, msg)
      this.isConnecting = false
      this.eventHandlers.onAuthFailure?.(this.sessionId, msg)
    })

    this.client.on('disconnected', (reason) => {
      console.log(`WhatsApp client ${this.sessionId} disconnected:`, reason)
      this.isReady = false
      this.isConnecting = false
      this.eventHandlers.onDisconnected?.(this.sessionId, reason)
    })

    this.client.on('message', (message) => {
      this.eventHandlers.onMessage?.(message, this.sessionId)
    })

    this.client.on('message_create', (message) => {
      if (message.fromMe) {
        console.log(`Message sent from ${this.sessionId}: ${message.body}`)
      }
    })
  }

  async sendMessage(message: WhatsAppMessage): Promise<WhatsAppMessageResult> {
    if (!this.client || !this.isReady) {
      return {
        success: false,
        error: 'WhatsApp client is not ready',
        timestamp: new Date()
      }
    }

    try {
      let chatId = message.to
      
      // Log for debugging
      console.log(`[WhatsApp] Original recipient ID: ${chatId}`)
      
      // Only format if doesn't already have @ symbol
      if (!chatId.includes('@')) {
        // Check if it's a phone number (only digits)
        if (/^\d+$/.test(chatId)) {
          chatId = `${chatId}@c.us`
          console.log(`[WhatsApp] Formatted as contact: ${chatId}`)
        } else {
          console.warn(`[WhatsApp] Invalid recipient format: ${chatId}`)
        }
      } else {
        // Already formatted, just log the type
        if (chatId.includes('@g.us')) {
          console.log(`[WhatsApp] Sending to group: ${chatId}`)
        } else if (chatId.includes('@c.us')) {
          console.log(`[WhatsApp] Sending to contact: ${chatId}`)
        }
      }

      let sentMessage

      if (message.type === 'text') {
        sentMessage = await this.client.sendMessage(chatId, message.message)
      } else if (message.type === 'image' && message.media) {
        const media = await MessageMedia.fromUrl(message.media.url)
        sentMessage = await this.client.sendMessage(chatId, media, {
          caption: message.media.caption || message.message
        })
      } else if (message.type === 'document' && message.media) {
        const media = await MessageMedia.fromUrl(message.media.url, {
          filename: message.media.filename
        })
        sentMessage = await this.client.sendMessage(chatId, media)
      } else {
        throw new Error('Invalid message type or missing media')
      }

      return {
        success: true,
        messageId: sentMessage.id._serialized,
        timestamp: new Date()
      }
    } catch (error) {
      console.error(`Failed to send message from ${this.sessionId}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      }
    }
  }

  async getContacts(): Promise<WhatsAppContact[]> {
    if (!this.client || !this.isReady) {
      return []
    }

    try {
      const contacts = await this.client.getContacts()
      return contacts
        .filter(contact => {
          // Filter out contacts without valid numbers
          return contact.number && contact.number !== '' && contact.number !== 'undefined'
        })
        .map(contact => {
          // Format phone number properly
          let phoneNumber = contact.number || ''
          
          // Remove any non-digit characters except +
          phoneNumber = phoneNumber.replace(/[^\d+]/g, '')
          
          // Add + if not present and number looks valid
          if (phoneNumber && !phoneNumber.startsWith('+')) {
            // If it's a Brazilian number without country code
            if (phoneNumber.length <= 11) {
              phoneNumber = `+55${phoneNumber}`
            } else {
              phoneNumber = `+${phoneNumber}`
            }
          }
          
          // Generate a better name
          let name = contact.name || contact.pushname || ''
          if (!name || name === phoneNumber) {
            // Use last 4 digits as identifier if no name
            const lastDigits = phoneNumber.slice(-4)
            name = `Contato ${lastDigits}`
          }
          
          return {
            id: contact.id._serialized,
            name: name,
            phoneNumber: phoneNumber,
            isRegistered: contact.isWAContact,
            profilePicUrl: undefined // Will be fetched separately if needed
          }
        })
        .filter(contact => {
          // Final validation - ensure phone number is in international format
          return contact.phoneNumber && /^\+\d{10,15}$/.test(contact.phoneNumber)
        })
    } catch (error) {
      console.error(`Failed to get contacts from ${this.sessionId}:`, error)
      return []
    }
  }

  async getGroups(): Promise<WhatsAppGroup[]> {
    if (!this.client || !this.isReady) {
      return []
    }

    try {
      const chats = await this.client.getChats()
      const groups = chats.filter(chat => chat.isGroup)
      const myWid = this.client.info?.wid._serialized

      const result: WhatsAppGroup[] = []

      for (const group of groups) {
        // Type assertion for group properties that may not be in the base Chat type
        const groupData = group as any

        const participants: any[] = groupData.participants || []
        
        // Check if I'm still a participant in this group
        const isStillMember = participants.some((p: any) => 
          p.id._serialized === myWid
        )

        // Skip groups where I'm no longer a member
        if (!isStillMember) {
          console.log(`Skipping group ${group.name} - no longer a member`)
          continue
        }

        const mappedParticipants = participants
          .filter((participant: any) => {
            // Filter out participants without valid phone numbers
            return participant?.id?.user && participant.id.user !== 'null' && participant.id.user !== ''
          })
          .map((participant: any) => ({
            id: participant.id._serialized || `unknown_${Date.now()}`,
            name: participant.contact?.name || 
                  participant.contact?.pushname || 
                  participant.id.user || 
                  'Unknown',
            phoneNumber: participant.id.user || '',
            isRegistered: true
          }))

        result.push({
          id: group.id._serialized,
          name: group.name,
          description: groupData.description || undefined,
          participants: mappedParticipants,
          isAdmin: participants.some((p: any) => 
            p.id._serialized === myWid && p.isAdmin
          )
        })
      }

      return result
    } catch (error) {
      console.error(`Failed to get groups from ${this.sessionId}:`, error)
      return []
    }
  }

  async getInfo() {
    if (!this.client || !this.isReady) {
      return null
    }

    try {
      const info = this.client.info
      return {
        phoneNumber: info.wid.user,
        name: info.pushname,
        platform: info.platform,
        version: (info as any).wa_version || 'unknown'
      }
    } catch (error) {
      console.error(`Failed to get info from ${this.sessionId}:`, error)
      return null
    }
  }

  async destroy(): Promise<void> {
    if (this.client) {
      try {
        await this.client.destroy()
      } catch (error) {
        console.error(`Error destroying client ${this.sessionId}:`, error)
      }
      this.client = null
      this.isReady = false
      this.isConnecting = false
    }
  }

  get connected(): boolean {
    return this.isReady
  }

  get connecting(): boolean {
    return this.isConnecting
  }

  get id(): string {
    return this.sessionId
  }
}