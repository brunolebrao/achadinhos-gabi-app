"use client"

import { useState, useMemo } from "react"
import { 
  ChevronDown, 
  ChevronRight,
  Calendar,
  Package,
  Clock,
  TrendingUp
} from "lucide-react"
import { Button } from "@repo/ui/button"
import { Badge } from "@repo/ui/badge"
import { Product } from "../../lib/api/types"
import { ProductGrid } from "./ProductGrid"
import { format, isToday, isYesterday, isThisWeek, isThisMonth, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

interface ProductGroupedViewProps {
  products: Product[]
  selectedProducts: string[]
  onProductSelect: (productId: string) => void
  onStatusUpdate: (productId: string, status: any) => void
  onDelete: (productId: string) => void
  onPreview?: (product: Product) => void
  isUpdating?: string | null
  isDeleting?: string | null
  viewMode: 'grid' | 'list'
  renderListView: (products: Product[]) => React.ReactNode
}

interface ProductGroup {
  id: string
  label: string
  icon: React.ReactNode
  products: Product[]
  color: string
}

export function ProductGroupedView({
  products,
  selectedProducts,
  onProductSelect,
  onStatusUpdate,
  onDelete,
  onPreview,
  isUpdating,
  isDeleting,
  viewMode,
  renderListView
}: ProductGroupedViewProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // Group products by date
  const groupedProducts = useMemo(() => {
    const groups: ProductGroup[] = []
    
    const today: Product[] = []
    const yesterday: Product[] = []
    const thisWeek: Product[] = []
    const thisMonth: Product[] = []
    const older: Product[] = []

    products.forEach(product => {
      const date = parseISO(product.createdAt)
      
      if (isToday(date)) {
        today.push(product)
      } else if (isYesterday(date)) {
        yesterday.push(product)
      } else if (isThisWeek(date)) {
        thisWeek.push(product)
      } else if (isThisMonth(date)) {
        thisMonth.push(product)
      } else {
        older.push(product)
      }
    })

    if (today.length > 0) {
      groups.push({
        id: 'today',
        label: 'Hoje',
        icon: <Clock className="h-4 w-4" />,
        products: today,
        color: 'bg-blue-100 text-blue-700'
      })
    }

    if (yesterday.length > 0) {
      groups.push({
        id: 'yesterday',
        label: 'Ontem',
        icon: <Calendar className="h-4 w-4" />,
        products: yesterday,
        color: 'bg-purple-100 text-purple-700'
      })
    }

    if (thisWeek.length > 0) {
      groups.push({
        id: 'week',
        label: 'Esta Semana',
        icon: <TrendingUp className="h-4 w-4" />,
        products: thisWeek,
        color: 'bg-green-100 text-green-700'
      })
    }

    if (thisMonth.length > 0) {
      groups.push({
        id: 'month',
        label: 'Este Mês',
        icon: <Calendar className="h-4 w-4" />,
        products: thisMonth,
        color: 'bg-yellow-100 text-yellow-700'
      })
    }

    if (older.length > 0) {
      groups.push({
        id: 'older',
        label: 'Mais Antigos',
        icon: <Package className="h-4 w-4" />,
        products: older,
        color: 'bg-gray-100 text-gray-700'
      })
    }

    return groups
  }, [products])

  const toggleGroup = (groupId: string) => {
    const newCollapsed = new Set(collapsedGroups)
    if (newCollapsed.has(groupId)) {
      newCollapsed.delete(groupId)
    } else {
      newCollapsed.add(groupId)
    }
    setCollapsedGroups(newCollapsed)
  }

  const getGroupStats = (group: ProductGroup) => {
    const pending = group.products.filter(p => p.status === 'PENDING').length
    const approved = group.products.filter(p => p.status === 'APPROVED').length
    const avgPrice = group.products.reduce((sum, p) => sum + p.price, 0) / group.products.length
    
    return { pending, approved, avgPrice }
  }

  const selectAllInGroup = (group: ProductGroup) => {
    group.products.forEach(product => {
      if (!selectedProducts.includes(product.id)) {
        onProductSelect(product.id)
      }
    })
  }

  if (groupedProducts.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum produto encontrado</h3>
        <p className="mt-1 text-sm text-gray-500">
          Comece adicionando produtos ou ajuste os filtros.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {groupedProducts.map((group) => {
        const isCollapsed = collapsedGroups.has(group.id)
        const stats = getGroupStats(group)
        const selectedInGroup = group.products.filter(p => selectedProducts.includes(p.id)).length

        return (
          <div key={group.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Group Header */}
            <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleGroup(group.id)}
                  className="p-1"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </Button>
                
                <div className={`px-2 py-1 rounded-md flex items-center space-x-1 ${group.color}`}>
                  {group.icon}
                  <span className="font-medium">{group.label}</span>
                </div>

                <Badge variant="secondary">
                  {group.products.length} produtos
                </Badge>

                {stats.pending > 0 && (
                  <Badge variant="outline" className="bg-yellow-50">
                    {stats.pending} pendentes
                  </Badge>
                )}

                {stats.approved > 0 && (
                  <Badge variant="outline" className="bg-green-50">
                    {stats.approved} aprovados
                  </Badge>
                )}

                <span className="text-sm text-gray-500">
                  Média: R$ {stats.avgPrice.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {selectedInGroup > 0 && (
                  <Badge className="bg-blue-100 text-blue-700">
                    {selectedInGroup} selecionado{selectedInGroup > 1 ? 's' : ''}
                  </Badge>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectAllInGroup(group)}
                >
                  Selecionar todos
                </Button>
              </div>
            </div>

            {/* Group Content */}
            {!isCollapsed && (
              <div className="p-4">
                {viewMode === 'grid' ? (
                  <ProductGrid
                    products={group.products}
                    selectedProducts={selectedProducts}
                    onProductSelect={onProductSelect}
                    onStatusUpdate={onStatusUpdate}
                    onDelete={onDelete}
                    onPreview={onPreview}
                    isUpdating={isUpdating}
                    isDeleting={isDeleting}
                  />
                ) : (
                  renderListView(group.products)
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}