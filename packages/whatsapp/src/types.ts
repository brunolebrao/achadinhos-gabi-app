export interface WhatsAppSession {
  id: string
  name: string
  phoneNumber: string
  isConnected: boolean
  qrCode?: string
}

export interface WhatsAppMessage {
  to: string
  message: string
  type: 'text' | 'image' | 'document'
  media?: {
    url: string
    caption?: string
    filename?: string
  }
}

export interface WhatsAppContact {
  id: string
  name: string
  phoneNumber: string
  isRegistered: boolean
  profilePicUrl?: string
}

export interface WhatsAppGroup {
  id: string
  name: string
  description?: string
  participants: WhatsAppContact[]
  isAdmin: boolean
}

export interface WhatsAppMessageResult {
  success: boolean
  messageId?: string
  error?: string
  timestamp: Date
}

export interface SessionEventHandlers {
  onQRCode?: (qr: string, sessionId: string) => void
  onReady?: (sessionId: string) => void
  onDisconnected?: (sessionId: string, reason: string) => void
  onMessage?: (message: any, sessionId: string) => void
  onAuthFailure?: (sessionId: string, error: string) => void
}

export interface WhatsAppClientConfig {
  sessionId: string
  sessionPath: string
  puppeteerOptions?: any
  qrMaxRetries?: number
  restartOnAuthFail?: boolean
}