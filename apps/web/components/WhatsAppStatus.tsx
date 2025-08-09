"use client"

import { useEffect, useState } from 'react'
import { Wifi, WifiOff, Loader2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@repo/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/card'
import { toast } from 'sonner'

interface WhatsAppStatusData {
  connected: number
  total: number
  hasConnectedSession: boolean
  lastCheck?: Date
}

export function WhatsAppStatus() {
  const [status, setStatus] = useState<WhatsAppStatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [reconnecting, setReconnecting] = useState(false)
  const [lastDisconnectTime, setLastDisconnectTime] = useState<Date | null>(null)

  const checkStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/whatsapp/status')
      if (response.ok) {
        const data = await response.json()
        const newStatus = {
          ...data,
          lastCheck: new Date()
        }
        
        // Check if connection was lost
        if (status?.hasConnectedSession && !newStatus.hasConnectedSession) {
          setLastDisconnectTime(new Date())
          toast.error('WhatsApp desconectado!', {
            description: 'A sessão WhatsApp foi desconectada. Mensagens não serão enviadas até reconectar.',
            duration: 10000
          })
        }
        
        // Check if connection was restored
        if (!status?.hasConnectedSession && newStatus.hasConnectedSession) {
          toast.success('WhatsApp reconectado!', {
            description: 'A sessão WhatsApp foi reconectada com sucesso.',
            duration: 5000
          })
          setLastDisconnectTime(null)
        }
        
        setStatus(newStatus)
      }
    } catch (error) {
      console.error('Failed to check WhatsApp status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReconnect = async () => {
    setReconnecting(true)
    toast.info('Tentando reconectar...', {
      description: 'Iniciando processo de reconexão do WhatsApp.',
      duration: 3000
    })
    
    try {
      const response = await fetch('http://localhost:3001/api/whatsapp/reconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        
        if (result.success) {
          toast.success('Reconexão iniciada!', {
            description: result.message,
            duration: 5000
          })
          
          // Wait a bit then check status
          setTimeout(() => {
            checkStatus()
          }, 3000)
        } else {
          toast.info('Nenhuma sessão para reconectar', {
            description: result.message,
            duration: 5000
          })
        }
      } else {
        toast.error('Falha na reconexão', {
          description: 'Não foi possível reconectar. Verifique o QR Code.',
          duration: 5000
        })
      }
    } catch (error) {
      toast.error('Erro ao tentar reconectar', {
        description: 'Falha na comunicação com o servidor.',
        duration: 5000
      })
    } finally {
      setReconnecting(false)
    }
  }

  // Check status on mount and every 30 seconds
  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 30000)
    
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  const isConnected = status?.hasConnectedSession || false
  const timeSinceDisconnect = lastDisconnectTime 
    ? Math.floor((new Date().getTime() - lastDisconnectTime.getTime()) / 1000 / 60)
    : null

  return (
    <Card className={`w-full ${!isConnected ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Status WhatsApp
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={checkStatus}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <>
                  <Wifi className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Conectado</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-red-700">Desconectado</span>
                </>
              )}
            </div>
            {status && (
              <span className="text-xs text-gray-500">
                {status.connected}/{status.total} sessões
              </span>
            )}
          </div>

          {/* Disconnect Warning */}
          {!isConnected && timeSinceDisconnect !== null && (
            <div className="flex items-start space-x-2 p-2 bg-red-100 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-red-700 font-medium">
                  Desconectado há {timeSinceDisconnect} minuto{timeSinceDisconnect !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Mensagens não serão enviadas até reconectar
                </p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {isConnected && (
            <div className="flex items-center space-x-2 p-2 bg-green-100 rounded-md">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <p className="text-xs text-green-700">
                Sistema pronto para enviar mensagens
              </p>
            </div>
          )}

          {/* Reconnect Button */}
          {!isConnected && (
            <Button
              className="w-full"
              variant="outline"
              size="sm"
              onClick={handleReconnect}
              disabled={reconnecting}
            >
              {reconnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reconectando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reconectar WhatsApp
                </>
              )}
            </Button>
          )}

          {/* Last Check */}
          {status?.lastCheck && (
            <p className="text-xs text-gray-400 text-center">
              Última verificação: {new Date(status.lastCheck).toLocaleTimeString('pt-BR')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}