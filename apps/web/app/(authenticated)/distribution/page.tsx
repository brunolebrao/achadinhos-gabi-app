'use client'

import { useState } from 'react'
import { Card } from '@repo/ui/card'
import { Button } from '@repo/ui/button'
import { Badge } from '@repo/ui/badge'
import { 
  Send, 
  Clock, 
  Users, 
  Target,
  TrendingUp,
  Instagram,
  Music2,
  MessageCircle,
  CheckCircle,
  AlertCircle,
  Calendar,
  Filter
} from 'lucide-react'

interface Product {
  id: string
  title: string
  price: number
  originalPrice: number
  discount: string
  imageUrl: string
  platform: string
  category: string
  selected?: boolean
}

export default function DistributionPage() {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram'])
  const [distributionMode, setDistributionMode] = useState<'now' | 'schedule'>('now')

  const products: Product[] = [
    {
      id: '1',
      title: 'Fone Bluetooth Premium',
      price: 89.90,
      originalPrice: 149.90,
      discount: '-40%',
      imageUrl: '/api/placeholder/200/200',
      platform: 'MERCADOLIVRE',
      category: 'Eletrônicos'
    },
    {
      id: '2',
      title: 'Kit Skincare Completo',
      price: 129.90,
      originalPrice: 199.90,
      discount: '-35%',
      imageUrl: '/api/placeholder/200/200',
      platform: 'SHOPEE',
      category: 'Beleza'
    },
    {
      id: '3',
      title: 'Tênis Esportivo Nike',
      price: 249.90,
      originalPrice: 399.90,
      discount: '-37%',
      imageUrl: '/api/placeholder/200/200',
      platform: 'AMAZON',
      category: 'Moda'
    }
  ]

  const platforms = [
    { 
      id: 'instagram', 
      name: 'Instagram', 
      icon: Instagram, 
      color: 'from-purple-500 to-pink-500',
      stats: { reach: '15.4K', engagement: '4.5%' }
    },
    { 
      id: 'tiktok', 
      name: 'TikTok', 
      icon: Music2, 
      color: 'from-black to-gray-800',
      stats: { reach: '8.9K', engagement: '7.2%' }
    },
    { 
      id: 'whatsapp', 
      name: 'WhatsApp', 
      icon: MessageCircle, 
      color: 'from-green-500 to-green-600',
      stats: { reach: '2.3K', engagement: '12.1%' }
    }
  ]

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const togglePlatformSelection = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    )
  }

  const handleDistribute = () => {
    console.log('Distributing:', {
      products: selectedProducts,
      platforms: selectedPlatforms,
      mode: distributionMode
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Central de Distribuição</h1>
          <p className="text-gray-600 mt-2">
            Publique produtos em múltiplas plataformas simultaneamente
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Histórico
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Selection */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Selecione os Produtos</h2>
              <Badge variant="secondary">
                {selectedProducts.length} selecionados
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map(product => (
                <Card
                  key={product.id}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedProducts.includes(product.id)
                      ? 'border-purple-500 bg-purple-50'
                      : 'hover:border-gray-300'
                  }`}
                  onClick={() => toggleProductSelection(product.id)}
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-medium text-sm mb-1 line-clamp-2">
                        {product.title}
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg font-bold text-green-600">
                          R$ {product.price}
                        </span>
                        <Badge variant="destructive" className="text-xs">
                          {product.discount}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {product.platform}
                        </Badge>
                        {selectedProducts.includes(product.id) && (
                          <CheckCircle className="w-5 h-5 text-purple-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-4 flex justify-between items-center">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedProducts(products.map(p => p.id))}
              >
                Selecionar Todos
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedProducts([])}
              >
                Limpar Seleção
              </Button>
            </div>
          </Card>

          {/* Platform Selection */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Plataformas de Destino</h2>
            
            <div className="space-y-3">
              {platforms.map(platform => {
                const Icon = platform.icon
                return (
                  <div
                    key={platform.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedPlatforms.includes(platform.id)
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => togglePlatformSelection(platform.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-r ${platform.color} text-white`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-medium">{platform.name}</h3>
                          <div className="flex gap-4 mt-1">
                            <span className="text-xs text-gray-500">
                              Alcance: {platform.stats.reach}
                            </span>
                            <span className="text-xs text-gray-500">
                              Engajamento: {platform.stats.engagement}
                            </span>
                          </div>
                        </div>
                      </div>
                      {selectedPlatforms.includes(platform.id) && (
                        <CheckCircle className="w-5 h-5 text-purple-500" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Distribution Settings */}
        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Configurações de Envio</h2>

            {/* Distribution Mode */}
            <div className="space-y-3 mb-6">
              <label className="text-sm font-medium text-gray-700">
                Quando enviar?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={distributionMode === 'now' ? 'default' : 'outline'}
                  onClick={() => setDistributionMode('now')}
                  className="justify-start"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Agora
                </Button>
                <Button
                  variant={distributionMode === 'schedule' ? 'default' : 'outline'}
                  onClick={() => setDistributionMode('schedule')}
                  className="justify-start"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Agendar
                </Button>
              </div>
            </div>

            {distributionMode === 'schedule' && (
              <div className="space-y-3 mb-6">
                <label className="text-sm font-medium text-gray-700">
                  Data e Hora
                </label>
                <input
                  type="datetime-local"
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            )}

            {/* Audience */}
            <div className="space-y-3 mb-6">
              <label className="text-sm font-medium text-gray-700">
                Audiência
              </label>
              <select className="w-full p-2 border rounded-lg">
                <option>Todos os Seguidores</option>
                <option>Engajados (Últimos 30 dias)</option>
                <option>Alta Conversão</option>
                <option>Personalizado...</option>
              </select>
            </div>

            {/* Template */}
            <div className="space-y-3 mb-6">
              <label className="text-sm font-medium text-gray-700">
                Template
              </label>
              <select className="w-full p-2 border rounded-lg">
                <option>Oferta Flash</option>
                <option>Desconto Especial</option>
                <option>Novo Produto</option>
                <option>Personalizado...</option>
              </select>
            </div>
          </Card>

          {/* Preview Stats */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Previsão de Alcance</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Alcance Total</span>
                <span className="font-semibold">~26.6K</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Engajamento Médio</span>
                <span className="font-semibold">7.9%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Cliques Estimados</span>
                <span className="font-semibold">~2.1K</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <div className="flex gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-yellow-800">
                  Melhor horário para Instagram: 19h-21h
                </div>
              </div>
            </div>
          </Card>

          {/* Action Button */}
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleDistribute}
            disabled={selectedProducts.length === 0 || selectedPlatforms.length === 0}
          >
            <Send className="w-4 h-4 mr-2" />
            {distributionMode === 'now' ? 'Publicar Agora' : 'Agendar Publicação'}
          </Button>
        </div>
      </div>
    </div>
  )
}