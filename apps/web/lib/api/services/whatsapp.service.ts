import { apiClient } from '../client'
import { 
  WhatsAppAccount, 
  WhatsAppSession, 
  WhatsAppMessage, 
  ScheduledMessage,
  Contact,
  Group
} from '../types'

class WhatsAppService {
  // Sessions
  async getSessions(): Promise<WhatsAppSession[]> {
    return apiClient.get<WhatsAppSession[]>('/whatsapp/sessions')
  }

  async getSession(id: string): Promise<WhatsAppSession> {
    return apiClient.get<WhatsAppSession>(`/whatsapp/sessions/${id}`)
  }

  async createSession(data: { name: string; phoneNumber: string }): Promise<{ sessionId: string }> {
    return apiClient.post<{ sessionId: string }>('/whatsapp/sessions', data)
  }

  async restartSession(id: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(`/whatsapp/sessions/${id}/restart`)
  }

  async deleteSession(id: string): Promise<void> {
    await apiClient.delete(`/whatsapp/sessions/${id}`)
  }

  async getQRCode(sessionId: string): Promise<{ qrCode: string }> {
    return apiClient.get<{ qrCode: string }>(`/whatsapp/sessions/${sessionId}/qr`)
  }

  // Messages
  async sendMessage(sessionId: string, message: WhatsAppMessage): Promise<{
    success: boolean
    messageId?: string
    error?: string
    timestamp: string
  }> {
    return apiClient.post(`/whatsapp/sessions/${sessionId}/send`, message)
  }

  async scheduleMessage(data: {
    productId?: string
    templateId?: string
    content: string
    recipients: string[]
    scheduledAt: Date | string
    recipientType: 'CONTACT' | 'GROUP' | 'BROADCAST'
  }): Promise<{ messageId: string }> {
    return apiClient.post('/whatsapp/messages/schedule', data)
  }

  async scheduleProductMessage(data: {
    productId: string
    templateId: string
    recipients: string[]
    scheduledAt: Date | string
    recipientType: 'CONTACT' | 'GROUP' | 'BROADCAST'
  }): Promise<{ messageId: string }> {
    return apiClient.post('/whatsapp/messages/schedule-product', data)
  }

  async cancelMessage(messageId: string): Promise<void> {
    await apiClient.delete(`/whatsapp/messages/${messageId}`)
  }

  async getScheduledMessages(): Promise<ScheduledMessage[]> {
    return apiClient.get<ScheduledMessage[]>('/whatsapp/messages/scheduled')
  }

  // Contacts & Groups
  async getContacts(sessionId: string): Promise<Contact[]> {
    return apiClient.get<Contact[]>(`/whatsapp/sessions/${sessionId}/contacts`)
  }

  async getGroups(sessionId: string): Promise<Group[]> {
    return apiClient.get<Group[]>(`/whatsapp/sessions/${sessionId}/groups`)
  }

  async syncContacts(sessionId: string): Promise<{ synced: number; total: number }> {
    return apiClient.post(`/whatsapp/sessions/${sessionId}/sync-contacts`)
  }

  async syncGroups(sessionId: string): Promise<{ synced: number; total: number }> {
    return apiClient.post(`/whatsapp/sessions/${sessionId}/sync-groups`)
  }

  // Session Management
  async getAvailableSessions(): Promise<{
    available: string[]
    optimal: string | null
  }> {
    return apiClient.get('/whatsapp/sessions/available')
  }
}

export const whatsappService = new WhatsAppService()