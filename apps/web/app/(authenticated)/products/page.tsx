"use client"

import { useState } from "react"
import { Package } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card"
import { Button } from "@repo/ui/button"
import { 
  Filter, 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock,
  ExternalLink,
  Loader2,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  CheckCircle2,
  ChevronDown,
  MoreHorizontal,
  Check,
  X,
  RotateCcw,
  Grid3X3,
  List,
  LayoutGrid,
  Download,
  Calendar
} from "lucide-react"
import { useProducts } from "../../../lib/hooks/useProducts"
import { useProductsStore } from "../../../lib/stores/products.store"
import { Platform, Product, ProductStatus } from "../../../lib/api/types"
import { SendToWhatsAppModal } from "../../../components/SendToWhatsAppModal"
import { DeleteConfirmationModal } from "../../../components/ConfirmationModal"
import { ProductFilters } from "../../../components/products/ProductFilters"
import { ProductGrid } from "../../../components/products/ProductGrid"
import { ProductPreviewModal } from "../../../components/products/ProductPreviewModal"
import { ProductMetrics } from "../../../components/products/ProductMetrics"
import { SelectedProductsBar } from "../../../components/products/SelectedProductsBar"
import { ProductGroupedView } from "../../../components/products/ProductGroupedView"
import { BulkSelectionTools } from "../../../components/products/BulkSelectionTools"
import { Toaster, toast } from "sonner"
import { useKeyboardShortcuts } from "../../../hooks/useKeyboardShortcuts"
import { exportProductsToCsv } from "../../../utils/exportCsv"

const statusMap: Record<ProductStatus, { label: string; color: string; icon: any }> = {
  PENDING: { label: "Pendente", color: "text-yellow-600 bg-yellow-100", icon: Clock },
  APPROVED: { label: "Aprovado", color: "text-green-600 bg-green-100", icon: CheckCircle },
  REJECTED: { label: "Rejeitado", color: "text-red-600 bg-red-100", icon: XCircle },
  SENT: { label: "Enviado", color: "text-blue-600 bg-blue-100", icon: CheckCircle }
}

const platformColors: Record<Platform, string> = {
  MERCADOLIVRE: "bg-yellow-500",
  SHOPEE: "bg-orange-500", 
  AMAZON: "bg-gray-800",
  ALIEXPRESS: "bg-red-500"
}

