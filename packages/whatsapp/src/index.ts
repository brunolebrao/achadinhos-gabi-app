export { WhatsAppClient } from './whatsapp-client'
export { SessionManager } from './session-manager'
export { MessageQueue } from './message-queue'
export * from './types'

import { SessionManager } from './session-manager'
import { MessageQueue } from './message-queue'
import { SessionEventHandlers } from './types'

export class WhatsAppService {
  private sessionManager: SessionManager
  private messageQueue: MessageQueue
  private initialized = false

  constructor(sessionPath: string = './sessions') {
    const eventHandlers: SessionEventHandlers = {
      onQRCode: (qr: string, sessionId: string) => {
        console.log(`QR Code generated for session ${sessionId}`)
      },
      onReady: (sessionId: string) => {
        console.log(`Session ${sessionId} is ready`)
      },
      onDisconnected: (sessionId: string, reason: string) => {
        console.log(`Session ${sessionId} disconnected: ${reason}`)
      },
      onAuthFailure: (sessionId: string, error: string) => {
        console.error(`Auth failure for session ${sessionId}: ${error}`)
      }
    }

    this.sessionManager = new SessionManager(sessionPath, eventHandlers)
    this.messageQueue = new MessageQueue(this.sessionManager)
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    console.log('Initializing WhatsApp Service...')
    
    await this.sessionManager.initializeAllSessions()
    this.messageQueue.start()
    
    this.initialized = true
    console.log('WhatsApp Service initialized successfully')
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return
    }

    console.log('Shutting down WhatsApp Service...')
    
    this.messageQueue.stop()
    await this.sessionManager.destroyAllSessions()
    
    this.initialized = false
    console.log('WhatsApp Service shut down successfully')
  }

  get sessions() {
    return this.sessionManager
  }

  get messages() {
    return this.messageQueue
  }

  get isInitialized() {
    return this.initialized
  }
}