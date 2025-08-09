"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@repo/ui/card'
import { Button } from '@repo/ui/button'
import { Badge } from '@repo/ui/badge'
import { 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink,
  ShoppingCart,
  Tag,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface Product {
  id: string
  title: string
  price: number
  originalPrice?: number
  discount?: string
  imageUrl?: string
  productUrl: string
  platform: string
  category?: string
  ratings?: number
  reviewCount?: number
  salesCount?: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  scrapedAt: string
}

export function ProductCuration() {
  const [products, setProducts] = useState<Product[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    reviewed: 0
  })

  const fetchPendingProducts = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/products?status=PENDING&limit=20')
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products)
        
        // Update stats
        const statsResponse = await fetch('http://localhost:3001/api/products/stats')
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats({
            pending: statsData.pending || 0,
            approved: statsData.approved || 0,
            rejected: statsData.rejected || 0,
            reviewed: statsData.approved + statsData.rejected || 0
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
      toast.error('Falha ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingProducts()
  }, [])

  const handleStatusUpdate = async (status: 'APPROVED' | 'REJECTED') => {
    if (!currentProduct) return
    
    setUpdating(true)
    try {
      const response = await fetch(`http://localhost:3001/api/products/${currentProduct.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        // Remove product from list
        const newProducts = [...products]
        newProducts.splice(currentIndex, 1)
        setProducts(newProducts)
        
        // Update stats
        setStats(prev => ({
          ...prev,
          pending: prev.pending - 1,
          [status.toLowerCase()]: prev[status.toLowerCase() as 'approved' | 'rejected'] + 1,
          reviewed: prev.reviewed + 1
        }))
        
        // Show success message
        toast.success(
          status === 'APPROVED' 
            ? 'Produto aprovado!' 
            : 'Produto rejeitado',
          {
            description: currentProduct.title.substring(0, 50) + '...'
          }
        )
        
        // Move to next product
        if (currentIndex >= newProducts.length && currentIndex > 0) {
          setCurrentIndex(currentIndex - 1)
        }
      } else {
        toast.error('Falha ao atualizar status do produto')
      }
    } catch (error) {
      console.error('Failed to update product status:', error)
      toast.error('Erro ao atualizar produto')
    } finally {
      setUpdating(false)
    }
  }

  const currentProduct = products[currentIndex]

  const handleNext = () => {
    if (currentIndex < products.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum produto pendente
          </h3>
          <p className="text-sm text-gray-500">
            Todos os produtos foram revisados ou não há produtos novos.
          </p>
          <Button
            onClick={fetchPendingProducts}
            variant="outline"
            className="mt-4"
          >
            Recarregar
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-gray-500">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-gray-500">Aprovados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-xs text-gray-500">Rejeitados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.reviewed}</div>
            <p className="text-xs text-gray-500">Total Revisados</p>
          </CardContent>
        </Card>
      </div>

      {/* Product Review Card */}
      {currentProduct && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Revisão de Produto</CardTitle>
                <CardDescription>
                  {currentIndex + 1} de {products.length} produtos pendentes
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  {currentIndex + 1}/{products.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNext}
                  disabled={currentIndex === products.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Product Image and Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Image */}
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                {currentProduct.imageUrl ? (
                  <img
                    src={currentProduct.imageUrl}
                    alt={currentProduct.title}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingCart className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold line-clamp-2">
                  {currentProduct.title}
                </h3>

                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{currentProduct.platform}</Badge>
                  {currentProduct.category && (
                    <Badge variant="secondary">{currentProduct.category}</Badge>
                  )}
                </div>

                {/* Price */}
                <div className="space-y-1">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-bold">
                      R$ {currentProduct.price.toFixed(2)}
                    </span>
                    {currentProduct.originalPrice && (
                      <span className="text-sm text-gray-500 line-through">
                        R$ {currentProduct.originalPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {currentProduct.discount && (
                    <Badge className="bg-red-100 text-red-800">
                      {currentProduct.discount}
                    </Badge>
                  )}
                </div>

                {/* Ratings and Sales */}
                {(currentProduct.ratings || currentProduct.salesCount) && (
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    {currentProduct.ratings && (
                      <div className="flex items-center">
                        <span className="font-medium">⭐ {currentProduct.ratings}</span>
                        {currentProduct.reviewCount && (
                          <span className="ml-1">({currentProduct.reviewCount})</span>
                        )}
                      </div>
                    )}
                    {currentProduct.salesCount && (
                      <div>
                        <span>{currentProduct.salesCount} vendidos</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Product Link */}
                <a
                  href={currentProduct.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  Ver produto original
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>

                {/* Scraped Date */}
                <p className="text-xs text-gray-500">
                  Encontrado em: {new Date(currentProduct.scrapedAt).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <AlertCircle className="h-4 w-4" />
                <span>Revise cuidadosamente antes de aprovar</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => handleStatusUpdate('REJECTED')}
                  disabled={updating}
                  className="text-red-600 hover:text-red-700"
                >
                  {updating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Rejeitar
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleStatusUpdate('APPROVED')}
                  disabled={updating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {updating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Aprovar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}