export default function ProductsPage() {
  const {
    products,
    pagination,
    filters,
    isLoading,
    error,
    updateFilters,
    goToPage,
    refresh
  } = useProducts()

  const {
    updateProductStatus,
    deleteProduct,
    bulkDeleteProducts,
    isUpdating,
    isDeleting
  } = useProductsStore()

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [showSendModal, setShowSendModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null)
  const [useGroupedView, setUseGroupedView] = useState(true)

  const handleStatusUpdate = async (productId: string, newStatus: ProductStatus) => {
    setUpdatingId(productId)
    try {
      await updateProductStatus(productId, newStatus)
      const statusLabel = statusMap[newStatus].label.toLowerCase()
      toast.success(`Produto ${statusLabel} com sucesso!`)
    } catch (error) {
      console.error('Failed to update status:', error)
      toast.error('Erro ao atualizar status do produto')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('Tem certeza que deseja deletar este produto?')) return
    
    setDeletingId(productId)
    try {
      await deleteProduct(productId)
      // Remove from selected products if it was selected
      setSelectedProducts(prev => prev.filter(id => id !== productId))
    } catch (error) {
      console.error('Failed to delete product:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const handleProductSelect = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(products.map(p => p.id))
    }
  }

  const selectedProductsData = products.filter(p => selectedProducts.includes(p.id))

  // Status dropdown component
  const StatusDropdown = ({ product, isUpdating }: { product: any, isUpdating: boolean }) => {
    const [isOpen, setIsOpen] = useState(false)
    
    const getStatusActions = (currentStatus: ProductStatus) => {
      const actions = []
      if (currentStatus !== 'APPROVED') {
        actions.push({
          label: 'Aprovar',
          value: 'APPROVED' as ProductStatus,
          icon: Check,
          color: 'text-green-600 hover:bg-green-50'
        })
      }
      if (currentStatus !== 'REJECTED') {
        actions.push({
          label: 'Rejeitar',
          value: 'REJECTED' as ProductStatus,
          icon: X,
          color: 'text-red-600 hover:bg-red-50'
        })
      }
      if (currentStatus !== 'PENDING') {
        actions.push({
          label: 'Pendente',
          value: 'PENDING' as ProductStatus,
          icon: RotateCcw,
          color: 'text-yellow-600 hover:bg-yellow-50'
        })
      }
      return actions
    }
    
    const actions = getStatusActions(product.status)
    
    if (actions.length === 0) return null
    
    return (
      <div className="relative inline-block text-left">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
        
        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-10">
            <div className="py-1">
              {actions.map((action) => {
                const IconComponent = action.icon
                return (
                  <button
                    key={action.value}
                    className={`block w-full text-left px-4 py-2 text-sm ${action.color} flex items-center`}
                    onClick={() => {
                      handleStatusUpdate(product.id, action.value)
                      setIsOpen(false)
                    }}
                  >
                    <IconComponent className="h-4 w-4 mr-2" />
                    {action.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        
        {/* Click outside to close */}
        {isOpen && (
          <div
            className="fixed inset-0 z-0"
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
    )
  }

  const handleSendToWhatsApp = () => {
    if (selectedProducts.length > 0) {
      setShowSendModal(true)
    }
  }

  const handleBulkStatusUpdate = async (newStatus: ProductStatus) => {
    if (selectedProducts.length === 0) return
    
    const confirmMessage = `Tem certeza que deseja ${statusMap[newStatus].label.toLowerCase()} ${selectedProducts.length} produto(s)?`
    if (!confirm(confirmMessage)) return

    try {
      const promises = selectedProducts.map(productId => 
        updateProductStatus(productId, newStatus)
      )
      
      await Promise.all(promises)
      
      const statusLabel = statusMap[newStatus].label.toLowerCase()
      toast.success(`${selectedProducts.length} produto(s) ${statusLabel}(s) com sucesso!`)
      setSelectedProducts([])
    } catch (error) {
      console.error('Failed to bulk update status:', error)
      toast.error('Erro ao atualizar status dos produtos')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return

    try {
      const result = await bulkDeleteProducts(selectedProducts)
      toast.success(result.message)
      setSelectedProducts([])
      setShowDeleteModal(false)
      // Refresh the products list
      refresh()
    } catch (error) {
      console.error('Failed to bulk delete:', error)
      toast.error('Erro ao excluir produtos')
    }
  }

  const handleExportCsv = () => {
    if (products.length === 0) {
      toast.error('Nenhum produto para exportar')
      return
    }

    const productsToExport = selectedProducts.length > 0
      ? products.filter(p => selectedProducts.includes(p.id))
      : products

    exportProductsToCsv(productsToExport, 'produtos_achadinhos')
    toast.success(`${productsToExport.length} produto(s) exportado(s) com sucesso!`)
  }

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'r',
      ctrl: true,
      action: () => {
        refresh()
        toast.success('Lista atualizada')
      },
      description: 'Atualizar lista'
    },
    {
      key: 'a',
      ctrl: true,
      action: () => {
        handleSelectAll()
      },
      description: 'Selecionar todos'
    },
    {
      key: 'g',
      action: () => {
        setViewMode(viewMode === 'grid' ? 'list' : 'grid')
      },
      description: 'Alternar visualização'
    },
    {
      key: 'f',
      ctrl: true,
      action: () => {
        const searchInput = document.querySelector('input[placeholder*="Buscar"]') as HTMLInputElement
        searchInput?.focus()
      },
      description: 'Focar na busca'
    },
    {
      key: 'w',
      ctrl: true,
      action: () => {
        if (selectedProducts.length > 0) {
          setShowSendModal(true)
        } else {
          toast.error('Selecione produtos primeiro')
        }
      },
      description: 'Enviar para WhatsApp'
    },
    {
      key: 'e',
      ctrl: true,
      action: () => {
        handleExportCsv()
      },
      description: 'Exportar CSV'
    },
    {
      key: 'Escape',
      action: () => {
        setSelectedProducts([])
        setPreviewProduct(null)
        setShowSendModal(false)
        setShowDeleteModal(false)
      },
      description: 'Fechar modais/limpar seleção'
    }
  ])

  return (
    <>
      <Toaster position="top-right" />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Produtos</h1>
            <p className="mt-2 text-sm text-gray-600">
              Gerencie produtos encontrados pelos scrapers
            </p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline"
              onClick={handleExportCsv}
              disabled={products.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Button 
              variant="outline"
              onClick={refresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Produto
            </Button>
          </div>
        </div>

        {/* Métricas */}
        {!isLoading && products.length > 0 && (
          <ProductMetrics products={products} />
        )}

        {/* Filtros */}
        <ProductFilters
          filters={filters}
          onFiltersChange={updateFilters}
          productCount={pagination.total}
        />

        {/* Ferramentas de Seleção em Massa */}
        {!isLoading && products.length > 0 && (
          <BulkSelectionTools
            products={products}
            selectedProducts={selectedProducts}
            onSelectProducts={setSelectedProducts}
            onClearSelection={() => setSelectedProducts([])}
          />
        )}

        {/* Lista de Produtos */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>
                  {isLoading ? 'Carregando...' : `${pagination.total} produtos encontrados`}
                </CardTitle>
                <CardDescription>
                  Produtos coletados pelos scrapers automatizados
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant={useGroupedView ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUseGroupedView(!useGroupedView)}
                  title="Agrupar por data"
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Agrupar
                </Button>
                <div className="flex space-x-1 border-l pl-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {error && (
              <div className="p-4 bg-red-50 border-b border-red-200">
                <div className="flex items-center text-red-700">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum produto encontrado</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Comece adicionando produtos ou ajuste os filtros.
                </p>
                <div className="mt-6">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Produto
                  </Button>
                </div>
              </div>
            ) : useGroupedView ? (
              <>
                {/* Grouped View */}
                <div className="p-6">
                  <ProductGroupedView
                    products={products}
                    selectedProducts={selectedProducts}
                    onProductSelect={handleProductSelect}
                    onStatusUpdate={handleStatusUpdate}
                    onDelete={handleDelete}
                    onPreview={(product) => setPreviewProduct(product)}
                    isUpdating={updatingId}
                    isDeleting={deletingId}
                    viewMode={viewMode}
                    renderListView={(groupProducts) => (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <tbody className="bg-white divide-y divide-gray-200">
                            {groupProducts.map((product) => {
                              const statusInfo = statusMap[product.status as keyof typeof statusMap]
                              const StatusIcon = statusInfo.icon
                              
                              return (
                                <tr key={product.id} className={`hover:bg-gray-50 ${
                                  selectedProducts.includes(product.id) ? 'bg-blue-50 border-blue-200' : ''
                                }`}>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center">
                                      <input
                                        type="checkbox"
                                        checked={selectedProducts.includes(product.id)}
                                        onChange={() => handleProductSelect(product.id)}
                                        className="mr-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <div className="h-16 w-16 flex-shrink-0">
                                        <img 
                                          className="h-16 w-16 rounded-md object-cover" 
                                          src={product.imageUrl} 
                                          alt={product.title}
                                        />
                                      </div>
                                      <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-900 line-clamp-2">
                                          {product.title}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          {product.category}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900">
                                      <div className="font-bold text-lg">
                                        R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                      <StatusIcon className="w-3 h-3 mr-1" />
                                      {statusInfo.label}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => setPreviewProduct(product)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  />
                </div>
              </>
            ) : viewMode === 'grid' ? (
              <>
                {/* Grid View */}
                <div className="p-6">
                  {selectedProducts.length === products.length && products.length > 0 && (
                    <div className="mb-4 flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">Todos selecionados</span>
                    </div>
                  )}
                  <ProductGrid
                    products={products}
                    selectedProducts={selectedProducts}
                    onProductSelect={handleProductSelect}
                    onStatusUpdate={handleStatusUpdate}
                    onDelete={handleDelete}
                    onPreview={(product) => setPreviewProduct(product)}
                    isUpdating={updatingId}
                    isDeleting={deletingId}
                  />
                </div>
              </>
            ) : (
              <>
                {/* List View (existing table) */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={selectedProducts.length === products.length && products.length > 0}
                              onChange={handleSelectAll}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>Produto</span>
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Preço
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Plataforma
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Métricas
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {products.map((product) => {
                        const statusInfo = statusMap[product.status as keyof typeof statusMap]
                        const StatusIcon = statusInfo.icon
                        
                        return (
                          <tr key={product.id} className={`hover:bg-gray-50 ${
                            selectedProducts.includes(product.id) ? 'bg-blue-50 border-blue-200' : ''
                          }`}>
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={selectedProducts.includes(product.id)}
                                  onChange={() => handleProductSelect(product.id)}
                                  className="mr-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="h-16 w-16 flex-shrink-0">
                                  <img 
                                    className="h-16 w-16 rounded-md object-cover" 
                                    src={product.imageUrl} 
                                    alt={product.title}
                                  />
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900 line-clamp-2">
                                    {product.title}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {product.category}
                                  </div>
                                </div>
                              </div>
                            </td>
                            
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">
                                <div className="font-bold text-lg">
                                  R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                                {product.originalPrice && (
                                  <div className="text-gray-500 line-through">
                                    R$ {product.originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </div>
                                )}
                                {product.discount && (
                                  <div className="text-green-600 font-medium">
                                    -{product.discount}
                                  </div>
                                )}
                              </div>
                            </td>
                            
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full mr-2 ${platformColors[product.platform as keyof typeof platformColors]}`}></div>
                                <span className="text-sm text-gray-900">
                                  {product.platform}
                                </span>
                              </div>
                            </td>
                            
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                  {updatingId === product.id ? (
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  ) : (
                                    <StatusIcon className="w-3 h-3 mr-1" />
                                  )}
                                  {statusInfo.label}
                                </span>
                                
                                {/* Quick action buttons for PENDING products */}
                                {product.status === 'PENDING' && updatingId !== product.id && (
                                  <div className="flex space-x-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleStatusUpdate(product.id, 'APPROVED' as ProductStatus)}
                                      className="h-6 w-6 p-0 text-green-600 hover:bg-green-50"
                                      title="Aprovar produto"
                                    >
                                      <Check className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleStatusUpdate(product.id, 'REJECTED' as ProductStatus)}
                                      className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                                      title="Rejeitar produto"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </td>
                            
                            <td className="px-6 py-4 text-sm text-gray-500">
                              <div>⭐ {product.ratings || 0} ({product.reviewCount || 0} avaliações)</div>
                              <div>🛒 {product.salesCount || 0} vendas</div>
                            </td>
                            
                            <td className="px-6 py-4 text-right text-sm font-medium">
                              <div className="flex items-center justify-end space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setPreviewProduct(product)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => window.open(product.productUrl, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <StatusDropdown 
                                  product={product} 
                                  isUpdating={updatingId === product.id} 
                                />
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDelete(product.id)}
                                  disabled={deletingId === product.id}
                                >
                                  {deletingId === product.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            
            {/* Paginação unificada */}
            {!isLoading && products.length > 0 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <Button 
                    variant="outline"
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    Anterior
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Próximo
                  </Button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Mostrando{" "}
                      <span className="font-medium">
                        {(pagination.page - 1) * pagination.limit + 1}
                      </span>{" "}
                      a{" "}
                      <span className="font-medium">
                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                      </span>{" "}
                      de{" "}
                      <span className="font-medium">{pagination.total}</span> resultados
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => goToPage(pagination.page - 1)}
                        disabled={pagination.page === 1}
                      >
                        Anterior
                      </Button>
                      
                      {[...Array(Math.min(5, pagination.totalPages))].map((_, idx) => {
                        const pageNum = idx + 1
                        return (
                          <Button 
                            key={pageNum}
                            variant={pageNum === pagination.page ? "default" : "outline"} 
                            size="sm"
                            onClick={() => goToPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                      
                      {pagination.totalPages > 5 && (
                        <>
                          <span className="px-2 text-gray-500">...</span>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => goToPage(pagination.totalPages)}
                          >
                            {pagination.totalPages}
                          </Button>
                        </>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => goToPage(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                      >
                        Próximo
                      </Button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Products Bar */}
        <SelectedProductsBar
          selectedCount={selectedProducts.length}
          selectedProducts={selectedProductsData}
          onClearSelection={() => setSelectedProducts([])}
          onBulkStatusUpdate={handleBulkStatusUpdate}
          onBulkDelete={() => setShowDeleteModal(true)}
          onSendWhatsApp={handleSendToWhatsApp}
          onExportCsv={handleExportCsv}
        />

        {/* Send to WhatsApp Modal */}
        <SendToWhatsAppModal
          isOpen={showSendModal}
          onClose={() => setShowSendModal(false)}
          selectedProducts={selectedProductsData}
        />

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleBulkDelete}
          itemName={`${selectedProducts.length} produto${selectedProducts.length !== 1 ? 's' : ''}`}
          itemType="produtos"
          loading={isDeleting}
        />

        {/* Product Preview Modal */}
        <ProductPreviewModal
          product={previewProduct}
          isOpen={!!previewProduct}
          onClose={() => setPreviewProduct(null)}
          onStatusUpdate={handleStatusUpdate}
          onSendWhatsApp={(productId) => {
            setSelectedProducts([productId])
            setShowSendModal(true)
          }}
        />
      </div>
    </>
  )
}