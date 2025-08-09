"use client"

import { useState, useEffect } from "react"
import { 
  Filter, 
  X, 
  ChevronDown,
  DollarSign,
  Percent,
  Calendar,
  Tag
} from "lucide-react"
import { Button } from "@repo/ui/button"
import { Card, CardContent } from "@repo/ui/card"
import { Badge } from "@repo/ui/badge"
import { ProductStatus, Platform } from "../../lib/api/types"

interface FilterState {
  searchTerm?: string
  status?: ProductStatus
  platform?: Platform
  minPrice?: number
  maxPrice?: number
  minDiscount?: number
  categories?: string[]
  dateRange?: 'today' | 'week' | 'month' | 'all'
}

interface ProductFiltersProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  availableCategories?: string[]
  productCount?: number
}

export function ProductFilters({ 
  filters, 
  onFiltersChange, 
  availableCategories = [],
  productCount = 0
}: ProductFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [localFilters, setLocalFilters] = useState<FilterState>(filters)
  
  // Sync local filters with props
  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
  }

  const applyFilters = () => {
    onFiltersChange(localFilters)
  }

  const clearFilters = () => {
    const clearedFilters: FilterState = {}
    setLocalFilters(clearedFilters)
    onFiltersChange(clearedFilters)
  }

  const hasActiveFilters = () => {
    return !!(
      filters.minPrice || 
      filters.maxPrice || 
      filters.minDiscount || 
      filters.categories?.length || 
      filters.dateRange && filters.dateRange !== 'all'
    )
  }

  const activeFilterCount = () => {
    let count = 0
    if (filters.minPrice || filters.maxPrice) count++
    if (filters.minDiscount) count++
    if (filters.categories?.length) count++
    if (filters.dateRange && filters.dateRange !== 'all') count++
    return count
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Main filters row */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar produtos..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={localFilters.searchTerm || ''}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            <select
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={localFilters.status || 'all'}
              onChange={(e) => {
                const value = e.target.value === 'all' ? undefined : e.target.value as ProductStatus
                handleFilterChange('status', value)
                applyFilters()
              }}
            >
              <option value="all">Todos os status</option>
              <option value="PENDING">Pendente</option>
              <option value="APPROVED">Aprovado</option>
              <option value="REJECTED">Rejeitado</option>
              <option value="SENT">Enviado</option>
            </select>
            
            <select
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={localFilters.platform || 'all'}
              onChange={(e) => {
                const value = e.target.value === 'all' ? undefined : e.target.value as Platform
                handleFilterChange('platform', value)
                applyFilters()
              }}
            >
              <option value="all">Todas as plataformas</option>
              <option value="MERCADOLIVRE">Mercado Livre</option>
              <option value="SHOPEE">Shopee</option>
              <option value="AMAZON">Amazon</option>
              <option value="ALIEXPRESS">AliExpress</option>
            </select>
            
            <Button 
              variant="outline"
              onClick={() => setIsExpanded(!isExpanded)}
              className={hasActiveFilters() ? 'border-blue-500 text-blue-600' : ''}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {activeFilterCount() > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount()}
                </Badge>
              )}
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </Button>

            {hasActiveFilters() && (
              <Button 
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {/* Advanced filters - expandable */}
          {isExpanded && (
            <div className="pt-4 border-t border-gray-200 animate-in slide-in-from-top-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Price Range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <DollarSign className="h-4 w-4 mr-1" />
                    Faixa de Preço
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                      value={localFilters.minPrice || ''}
                      onChange={(e) => handleFilterChange('minPrice', e.target.value ? Number(e.target.value) : undefined)}
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                      value={localFilters.maxPrice || ''}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </div>
                </div>

                {/* Discount */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <Percent className="h-4 w-4 mr-1" />
                    Desconto Mínimo
                  </label>
                  <select
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                    value={localFilters.minDiscount || ''}
                    onChange={(e) => handleFilterChange('minDiscount', e.target.value ? Number(e.target.value) : undefined)}
                  >
                    <option value="">Qualquer desconto</option>
                    <option value="10">10% ou mais</option>
                    <option value="20">20% ou mais</option>
                    <option value="30">30% ou mais</option>
                    <option value="40">40% ou mais</option>
                    <option value="50">50% ou mais</option>
                    <option value="70">70% ou mais</option>
                  </select>
                </div>

                {/* Date Range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Período
                  </label>
                  <select
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                    value={localFilters.dateRange || 'all'}
                    onChange={(e) => handleFilterChange('dateRange', e.target.value as any)}
                  >
                    <option value="all">Todos</option>
                    <option value="today">Hoje</option>
                    <option value="week">Esta semana</option>
                    <option value="month">Este mês</option>
                  </select>
                </div>

                {/* Categories */}
                {availableCategories.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center">
                      <Tag className="h-4 w-4 mr-1" />
                      Categorias
                    </label>
                    <select
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                      value={localFilters.categories?.[0] || ''}
                      onChange={(e) => handleFilterChange('categories', e.target.value ? [e.target.value] : undefined)}
                    >
                      <option value="">Todas as categorias</option>
                      {availableCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-4 space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    applyFilters()
                    setIsExpanded(false)
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Aplicar Filtros
                </Button>
              </div>
            </div>
          )}

          {/* Active filters display */}
          {hasActiveFilters() && (
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-sm text-gray-500">Filtros ativos:</span>
              
              {(localFilters.minPrice || localFilters.maxPrice) && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  R$ {localFilters.minPrice || 0} - {localFilters.maxPrice || '∞'}
                  <button
                    onClick={() => {
                      handleFilterChange('minPrice', undefined)
                      handleFilterChange('maxPrice', undefined)
                      applyFilters()
                    }}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {localFilters.minDiscount && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  {localFilters.minDiscount}%+
                  <button
                    onClick={() => {
                      handleFilterChange('minDiscount', undefined)
                      applyFilters()
                    }}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {localFilters.dateRange && localFilters.dateRange !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {localFilters.dateRange === 'today' && 'Hoje'}
                  {localFilters.dateRange === 'week' && 'Esta semana'}
                  {localFilters.dateRange === 'month' && 'Este mês'}
                  <button
                    onClick={() => {
                      handleFilterChange('dateRange', 'all')
                      applyFilters()
                    }}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}