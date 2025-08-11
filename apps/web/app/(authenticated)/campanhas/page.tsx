"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/card'
import { Button } from '@repo/ui/button'
import { Badge } from '@repo/ui/badge'
import { 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  Calendar,
  Send,
  Users,
  Package,
  Activity,
  Trash2,
  PauseCircle,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { messagesService, type ScheduledMessage, type CampaignAnalytics } from '../../../lib/api/services/messages.service'

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  SENT: 'bg-green-100 text-green-800', 
  FAILED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800'
}

const statusIcons = {
  PENDING: Clock,
  SENT: CheckCircle,
  FAILED: XCircle,
  CANCELLED: PauseCircle
}

const statusLabels = {
  PENDING: 'Pendente',
  SENT: 'Enviado',
  FAILED: 'Falhou', 
  CANCELLED: 'Cancelado'
}

export default function CampanhasPage() {
  const [messages, setMessages] = useState<ScheduledMessage[]>([])
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED'>('ALL')
  const [processingQueue, setProcessingQueue] = useState(false)

  useEffect(() => {
    fetchData()
  }, [selectedStatus])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const [messagesData, analyticsData] = await Promise.all([
        messagesService.getScheduledMessages(
          selectedStatus === 'ALL' ? undefined : { status: selectedStatus }
        ),
        messagesService.getCampaignAnalytics()
      ])
      
      setMessages(messagesData)
      setAnalytics(analyticsData)
    } catch (error) {
      console.error('Failed to fetch campaigns data:', error)
      toast.error('Erro ao carregar campanhas')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelMessage = async (messageId: string) => {
    try {
      await messagesService.cancelMessage(messageId)
      toast.success('Mensagem cancelada com sucesso')
      fetchData() // Refresh data
    } catch (error) {
      console.error('Failed to cancel message:', error)
      toast.error('Erro ao cancelar mensagem')
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta mensagem?')) {
      return
    }

    try {
      await messagesService.deleteMessage(messageId)
      toast.success('Mensagem excluída com sucesso')
      fetchData() // Refresh data
    } catch (error) {
      console.error('Failed to delete message:', error)
      toast.error('Erro ao excluir mensagem')
    }
  }

  const handleProcessQueue = async () => {
    setProcessingQueue(true)
    try {
      const result = await messagesService.processQueue(10)
      if (result.processed > 0) {
        toast.success(`${result.processed} mensagem(ns) processada(s)`)
        fetchData() // Refresh data
      } else {
        toast.info('Nenhuma mensagem pendente para processar')
      }
    } catch (error) {
      console.error('Failed to process queue:', error)
      toast.error('Erro ao processar fila de mensagens')
    } finally {
      setProcessingQueue(false)
    }
  }

  const renderAnalytics = () => {
    if (!analytics) return null

    return (
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Mensagens</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalMessages}</div>
            <p className="text-xs text-muted-foreground">
              Todas as campanhas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{analytics.overview.pending}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando envio
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enviadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analytics.overview.sent}</div>
            <p className="text-xs text-muted-foreground">
              Entregues com sucesso
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Falharam</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{analytics.overview.failed}</div>
            <p className="text-xs text-muted-foreground">
              Erro no envio
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  const getStatusIcon = (status: keyof typeof statusIcons) => {
    const Icon = statusIcons[status]
    return <Icon className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Campanhas WhatsApp
          </h2>
          <p className="text-muted-foreground">
            Acompanhe o status de todas as suas campanhas de produtos
          </p>
        </div>
        <div className="flex items-center gap-2">
          {analytics && analytics.overview.pending > 0 && (
            <Button
              onClick={handleProcessQueue}
              disabled={processingQueue}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {processingQueue ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Processar Fila ({analytics.overview.pending})
                </>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {renderAnalytics()}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1">
              <h3 className="font-medium mb-2">Filtrar por Status</h3>
            </div>
            <div className="flex gap-2">
              {['ALL', 'PENDING', 'SENT', 'FAILED', 'CANCELLED'].map((status) => (
                <Button
                  key={status}
                  variant={selectedStatus === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStatus(status as any)}
                >
                  {status === 'ALL' ? 'Todos' : statusLabels[status as keyof typeof statusLabels]}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages List */}
      {messages.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <MessageSquare className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma campanha encontrada</h3>
            <p className="text-gray-600 mb-4">
              {selectedStatus === 'ALL' 
                ? 'Você ainda não criou nenhuma campanha. Vá para "Meus Produtos" para começar.'
                : `Nenhuma campanha com status "${statusLabels[selectedStatus as keyof typeof statusLabels]}" encontrada.`
              }
            </p>
            <div className="space-x-2">
              <Button onClick={() => window.location.href = '/my-products'}>
                <Package className="h-4 w-4 mr-2" />
                Ver Produtos
              </Button>
              {selectedStatus !== 'ALL' && (
                <Button variant="outline" onClick={() => setSelectedStatus('ALL')}>
                  Ver Todas
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {messages.map((message) => (
            <Card key={message.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge 
                        className={`${statusColors[message.status]} flex items-center gap-1`}
                        variant="secondary"
                      >
                        {getStatusIcon(message.status)}
                        {statusLabels[message.status]}
                      </Badge>
                      
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {message.recipients.length} destinatário(s)
                      </Badge>
                      
                      <Badge variant="outline">
                        {message.recipientType === 'GROUP' ? 'Grupos' : 'Contatos'}
                      </Badge>
                    </div>

                    {/* Message Content Preview */}
                    <div className="bg-gray-50 p-3 rounded-lg mb-3">
                      <div className="text-sm text-gray-800 line-clamp-3">
                        {message.content.length > 200 
                          ? `${message.content.substring(0, 200)}...` 
                          : message.content
                        }
                      </div>
                    </div>

                    {/* Product Info */}
                    {message.product && (
                      <div className="flex items-center gap-2 mb-3">
                        <Package className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          Produto: {message.product.title.substring(0, 50)}...
                        </span>
                        <Badge variant="outline" className="text-xs">
                          R$ {message.product.price.toFixed(2)}
                        </Badge>
                      </div>
                    )}

                    {/* Timing Info */}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Agendada: {formatDate(message.scheduledAt)}
                      </div>
                      
                      {message.sentAt && (
                        <div className="flex items-center gap-1">
                          <Send className="h-3 w-3" />
                          Enviada: {formatDate(message.sentAt)}
                        </div>
                      )}
                    </div>

                    {/* Error Info */}
                    {message.error && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        <strong>Erro:</strong> {message.error}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    {message.status === 'PENDING' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelMessage(message.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <PauseCircle className="h-3 w-3 mr-1" />
                        Cancelar
                      </Button>
                    )}
                    
                    {['SENT', 'FAILED', 'CANCELLED'].includes(message.status) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteMessage(message.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Excluir
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}