"use client"

import { useState, useEffect } from 'react'
import { Button } from "@repo/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card"
import { 
  X, 
  MessageSquare, 
  Users, 
  Clock, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Search,
  Zap
} from "lucide-react"
import { useGroups, useMessages } from '../lib/hooks'
import { Group } from '../lib/hooks/useGroups'

interface Product {
  id: string
  title: string
  price: number
  originalPrice?: number
  discount?: string
  platform: string
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SENT'
}

interface SendToWhatsAppModalProps {
  isOpen: boolean
  onClose: () => void
  selectedProducts: Product[]
}

export function SendToWhatsAppModal({ isOpen, onClose, selectedProducts }: SendToWhatsAppModalProps) {
  const { groups, loading: groupsLoading } = useGroups()
  const { sendToWhatsApp, loading: sendingLoading } = useMessages()

  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [templateMode, setTemplateMode] = useState<'AUTO_SUGGEST' | 'SPECIFIC'>('AUTO_SUGGEST')
  const [delayBetweenMessages, setDelayBetweenMessages] = useState(30)
  const [maxRecipientsPerMessage, setMaxRecipientsPerMessage] = useState(10)
  const [searchTerm, setSearchTerm] = useState('')
  const [sendingStep, setSendingStep] = useState<'idle' | 'validating' | 'creating' | 'sending' | 'completed' | 'error'>('idle')
  const [sendingMessage, setSendingMessage] = useState('')
  const [whatsappStatus, setWhatsappStatus] = useState<{ connected: number; total: number; hasConnectedSession: boolean } | null>(null)

  // Filter groups based on search term
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Check WhatsApp status
  const checkWhatsAppStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/whatsapp/status')
      if (response.ok) {
        const data = await response.json()
        setWhatsappStatus(data)
      }
    } catch (error) {
      console.warn('Failed to check WhatsApp status:', error)
      setWhatsappStatus({ connected: 0, total: 0, hasConnectedSession: false })
    }
  }

  // Reset selections when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedGroups([])
      setSearchTerm('')
      setSendingStep('idle')
      setSendingMessage('')
      checkWhatsAppStatus()
    }
  }, [isOpen])

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    )
  }

  const handleSelectAll = () => {
    if (selectedGroups.length === filteredGroups.length) {
      setSelectedGroups([])
    } else {
      setSelectedGroups(filteredGroups.map(g => g.groupId))
    }
  }

  const handleSend = async () => {
    if (selectedGroups.length === 0) return

    try {
      setSendingStep('validating')
      setSendingMessage('Validando produtos e configurações...')

      // Check if products need approval
      const pendingProducts = selectedProducts.filter(p => !p.status || p.status === 'PENDING')
      if (pendingProducts.length > 0) {
        setSendingMessage(`${pendingProducts.length} produto(s) precisam ser aprovados primeiro. Aprovando automaticamente...`)
        
        // Auto-approve products (you might want to make this optional)
        for (const product of pendingProducts) {
          try {
            await fetch(`http://localhost:3001/api/products/${product.id}/status`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ status: 'APPROVED' })
            })
          } catch (error) {
            console.warn(`Failed to auto-approve product ${product.id}:`, error)
          }
        }
      }

      setSendingStep('creating')
      setSendingMessage('Criando campanha e mensagens...')

      const result = await sendToWhatsApp({
        productIds: selectedProducts.map(p => p.id),
        groupIds: selectedGroups,
        templateMode,
        delayBetweenMessages,
        maxRecipientsPerMessage
      })

      if (result) {
        setSendingStep('completed')
        setSendingMessage(`✅ Sucesso! ${result.campaign.messagesCreated} mensagens criadas para ${result.campaign.recipientsReached} destinatários.`)
        
        setTimeout(() => {
          onClose()
          setSendingStep('idle')
          setSendingMessage('')
        }, 3000)
      } else {
        setSendingStep('error')
        setSendingMessage('❌ Falha ao criar campanha. Verifique os logs para mais detalhes.')
      }

    } catch (error) {
      setSendingStep('error')
      setSendingMessage(`❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  if (!isOpen) return null

  const totalRecipients = selectedGroups.reduce((total, groupId) => {
    const group = groups.find(g => g.groupId === groupId)
    return total + (group?._count?.members || 0)
  }, 0)

  const estimatedDuration = Math.ceil(
    (selectedProducts.length * selectedGroups.length * delayBetweenMessages) / 60
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h3 className="text-lg font-semibold flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-blue-500" />
              Enviar para WhatsApp
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {selectedProducts.length} produto{selectedProducts.length !== 1 ? 's' : ''} selecionado{selectedProducts.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* WhatsApp Status Warning */}
          {whatsappStatus && !whatsappStatus.hasConnectedSession && (
            <div className="absolute top-16 left-4 right-4 z-10">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-red-800">WhatsApp não conectado</p>
                    <p className="text-xs text-red-600">Nenhuma sessão WhatsApp está ativa. As mensagens serão criadas mas não enviadas até que uma sessão seja conectada.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Left Panel - Groups Selection */}
          <div className="flex-1 p-6 border-r overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Selecionar Grupos</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={groupsLoading}
                >
                  {selectedGroups.length === filteredGroups.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </Button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar grupos..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Groups List */}
              {groupsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredGroups.map((group) => (
                    <div
                      key={group.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedGroups.includes(group.groupId)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => handleGroupToggle(group.groupId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            selectedGroups.includes(group.groupId)
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300'
                          }`}>
                            {selectedGroups.includes(group.groupId) && (
                              <CheckCircle2 className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{group.name}</div>
                            <div className="text-xs text-gray-500">
                              {group._count?.members || 0} membros
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {filteredGroups.length === 0 && !groupsLoading && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">Nenhum grupo encontrado</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Configuration */}
          <div className="w-80 p-6 space-y-6 overflow-y-auto">
            {/* Products Preview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Produtos Selecionados</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedProducts.map((product) => (
                    <div key={product.id} className="text-xs p-2 bg-gray-50 rounded">
                      <div className="font-medium truncate">{product.title}</div>
                      <div className="text-gray-500 flex items-center justify-between">
                        <span>R$ {product.price.toFixed(2)}</span>
                        {product.discount && (
                          <span className="text-green-600">-{product.discount}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Template Configuration */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Template</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="auto-suggest"
                    name="template"
                    checked={templateMode === 'AUTO_SUGGEST'}
                    onChange={() => setTemplateMode('AUTO_SUGGEST')}
                    className="text-blue-600"
                  />
                  <label htmlFor="auto-suggest" className="text-sm flex items-center">
                    <Zap className="h-4 w-4 mr-1 text-yellow-500" />
                    Auto-sugestão (Recomendado)
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="specific"
                    name="template"
                    checked={templateMode === 'SPECIFIC'}
                    onChange={() => setTemplateMode('SPECIFIC')}
                    className="text-blue-600"
                  />
                  <label htmlFor="specific" className="text-sm">Template específico</label>
                </div>
                {templateMode === 'AUTO_SUGGEST' && (
                  <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                    O sistema escolherá automaticamente o melhor template baseado no desconto e categoria de cada produto.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rate Limiting */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Configurações de Envio
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Delay entre mensagens (segundos)
                  </label>
                  <select
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    value={delayBetweenMessages}
                    onChange={(e) => setDelayBetweenMessages(Number(e.target.value))}
                  >
                    <option value={15}>15 segundos</option>
                    <option value={30}>30 segundos</option>
                    <option value={60}>1 minuto</option>
                    <option value={120}>2 minutos</option>
                    <option value={300}>5 minutos</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Máximo de grupos por mensagem
                  </label>
                  <select
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    value={maxRecipientsPerMessage}
                    onChange={(e) => setMaxRecipientsPerMessage(Number(e.target.value))}
                  >
                    <option value={5}>5 grupos</option>
                    <option value={10}>10 grupos</option>
                    <option value={20}>20 grupos</option>
                    <option value={50}>50 grupos</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            {selectedGroups.length > 0 && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-green-800">Resumo do Envio</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-green-700">
                  <div className="space-y-1">
                    <div>📱 {selectedProducts.length} produto{selectedProducts.length !== 1 ? 's' : ''}</div>
                    <div>👥 {selectedGroups.length} grupo{selectedGroups.length !== 1 ? 's' : ''} ({totalRecipients} membros)</div>
                    <div>⏱️ ~{estimatedDuration} minuto{estimatedDuration !== 1 ? 's' : ''} de duração</div>
                    <div>📨 ~{selectedProducts.length * Math.ceil(selectedGroups.length / maxRecipientsPerMessage)} mensagens</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sending Progress */}
            {sendingStep !== 'idle' && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4 pb-2">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      {sendingStep === 'error' ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : sendingStep === 'completed' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      )}
                      <span className="text-sm font-medium text-blue-800">
                        {sendingStep === 'validating' && 'Validando...'}
                        {sendingStep === 'creating' && 'Criando Campanha...'}
                        {sendingStep === 'sending' && 'Enviando...'}
                        {sendingStep === 'completed' && 'Concluído!'}
                        {sendingStep === 'error' && 'Erro'}
                      </span>
                    </div>
                    {sendingMessage && (
                      <p className="text-xs text-blue-700">{sendingMessage}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Send Button */}
            <div className="space-y-2">
              <Button 
                className="w-full"
                onClick={handleSend}
                disabled={selectedGroups.length === 0 || sendingLoading || sendingStep !== 'idle'}
              >
                {sendingLoading || sendingStep !== 'idle' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {sendingStep === 'validating' && 'Validando...'}
                    {sendingStep === 'creating' && 'Criando...'}
                    {sendingStep === 'sending' && 'Enviando...'}
                    {sendingStep === 'completed' && 'Concluído!'}
                    {sendingStep === 'error' && 'Erro'}
                    {sendingStep === 'idle' && 'Enviando...'}
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Enviar Agora
                  </>
                )}
              </Button>
              
              {selectedGroups.length === 0 && sendingStep === 'idle' && (
                <div className="flex items-center text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Selecione pelo menos um grupo
                </div>
              )}

              {/* Products Status Warning */}
              {selectedProducts.some(p => !p.status || p.status === 'PENDING') && sendingStep === 'idle' && (
                <div className="flex items-center text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {selectedProducts.filter(p => !p.status || p.status === 'PENDING').length} produto(s) será(ão) aprovado(s) automaticamente
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}