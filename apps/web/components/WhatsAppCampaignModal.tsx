"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/card'
import { Button } from '@repo/ui/button'
import { Badge } from '@repo/ui/badge'
import { Checkbox } from '@repo/ui/checkbox'
import { 
  X, 
  Send, 
  Users, 
  MessageSquare, 
  Calendar,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft
} from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { useGroups, type Group } from '../lib/hooks/useGroups'
import { messagesService, type CampaignRequest, type CampaignResponse } from '../lib/api/services/messages.service'

interface Product {
  id: string
  title: string
  price: number
  originalPrice?: number
  discount?: string
  imageUrl?: string
  platform: string
  category?: string
}

interface WhatsAppCampaignModalProps {
  isOpen: boolean
  onClose: () => void
  selectedProducts: Product[]
}

type WizardStep = 'products' | 'groups' | 'confirmation'

export function WhatsAppCampaignModal({ 
  isOpen, 
  onClose, 
  selectedProducts 
}: WhatsAppCampaignModalProps) {
  const { data: session, status } = useSession()
  const [currentStep, setCurrentStep] = useState<WizardStep>('products')
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [scheduledAt, setScheduledAt] = useState<string>('')
  const [campaignName, setCampaignName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [campaignResult, setCampaignResult] = useState<CampaignResponse | null>(null)
  
  const { groups, loading: groupsLoading, error: groupsError } = useGroups()

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setCurrentStep('products')
      setSelectedGroups(new Set())
      setCampaignName(`Campanha ${new Date().toLocaleDateString('pt-BR')} - ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`)
      setScheduledAt('')
      setCampaignResult(null)
    }
  }, [isOpen])

  const handleGroupToggle = (groupId: string, checked: boolean) => {
    const newSelected = new Set(selectedGroups)
    if (checked) {
      newSelected.add(groupId)
    } else {
      newSelected.delete(groupId)
    }
    setSelectedGroups(newSelected)
  }

  const handleSelectAllGroups = (checked: boolean) => {
    if (checked) {
      setSelectedGroups(new Set(groups.map(g => g.groupId)))
    } else {
      setSelectedGroups(new Set())
    }
  }

  const handleSubmitCampaign = async () => {
    // Check authentication
    if (status !== 'authenticated' || !session) {
      toast.error('Você precisa estar logado para enviar campanhas')
      window.location.href = '/api/auth/signin'
      return
    }

    if (selectedGroups.size === 0) {
      toast.error('Selecione pelo menos um grupo')
      return
    }

    setIsSubmitting(true)
    
    try {
      const campaignData: CampaignRequest = {
        name: campaignName,
        productIds: selectedProducts.map(p => p.id),
        targetType: 'GROUPS',
        templateMode: 'AUTO_SUGGEST',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
        groupIds: Array.from(selectedGroups),
        maxRecipientsPerMessage: 10,
        delayBetweenMessages: 30
      }

      const result = await messagesService.createCampaign(campaignData)
      setCampaignResult(result)
      setCurrentStep('confirmation')
      
      toast.success('Campanha criada com sucesso!')
    } catch (error) {
      console.error('Campaign creation failed:', error)
      toast.error('Erro ao criar campanha')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      <div className="flex items-center">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
          ['products', 'groups', 'confirmation'].indexOf(currentStep) >= 0 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          {currentStep === 'confirmation' && campaignResult ? <CheckCircle className="w-4 h-4" /> : '1'}
        </div>
        <div className="mx-2 text-xs font-medium text-blue-500">Produtos</div>
        
        <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />
        
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
          ['groups', 'confirmation'].indexOf(currentStep) >= 0 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          2
        </div>
        <div className="mx-2 text-xs font-medium text-blue-500">Grupos</div>
        
        <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />
        
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
          currentStep === 'confirmation' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          {currentStep === 'confirmation' && campaignResult ? <CheckCircle className="w-4 h-4" /> : '3'}
        </div>
        <div className="mx-2 text-xs font-medium text-green-500">Confirmação</div>
      </div>
    </div>
  )

  const renderProductsStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Produtos Selecionados</h3>
        <p className="text-sm text-gray-600 mb-4">
          {selectedProducts.length} produto(s) serão enviados via WhatsApp
        </p>
      </div>
      
      <div className="max-h-60 overflow-y-auto space-y-2">
        {selectedProducts.map((product) => (
          <Card key={product.id} className="p-3">
            <div className="flex items-center gap-3">
              <img 
                src={product.imageUrl} 
                alt={product.title}
                className="w-12 h-12 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{product.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">{product.platform}</Badge>
                  <span className="text-sm font-semibold text-green-600">
                    R$ {product.price.toFixed(2)}
                  </span>
                  {product.discount && (
                    <Badge variant="secondary" className="text-xs text-red-600">
                      {product.discount}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      <div className="flex justify-end">
        <Button onClick={() => setCurrentStep('groups')}>
          Próximo: Selecionar Grupos
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )

  const renderGroupsStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Selecionar Grupos do WhatsApp</h3>
        <p className="text-sm text-gray-600 mb-4">
          Escolha os grupos que receberão os produtos
        </p>
      </div>

      {/* Campaign Settings */}
      <Card className="p-4 bg-gray-50">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Nome da Campanha</label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Digite o nome da campanha..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Agendar Envio (Opcional)</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {!scheduledAt && (
              <p className="text-xs text-gray-500 mt-1">Deixe vazio para enviar imediatamente</p>
            )}
          </div>
        </div>
      </Card>

      {groupsLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2">Carregando grupos...</span>
        </div>
      ) : groupsError ? (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">Erro ao carregar grupos do WhatsApp</p>
          <p className="text-sm text-gray-500 mt-1">Verifique se o WhatsApp está conectado</p>
        </div>
      ) : (
        <>
          {/* Select All */}
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all-groups"
                  checked={groups.length > 0 && selectedGroups.size === groups.length}
                  onCheckedChange={handleSelectAllGroups}
                />
                <label htmlFor="select-all-groups" className="text-sm font-medium cursor-pointer">
                  Selecionar todos os grupos ({groups.length})
                </label>
              </div>
              <div className="text-sm text-gray-600">
                {selectedGroups.size} selecionados
              </div>
            </div>
          </Card>

          {/* Groups List */}
          <div className="max-h-48 overflow-y-auto space-y-2">
            {groups.map((group) => (
              <Card 
                key={group.id} 
                className={`p-3 cursor-pointer transition-all ${
                  selectedGroups.has(group.groupId) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => handleGroupToggle(group.groupId, !selectedGroups.has(group.groupId))}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`group-${group.id}`}
                    checked={selectedGroups.has(group.groupId)}
                    onCheckedChange={(checked) => handleGroupToggle(group.groupId, checked)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{group.name}</h4>
                      <div className="flex items-center gap-2">
                        {group._count && (
                          <Badge variant="outline" className="text-xs">
                            <Users className="w-3 h-3 mr-1" />
                            {group._count.members}
                          </Badge>
                        )}
                        {group.tags && group.tags.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {group.tags[0]}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {groups.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Nenhum grupo encontrado</p>
              <p className="text-sm text-gray-500 mt-1">
                Sincronize seus grupos do WhatsApp primeiro
              </p>
            </div>
          )}
        </>
      )}
      
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => setCurrentStep('products')}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button 
          onClick={handleSubmitCampaign}
          disabled={selectedGroups.size === 0 || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Enviar Campanha
            </>
          )}
        </Button>
      </div>
    </div>
  )

  const renderConfirmationStep = () => (
    <div className="space-y-4 text-center">
      <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      
      <h3 className="text-lg font-semibold text-green-800">Campanha Criada com Sucesso!</h3>
      
      {campaignResult && (
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Produtos:</span>
              <div className="text-green-700">{campaignResult.campaign.productsProcessed}</div>
            </div>
            <div>
              <span className="font-medium">Mensagens:</span>
              <div className="text-green-700">{campaignResult.campaign.messagesCreated}</div>
            </div>
            <div>
              <span className="font-medium">Destinatários:</span>
              <div className="text-green-700">{campaignResult.campaign.recipientsReached}</div>
            </div>
            <div>
              <span className="font-medium">Duração Estimada:</span>
              <div className="text-green-700">{campaignResult.campaign.estimatedDuration} min</div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2 text-sm text-gray-600">
        <p>✅ Suas mensagens foram agendadas com sucesso</p>
        <p>📱 Elas serão enviadas automaticamente para os grupos selecionados</p>
        <p>📊 Você pode acompanhar o progresso no dashboard</p>
      </div>

      <div className="flex gap-2 justify-center">
        <Button variant="outline" onClick={() => window.location.href = '/campanhas'}>
          Ver Campanhas
        </Button>
        <Button onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold">Enviar pelo WhatsApp</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {renderStepIndicator()}
          
          {currentStep === 'products' && renderProductsStep()}
          {currentStep === 'groups' && renderGroupsStep()}
          {currentStep === 'confirmation' && renderConfirmationStep()}
        </div>
      </div>
    </div>
  )
}