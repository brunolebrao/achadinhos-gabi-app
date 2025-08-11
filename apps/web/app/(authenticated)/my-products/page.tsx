"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card"
import { Button } from "@repo/ui/button"
import { Badge } from "@repo/ui/badge"
import { Checkbox } from "@repo/ui/checkbox"
import { 
  Package, 
  ExternalLink, 
  Copy, 
  TrendingDown,
  Calendar,
  Star,
  ShoppingCart,
  DollarSign,
  Filter,
  Search,
  Loader2,
  Bot,
  MessageSquare,
  Send,
  X,
  CheckSquare
} from "lucide-react"
import { toast } from "sonner"
import { WhatsAppCampaignModal } from "../../../components/WhatsAppCampaignModal"

interface Product {
  id: string
  title: string
  price: number
  originalPrice?: number
  discount?: string
  imageUrl: string
  productUrl: string
  affiliateUrl: string
  platform: 'MERCADOLIVRE' | 'AMAZON' | 'SHOPEE' | 'ALIEXPRESS'
  category: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SENT'
  cupom?: string
  ratings?: number
  reviewCount?: number
  salesCount?: number
  scrapedAt: string
  createdAt: string
  priceHistory: Array<{
    id: string
    price: number
    recordedAt: string
  }>
}

const platformColors = {
  MERCADOLIVRE: 'bg-yellow-500',
  AMAZON: 'bg-gray-800', 
  SHOPEE: 'bg-orange-500',
  ALIEXPRESS: 'bg-red-500'
}

const platformNames = {
  MERCADOLIVRE: 'Mercado Livre',
  AMAZON: 'Amazon',
  SHOPEE: 'Shopee',
  ALIEXPRESS: 'AliExpress'
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  SENT: 'bg-blue-100 text-blue-800'
}

const statusLabels = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado', 
  SENT: 'Enviado'
}

