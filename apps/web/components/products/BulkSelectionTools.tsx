"use client"

import { useState } from "react"
import { 
  CheckSquare,
  Square,
  Filter,
  Calendar,
  DollarSign,
  Package,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react"
import { Button } from "@repo/ui/button"
import { Card, CardContent } from "@repo/ui/card"
import { Badge } from "@repo/ui/badge"
import { Product, ProductStatus, Platform } from "../../lib/api/types"

interface BulkSelectionToolsProps {
  products: Product[]
  selectedProducts: string[]
  onSelectProducts: (productIds: string[]) => void
  onClearSelection: () => void
}

export function BulkSelectionTools({
  products,
  selectedProducts,
  onSelectProducts,
  onClearSelection
}: BulkSelectionToolsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const selectAll = () => {
    onSelectProducts(products.map(p => p.id))
  }

  const selectByStatus = (status: ProductStatus) => {
    const filtered = products.filter(p => p.status === status)
    onSelectProducts(filtered.map(p => p.id))
  }

  const selectByPlatform = (platform: Platform) => {
    const filtered = products.filter(p => p.platform === platform)
    onSelectProducts(filtered.map(p => p.id))
  }

  const selectByPriceRange = (min: number, max: number) => {
    const filtered = products.filter(p => p.price >= min && p.price <= max)
    onSelectProducts(filtered.map(p => p.id))
  }

  const selectWithDiscount = (minDiscount: number = 0) => {
    const filtered = products.filter(p => {
      if (!p.originalPrice) return false
      const discount = ((p.originalPrice - p.price) / p.originalPrice) * 100
      return discount >= minDiscount
    })
    onSelectProducts(filtered.map(p => p.id))
  }

  const selectToday = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const filtered = products.filter(p => {
      const productDate = new Date(p.createdAt)
      productDate.setHours(0, 0, 0, 0)
      return productDate.getTime() === today.getTime()
    })
    onSelectProducts(filtered.map(p => p.id))
  }

  const selectThisWeek = () => {
    const now = new Date()
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
    weekStart.setHours(0, 0, 0, 0)
    
    const filtered = products.filter(p => {
      const productDate = new Date(p.createdAt)
      return productDate >= weekStart
    })
    onSelectProducts(filtered.map(p => p.id))
  }

  const invertSelection = () => {
    const inverted = products
      .filter(p => !selectedProducts.includes(p.id))
      .map(p => p.id)
    onSelectProducts(inverted)
  }

  const isAllSelected = products.length > 0 && selectedProducts.length === products.length

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Quick Selection Tools */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant={isAllSelected ? "default" : "outline"}
                size="sm"
                onClick={isAllSelected ? onClearSelection : selectAll}
              >
                {isAllSelected ? (
                  <>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Desmarcar Todos
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Selecionar Todos
                  </>
                )}
              </Button>

              {selectedProducts.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={invertSelection}
                  >
                    Inverter Seleção
                  </Button>
                  <Badge variant="secondary" className="ml-2">
                    {selectedProducts.length} de {products.length} selecionados
                  </Badge>
                </>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showAdvanced ? 'Ocultar' : 'Mostrar'} Seleção Avançada
            </Button>
          </div>

          {/* Advanced Selection Options */}
          {showAdvanced && (
            <div className="pt-3 border-t space-y-3">
              {/* By Status */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Selecionar por Status:</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectByStatus('PENDING')}
                    className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Pendentes ({products.filter(p => p.status === 'PENDING').length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectByStatus('APPROVED')}
                    className="text-green-600 border-green-300 hover:bg-green-50"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Aprovados ({products.filter(p => p.status === 'APPROVED').length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectByStatus('REJECTED')}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Rejeitados ({products.filter(p => p.status === 'REJECTED').length})
                  </Button>
                </div>
              </div>

              {/* By Platform */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Selecionar por Plataforma:</p>
                <div className="flex flex-wrap gap-2">
                  {['MERCADOLIVRE', 'SHOPEE', 'AMAZON', 'ALIEXPRESS'].map(platform => {
                    const count = products.filter(p => p.platform === platform).length
                    if (count === 0) return null
                    
                    return (
                      <Button
                        key={platform}
                        variant="outline"
                        size="sm"
                        onClick={() => selectByPlatform(platform as Platform)}
                      >
                        <Package className="h-4 w-4 mr-1" />
                        {platform} ({count})
                      </Button>
                    )
                  })}
                </div>
              </div>

              {/* By Date */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Selecionar por Data:</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectToday}
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Hoje
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectThisWeek}
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Esta Semana
                  </Button>
                </div>
              </div>

              {/* By Price/Discount */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Selecionar por Preço/Desconto:</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectByPriceRange(0, 50)}
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    Até R$ 50
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectByPriceRange(50, 100)}
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    R$ 50-100
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectByPriceRange(100, 99999)}
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    Acima de R$ 100
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectWithDiscount(30)}
                    className="text-green-600 border-green-300 hover:bg-green-50"
                  >
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Desconto 30%+
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectWithDiscount(50)}
                    className="text-green-600 border-green-300 hover:bg-green-50"
                  >
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Desconto 50%+
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}