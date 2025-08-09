"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2, 
  AlertCircle, 
  Activity,
  Database,
  Server,
  MessageSquare
} from 'lucide-react'

interface SystemStatus {
  api: 'online' | 'offline' | 'checking'
  database: 'connected' | 'disconnected' | 'checking'
  messageQueue: {
    pending: number
    sent: number
    failed: number
  }
  scrapers: {
    active: number
    total: number
  }
  lastCheck: Date
}

export function SystemHealth() {
  const [status, setStatus] = useState<SystemStatus>({
    api: 'checking',
    database: 'checking',
    messageQueue: {
      pending: 0,
      sent: 0,
      failed: 0
    },
    scrapers: {
      active: 0,
      total: 0
    },
    lastCheck: new Date()
  })
  const [loading, setLoading] = useState(true)

  const checkSystemHealth = async () => {
    try {
      // Check API status
      const healthResponse = await fetch('http://localhost:3001/health')
      const apiStatus = healthResponse.ok ? 'online' : 'offline'

      // Check debug endpoint for detailed info
      const debugResponse = await fetch('http://localhost:3001/debug')
      let messageQueue = { pending: 0, sent: 0, failed: 0 }
      let database = 'disconnected' as const
      
      if (debugResponse.ok) {
        const debugData = await debugResponse.json()
        database = debugData.database?.status === 'connected' ? 'connected' : 'disconnected'
        
        if (debugData.messageWorker) {
          messageQueue = {
            pending: debugData.messageWorker.pendingMessages || 0,
            sent: debugData.messageWorker.sentToday || 0,
            failed: debugData.messageWorker.failedMessages || 0
          }
        }
      }

      // Check message stats
      const messagesResponse = await fetch('http://localhost:3001/api/messages/debug/recent')
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json()
        if (messagesData.stats) {
          messageQueue = {
            pending: messagesData.stats.pending || 0,
            sent: messagesData.stats.sent || 0,
            failed: messagesData.stats.failed || 0
          }
        }
      }

      setStatus({
        api: apiStatus,
        database,
        messageQueue,
        scrapers: {
          active: 1, // Default for now
          total: 3
        },
        lastCheck: new Date()
      })
    } catch (error) {
      console.error('Failed to check system health:', error)
      setStatus(prev => ({
        ...prev,
        api: 'offline',
        database: 'disconnected'
      }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkSystemHealth()
    const interval = setInterval(checkSystemHealth, 60000) // Check every minute
    
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'offline':
      case 'disconnected':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'checking':
        return <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return <span className="text-sm text-green-600">Online</span>
      case 'connected':
        return <span className="text-sm text-green-600">Conectado</span>
      case 'offline':
        return <span className="text-sm text-red-600">Offline</span>
      case 'disconnected':
        return <span className="text-sm text-red-600">Desconectado</span>
      case 'checking':
        return <span className="text-sm text-gray-500">Verificando...</span>
      default:
        return <span className="text-sm text-yellow-600">Desconhecido</span>
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Saúde do Sistema</span>
            </CardTitle>
            <CardDescription>
              Monitoramento em tempo real
            </CardDescription>
          </div>
          <div className="text-xs text-gray-400">
            Atualizado: {status.lastCheck.toLocaleTimeString('pt-BR')}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* API Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon(status.api)}
                <div className="flex items-center space-x-2">
                  <Server className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">API Principal</span>
                </div>
              </div>
              {getStatusText(status.api)}
            </div>

            {/* Database Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon(status.database)}
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Banco de Dados</span>
                </div>
              </div>
              {getStatusText(status.database)}
            </div>

            {/* Message Queue */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {status.messageQueue.pending > 10 ? (
                  <Clock className="h-5 w-5 text-yellow-500" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Fila de Mensagens</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-yellow-600">{status.messageQueue.pending} pendentes</span>
                <span className="text-gray-400">|</span>
                <span className="text-green-600">{status.messageQueue.sent} enviadas</span>
                {status.messageQueue.failed > 0 && (
                  <>
                    <span className="text-gray-400">|</span>
                    <span className="text-red-600">{status.messageQueue.failed} falhas</span>
                  </>
                )}
              </div>
            </div>

            {/* Scrapers */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {status.scrapers.active > 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Scrapers</span>
                </div>
              </div>
              <span className="text-sm text-green-600">
                {status.scrapers.active}/{status.scrapers.total} ativos
              </span>
            </div>

            {/* Overall Health Score */}
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Saúde Geral</span>
                <div className="flex items-center space-x-2">
                  {status.api === 'online' && status.database === 'connected' ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-green-600">Excelente</span>
                    </>
                  ) : status.api === 'online' || status.database === 'connected' ? (
                    <>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-yellow-600">Parcial</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-red-600">Crítico</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}