export default function MyProductsPage() {
  const { data: session, status } = useSession()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPlatform, setSelectedPlatform] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [showSendModal, setShowSendModal] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    userScrapers: 0,
    affiliateConfig: false
  })

  useEffect(() => {
    if (status === 'authenticated' && session?.accessToken) {
      fetchProducts()
    }
  }, [status, session])

  const fetchProducts = async () => {
    if (!session?.accessToken) return

    try {
      const params = new URLSearchParams({
        limit: '20',
        ...(searchTerm && { searchTerm }),
        ...(selectedPlatform !== 'all' && { platform: selectedPlatform }),
        ...(selectedStatus !== 'all' && { status: selectedStatus })
      })

      const response = await fetch(`http://localhost:3001/api/products/user?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setProducts(data.products)
        setStats({
          total: data.pagination.total,
          userScrapers: data.userScrapers,
          affiliateConfig: data.affiliateConfig
        })
      } else {
        toast.error('Erro ao carregar produtos')
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
      toast.error('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }

  const copyAffiliateUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link de afiliado copiado!')
    } catch (error) {
      toast.error('Erro ao copiar link')
    }
  }

  const handleSelectProduct = (productId: string, checked: boolean) => {
    const newSelected = new Set(selectedProducts)
    if (checked) {
      newSelected.add(productId)
    } else {
      newSelected.delete(productId)
    }
    setSelectedProducts(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(new Set(products.map(p => p.id)))
    } else {
      setSelectedProducts(new Set())
    }
  }

  const handleBulkStatusUpdate = async (status: 'APPROVED' | 'REJECTED' | 'SENT') => {
    if (selectedProducts.size === 0) return

    try {
      const response = await fetch('http://localhost:3001/api/products/bulk-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken}`
        },
        body: JSON.stringify({
          ids: Array.from(selectedProducts),
          status
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        setSelectedProducts(new Set())
        fetchProducts() // Refresh the list
      } else {
        toast.error('Erro ao atualizar produtos')
      }
    } catch (error) {
      console.error('Bulk update error:', error)
      toast.error('Erro ao atualizar produtos')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) return

    try {
      const response = await fetch('http://localhost:3001/api/products/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken}`
        },
        body: JSON.stringify({
          ids: Array.from(selectedProducts)
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        setSelectedProducts(new Set())
        fetchProducts() // Refresh the list
      } else {
        toast.error('Erro ao excluir produtos')
      }
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error('Erro ao excluir produtos')
    }
  }

  const handleSendToWhatsApp = () => {
    if (selectedProducts.size === 0) {
      toast.error('Selecione pelo menos um produto para enviar')
      return
    }
    setShowSendModal(true)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Não autenticado</h2>
          <p className="text-gray-600">Faça login para acessar esta página.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Package className="h-8 w-8" />
              Meus Produtos
            </h2>
            <p className="text-muted-foreground">
              Produtos encontrados pelos seus scrapers com seus links de afiliado
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                Encontrados pelos seus scrapers
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scrapers Ativos</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.userScrapers}</div>
              <p className="text-xs text-muted-foreground">
                Coletando produtos automaticamente
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Config. Afiliado</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.affiliateConfig ? '✅' : '❌'}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.affiliateConfig ? 'Configurado' : 'Não configurado'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar produtos..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">Todos os status</option>
                <option value="PENDING">Pendente</option>
                <option value="APPROVED">Aprovado</option>
                <option value="REJECTED">Rejeitado</option>
                <option value="SENT">Enviado</option>
              </select>
              
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
              >
                <option value="all">Todas as plataformas</option>
                <option value="MERCADOLIVRE">Mercado Livre</option>
                <option value="SHOPEE">Shopee</option>
                <option value="AMAZON">Amazon</option>
                <option value="ALIEXPRESS">AliExpress</option>
              </select>

              <Button onClick={fetchProducts}>
                <Filter className="h-4 w-4 mr-2" />
                Filtrar
              </Button>
            </div>
          </CardContent>
        </Card>

        {!stats.affiliateConfig && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-yellow-600" />
                <div>
                  <h3 className="font-semibold text-yellow-800">Configure seus links de afiliado</h3>
                  <p className="text-yellow-700 text-sm">
                    Para monetizar os produtos encontrados, configure seus IDs de afiliado nas configurações.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/settings/affiliates'}
                  className="ml-auto"
                >
                  Configurar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bulk Actions Bar */}
        {selectedProducts.size > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckSquare className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-800">
                    {selectedProducts.size} produto(s) selecionado(s)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkStatusUpdate('APPROVED')}
                    className="text-green-600 hover:text-green-700"
                  >
                    Aprovar Selecionados
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkStatusUpdate('REJECTED')}
                    className="text-red-600 hover:text-red-700"
                  >
                    Rejeitar Selecionados
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSendToWhatsApp}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Enviar pelo WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedProducts(new Set())}
                    className="text-gray-600 hover:text-gray-700"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Limpar Seleção
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {products.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
              <p className="text-gray-600 mb-4">
                Seus scrapers ainda não encontraram produtos, ou os filtros não retornaram resultados.
              </p>
              <div className="space-x-2">
                <Button onClick={() => window.location.href = '/scrapers'}>
                  <Bot className="h-4 w-4 mr-2" />
                  Ver Scrapers
                </Button>
                <Button variant="outline" onClick={fetchProducts}>
                  Atualizar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Select All Header */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all"
                      checked={
                        products.length > 0 && selectedProducts.size === products.length
                      }
                      onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                    />
                    <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                      {selectedProducts.size === products.length
                        ? 'Desmarcar todos'
                        : 'Selecionar todos'}
                      {products.length > 0 && ` (${products.length} produtos)`}
                    </label>
                  </div>
                  <div className="text-sm text-gray-600">
                    {selectedProducts.size > 0
                      ? `${selectedProducts.size} de ${products.length} selecionados`
                      : `${products.length} produtos encontrados`}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Products Grid */}
            <div className="grid gap-4">
            {products.map((product) => (
              <Card 
                key={product.id} 
                className={`hover:shadow-md transition-all ${
                  selectedProducts.has(product.id) 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : ''
                }`}
              >
                <CardContent className="p-6">
                  {/* Selection Checkbox */}
                  <div className="flex items-start gap-4">
                    <Checkbox
                      id={`product-${product.id}`}
                      checked={selectedProducts.has(product.id)}
                      onCheckedChange={(checked) => 
                        handleSelectProduct(product.id, checked as boolean)
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <img 
                        src={product.imageUrl} 
                        alt={product.title}
                        className="w-24 h-24 object-cover rounded-lg bg-gray-100"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zNSA2NUg2NVY3MEgzNVY2NVoiIGZpbGw9IiM5Q0E0QUYiLz4KPHBhdGggZD0iTTQ1IDQ1SDU1VjUwSDQ1VjQ1WiIgZmlsbD0iIzlDQTRBRiIvPgo8L3N2Zz4K"
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg line-clamp-2 mb-2">
                            {product.title}
                          </h3>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge 
                              className={`${platformColors[product.platform]} text-white`}
                              variant="secondary"
                            >
                              {platformNames[product.platform]}
                            </Badge>
                            <Badge 
                              className={statusColors[product.status]}
                              variant="outline"
                            >
                              {statusLabels[product.status]}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {product.category}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl font-bold text-green-600">
                              {formatPrice(product.price)}
                            </span>
                            {product.discount && (
                              <Badge variant="secondary" className="text-red-600">
                                <TrendingDown className="h-3 w-3 mr-1" />
                                {product.discount}
                              </Badge>
                            )}
                          </div>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <p className="text-sm text-gray-500 line-through">
                              {formatPrice(product.originalPrice)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Encontrado em: {formatDate(product.createdAt)}
                        </div>
                        {product.ratings && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {product.ratings.toFixed(1)}
                            {product.reviewCount && (
                              <span>({product.reviewCount})</span>
                            )}
                          </div>
                        )}
                        {product.salesCount && (
                          <div className="flex items-center gap-1">
                            <ShoppingCart className="h-3 w-3" />
                            {product.salesCount} vendidos
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyAffiliateUrl(product.affiliateUrl)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copiar Link
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(product.affiliateUrl, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Abrir
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            // Quick select this product and show send modal
                            setSelectedProducts(new Set([product.id]))
                            setShowSendModal(true)
                          }}
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Enviar este Produto
                        </Button>
                      </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          </div>
        )}

        {/* WhatsApp Campaign Modal */}
        <WhatsAppCampaignModal 
          isOpen={showSendModal}
          onClose={() => {
            setShowSendModal(false)
            setSelectedProducts(new Set()) // Clear selection after modal closes
          }}
          selectedProducts={products.filter(p => selectedProducts.has(p.id))}
        />
      </div>
  )
}