import { apiClient } from '../client'

export interface CampaignRequest {
  name: string
  productIds: string[]
  targetType: 'CONTACTS' | 'GROUPS' | 'ALL'
  templateMode: 'AUTO_SUGGEST' | 'SPECIFIC'
  templateId?: string
  scheduledAt?: Date | string
  tags?: string[]
  maxRecipientsPerMessage: number
  delayBetweenMessages: number
}

export interface CampaignResponse {
  campaign: {
    name: string
    productsProcessed: number
    messagesCreated: number
    recipientsReached: number
    estimatedDuration: number
    startTime: string
    endTime: string
  }
  summary: {
    products: Array<{ id: string; title: string }>
    recipientTypes: {
      contacts: number
      groups: number
    }
  }
}

export interface ScheduledMessage {
  id: string
  productId?: string
  templateId?: string
  content: string
  scheduledAt: string
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED'
  sentAt?: string
  recipients: string[]
  recipientType: 'CONTACT' | 'GROUP' | 'BROADCAST'
  error?: string
  createdAt: string
  updatedAt: string
  product?: {
    id: string
    title: string
    price: number
    discount?: string
  }
}

export interface CampaignAnalytics {
  overview: {
    totalMessages: number
    pending: number
    sent: number
    failed: number
    cancelled: number
  }
  recentActivity: ScheduledMessage[]
}

class MessagesService {
  // Create campaign with multiple products
  async createCampaign(data: CampaignRequest): Promise<CampaignResponse> {
    return apiClient.post<CampaignResponse>('/messages/campaign', data)
  }

  // Get all scheduled messages
  async getScheduledMessages(filters?: {
    status?: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED'
    from?: Date | string
    to?: Date | string
  }): Promise<ScheduledMessage[]> {
    const params = new URLSearchParams()
    if (filters?.status) params.set('status', filters.status)
    if (filters?.from) params.set('from', filters.from.toString())
    if (filters?.to) params.set('to', filters.to.toString())

    const query = params.toString()
    return apiClient.get<ScheduledMessage[]>(`/messages${query ? `?${query}` : ''}`)
  }

  // Get specific message
  async getMessage(messageId: string): Promise<ScheduledMessage> {
    return apiClient.get<ScheduledMessage>(`/messages/${messageId}`)
  }

  // Cancel scheduled message
  async cancelMessage(messageId: string): Promise<void> {
    await apiClient.patch(`/messages/${messageId}/cancel`)
  }

  // Delete message
  async deleteMessage(messageId: string): Promise<void> {
    await apiClient.delete(`/messages/${messageId}`)
  }

  // Get campaign analytics
  async getCampaignAnalytics(filters?: {
    from?: Date | string
    to?: Date | string
  }): Promise<CampaignAnalytics> {
    const params = new URLSearchParams()
    if (filters?.from) params.set('from', filters.from.toString())
    if (filters?.to) params.set('to', filters.to.toString())

    const query = params.toString()
    return apiClient.get<CampaignAnalytics>(`/messages/analytics/campaigns${query ? `?${query}` : ''}`)
  }

  // Process message queue (for testing/debugging)
  async processQueue(limit = 10): Promise<{
    processed: number
    message?: string
    messages?: Array<{
      id: string
      content: string
      recipients: number
      product?: string
    }>
  }> {
    return apiClient.post(`/messages/process-queue?limit=${limit}`)
  }

  // Bulk create messages (direct API)
  async createBulkMessages(messages: Array<{
    productId?: string
    templateId?: string
    content: string
    scheduledAt: Date | string
    recipients: string[]
    recipientType: 'CONTACT' | 'GROUP' | 'BROADCAST'
  }>): Promise<{ count: number }> {
    return apiClient.post('/messages/bulk', { messages })
  }

  // Quick send - create campaign with immediate scheduling
  async quickSend(data: {
    productIds: string[]
    groupIds: string[]
    templateMode?: 'AUTO_SUGGEST' | 'SPECIFIC'
    templateId?: string
    delayBetweenMessages?: number
    maxRecipientsPerMessage?: number
  }): Promise<CampaignResponse> {
    // For quick send, we'll use the existing campaign endpoint but tag the groups
    // The API will need to handle groupIds parameter or we filter by tags
    const campaignData = {
      name: `Envio Rápido - ${new Date().toLocaleString('pt-BR')}`,
      productIds: data.productIds,
      targetType: 'GROUPS' as const,
      templateMode: data.templateMode || 'AUTO_SUGGEST' as const,
      templateId: data.templateId,
      scheduledAt: new Date(),
      maxRecipientsPerMessage: data.maxRecipientsPerMessage || 10,
      delayBetweenMessages: data.delayBetweenMessages || 30,
      groupIds: data.groupIds // Pass group IDs directly
    }

    return apiClient.post<CampaignResponse>('/messages/campaign', campaignData)
  }
}

export const messagesService = new MessagesService()