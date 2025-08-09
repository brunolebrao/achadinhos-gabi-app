import { useState, useEffect, useCallback } from 'react'
import { whatsappService } from '../api/services/whatsapp.service'
import { toast } from 'sonner'

export interface WhatsAppSession {
  id: string
  name: string
  phoneNumber: string
  isConnected: boolean
  qrCode?: string
  client?: any
}

export interface WhatsAppSessionDetails extends WhatsAppSession {
  connectedAt?: string
  lastMessage?: string
  messagesSent: number
  contacts: number
  groups: number
  isDefault?: boolean
}

export function useWhatsAppSessions() {
  const [sessions, setSessions] = useState<WhatsAppSessionDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await whatsappService.getSessions()
      
      // Transform API response to match our interface
      const sessionsData = response.sessions || response
      
      const transformedSessions: WhatsAppSessionDetails[] = (Array.isArray(sessionsData) ? sessionsData : []).map((session: any) => ({
        id: session.id,
        name: session.name,
        phoneNumber: session.phoneNumber,
        isConnected: session.isConnected || false,
        qrCode: session.qrCode,
        connectedAt: session.connectedAt,
        lastMessage: session.lastMessage,
        messagesSent: session.messagesSent || 0,
        contacts: session.contacts || 0,
        groups: session.groups || 0,
        isDefault: session.isDefault || false
      }))
      
      setSessions(transformedSessions)
    } catch (err: any) {
      console.error('Error fetching sessions:', err)
      setError(err.message || 'Failed to fetch sessions')
      toast.error('Erro ao buscar sessões WhatsApp')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchSessions, 10000)
    return () => clearInterval(interval)
  }, [fetchSessions])

  return { sessions, loading, error, refetch: fetchSessions }
}

export function useWhatsAppActions() {
  const [loading, setLoading] = useState(false)

  const createSession = useCallback(async (name: string, phoneNumber: string) => {
    try {
      setLoading(true)
      const response = await whatsappService.createSession({ name, phoneNumber })
      toast.success('Sessão criada com sucesso!')
      return response.sessionId
    } catch (err: any) {
      console.error('Error creating session:', err)
      toast.error(err.message || 'Erro ao criar sessão')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const restartSession = useCallback(async (sessionId: string) => {
    try {
      setLoading(true)
      await whatsappService.restartSession(sessionId)
      toast.success('Sessão reiniciada!')
    } catch (err: any) {
      console.error('Error restarting session:', err)
      toast.error(err.message || 'Erro ao reiniciar sessão')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      setLoading(true)
      await whatsappService.deleteSession(sessionId)
      toast.success('Sessão removida!')
    } catch (err: any) {
      console.error('Error deleting session:', err)
      toast.error(err.message || 'Erro ao remover sessão')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const syncContacts = useCallback(async (sessionId: string) => {
    try {
      setLoading(true)
      const result = await whatsappService.syncContacts(sessionId)
      toast.success(`${result.synced} contatos sincronizados!`)
      return result
    } catch (err: any) {
      console.error('Error syncing contacts:', err)
      toast.error(err.message || 'Erro ao sincronizar contatos')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const syncGroups = useCallback(async (sessionId: string) => {
    try {
      setLoading(true)
      const result = await whatsappService.syncGroups(sessionId)
      toast.success(`${result.synced} grupos sincronizados!`)
      return result
    } catch (err: any) {
      console.error('Error syncing groups:', err)
      toast.error(err.message || 'Erro ao sincronizar grupos')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const sendMessage = useCallback(async (sessionId: string, to: string, message: string) => {
    try {
      setLoading(true)
      const result = await whatsappService.sendMessage(sessionId, {
        to,
        message,
        type: 'text'
      })
      
      if (result.success) {
        toast.success('Mensagem enviada!')
      } else {
        throw new Error(result.error || 'Falha ao enviar mensagem')
      }
      
      return result
    } catch (err: any) {
      console.error('Error sending message:', err)
      toast.error(err.message || 'Erro ao enviar mensagem')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    createSession,
    restartSession,
    deleteSession,
    syncContacts,
    syncGroups,
    sendMessage
  }
}

export function useWhatsAppQRCode(sessionId: string | null) {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchQRCode = useCallback(async () => {
    if (!sessionId) {
      setQrCode(null)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await whatsappService.getQRCode(sessionId)
      setQrCode(response.qrCode)
    } catch (err: any) {
      console.error('Error fetching QR code:', err)
      setError(err.message || 'Failed to fetch QR code')
      setQrCode(null)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    if (sessionId) {
      fetchQRCode()
      
      // Poll for QR code every 5 seconds
      const interval = setInterval(fetchQRCode, 5000)
      return () => clearInterval(interval)
    }
  }, [sessionId, fetchQRCode])

  return { qrCode, loading, error, refetch: fetchQRCode }
}