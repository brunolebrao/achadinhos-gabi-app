"use client"

import { useState } from "react"
import { 
  Eye, 
  Edit, 
  Trash2, 
  ExternalLink,
  ShoppingCart,
  Check,
  X,
  Clock,
  MoreVertical,
  MessageSquare
} from "lucide-react"
import { Button } from "@repo/ui/button"
import { Card, CardContent } from "@repo/ui/card"
import { Badge } from "@repo/ui/badge"
import { ProductStatus, Product } from "../../lib/api/types"

const statusMap = {
  PENDING: { label: "Pendente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  APPROVED: { label: "Aprovado", color: "bg-green-100 text-green-800", icon: Check },
  REJECTED: { label: "Rejeitado", color: "bg-red-100 text-red-800", icon: X },
  SENT: { label: "Enviado", color: "bg-blue-100 text-blue-800", icon: ShoppingCart }
}

const platformColors = {
  MERCADOLIVRE: "bg-yellow-500",
  SHOPEE: "bg-orange-500", 
  AMAZON: "bg-gray-800",
  ALIEXPRESS: "bg-red-500"
}

interface ProductGridProps {
  products: Product[]
  selectedProducts: string[]
  onProductSelect: (productId: string) => void
  onStatusUpdate: (productId: string, status: ProductStatus) => void
  onDelete: (productId: string) => void
  onEdit?: (productId: string) => void
  onPreview?: (product: Product) => void
  onSendWhatsApp?: (productId: string) => void
  isUpdating?: string | null
  isDeleting?: string | null
}

export function ProductGrid({
  products,
  selectedProducts,
  onProductSelect,
  onStatusUpdate,
  onDelete,
  onEdit,
  onPreview,
  onSendWhatsApp,
  isUpdating,
  isDeleting
}: ProductGridProps) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    })
  }

  const getDiscountPercentage = (original: number, current: number) => {
    const discount = ((original - current) / original) * 100
    return Math.round(discount)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product) => {
        const statusInfo = statusMap[product.status]
        const StatusIcon = statusInfo.icon
        const isSelected = selectedProducts.includes(product.id)
        const discountPercent = product.originalPrice 
          ? getDiscountPercentage(product.originalPrice, product.price)
          : 0

        return (
          <Card 
            key={product.id} 
            className={`relative overflow-hidden transition-all hover:shadow-lg ${
              isSelected ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            {/* Selection checkbox */}
            <div className="absolute top-2 left-2 z-10">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onProductSelect(product.id)}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white/90 backdrop-blur"
              />
            </div>

            {/* Menu button */}
            <div className="absolute top-2 right-2 z-10">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 bg-white/90 backdrop-blur hover:bg-white"
                  onClick={() => setMenuOpen(menuOpen === product.id ? null : product.id)}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
                
                {menuOpen === product.id && (
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
                    <div className="py-1">
                      {onPreview && (
                        <button
                          onClick={() => {
                            onPreview(product)
                            setMenuOpen(null)
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => {
                            onEdit(product.id)
                            setMenuOpen(null)
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </button>
                      )}
                      {onSendWhatsApp && (
                        <button
                          onClick={() => {
                            onSendWhatsApp(product.id)
                            setMenuOpen(null)
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Enviar WhatsApp
                        </button>
                      )}
                      <button
                        onClick={() => window.open(product.productUrl, '_blank')}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver no site
                      </button>
                      <hr className="my-1" />
                      <button
                        onClick={() => {
                          onDelete(product.id)
                          setMenuOpen(null)
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Discount badge */}
            {discountPercent > 0 && (
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
                <Badge className="bg-red-500 text-white">
                  -{discountPercent}%
                </Badge>
              </div>
            )}

            {/* Product image */}
            <div className="relative h-48 bg-gray-100">
              <img
                src={product.imageUrl}
                alt={product.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = 'https://via.placeholder.com/300x200?text=Sem+Imagem'
                }}
              />
              
              {/* Platform badge */}
              <div className="absolute bottom-2 left-2">
                <div className={`${platformColors[product.platform]} text-white text-xs px-2 py-1 rounded-full`}>
                  {product.platform}
                </div>
              </div>
            </div>

            <CardContent className="p-4">
              {/* Title */}
              <h3 className="font-medium text-gray-900 line-clamp-2 mb-2 min-h-[48px]">
                {product.title}
              </h3>

              {/* Category */}
              <p className="text-sm text-gray-500 mb-3">
                {product.category}
              </p>

              {/* Price */}
              <div className="mb-3">
                <div className="flex items-baseline space-x-2">
                  <span className="text-xl font-bold text-gray-900">
                    {formatPrice(product.price)}
                  </span>
                  {product.originalPrice && (
                    <span className="text-sm text-gray-500 line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                </div>
              </div>

              {/* Status and actions */}
              <div className="flex items-center justify-between">
                <Badge className={statusInfo.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusInfo.label}
                </Badge>

                {/* Quick actions for pending products */}
                {product.status === 'PENDING' && (
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onStatusUpdate(product.id, 'APPROVED')}
                      className="h-7 w-7 p-0 text-green-600 hover:bg-green-50"
                      disabled={isUpdating === product.id}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onStatusUpdate(product.id, 'REJECTED')}
                      className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                      disabled={isUpdating === product.id}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Additional metrics */}
              {(product.ratings || product.salesCount) && (
                <div className="mt-3 pt-3 border-t flex justify-between text-xs text-gray-500">
                  {product.ratings && (
                    <span>⭐ {product.ratings.toFixed(1)}</span>
                  )}
                  {product.salesCount && (
                    <span>{product.salesCount} vendidos</span>
                  )}
                </div>
              )}
            </CardContent>

            {/* Click outside to close menu */}
            {menuOpen === product.id && (
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(null)}
              />
            )}
          </Card>
        )
      })}
    </div>
  )
}