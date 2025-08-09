import { useState, useCallback } from 'react'
import { messagesService, CampaignRequest, CampaignResponse } from '../api/services/messages.service'
import { toast } from 'sonner'

export function useMessages() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendToWhatsApp = useCallback(async (data: {
    productIds: string[]
    groupIds: string[]
    templateMode?: 'AUTO_SUGGEST' | 'SPECIFIC'
    templateId?: string
    delayBetweenMessages?: number
    maxRecipientsPerMessage?: number
  }): Promise<CampaignResponse | null> => {
    try {
      setLoading(true)
      setError(null)

      const response = await messagesService.quickSend(data)
      
      toast.success(`Envio criado! ${response.campaign.messagesCreated} mensagens programadas para ${response.campaign.recipientsReached} destinatários.`)
      
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Falha ao enviar mensagens'
      setError(errorMessage)
      toast.error(`Erro: ${errorMessage}`)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const createCampaign = useCallback(async (data: CampaignRequest): Promise<CampaignResponse | null> => {
    try {
      setLoading(true)
      setError(null)

      const response = await messagesService.createCampaign(data)
      
      toast.success(`Campanha "${data.name}" criada! ${response.campaign.messagesCreated} mensagens programadas.`)
      
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Falha ao criar campanha'
      setError(errorMessage)
      toast.error(`Erro: ${errorMessage}`)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const processQueue = useCallback(async (limit = 10) => {
    try {
      setLoading(true)
      setError(null)

      const response = await messagesService.processQueue(limit)
      
      if (response.processed > 0) {
        toast.success(`${response.processed} mensagens processadas com sucesso!`)
      } else {
        toast.info('Nenhuma mensagem pendente para processar')
      }
      
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Falha ao processar fila'
      setError(errorMessage)
      toast.error(`Erro: ${errorMessage}`)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    sendToWhatsApp,
    createCampaign,
    processQueue
  }
}