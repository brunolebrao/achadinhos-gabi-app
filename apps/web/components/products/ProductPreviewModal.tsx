"use client"

import { useState, useEffect } from "react"
import { 
  X, 
  ExternalLink, 
  ShoppingCart,
  Star,
  TrendingUp,
  Calendar,
  Tag,
  Copy,
  CheckCircle2,
  MessageSquare,
  Edit
} from "lucide-react"
import { Button } from "@repo/ui/button"
import { Badge } from "@repo/ui/badge"
import { Product, ProductStatus } from "../../lib/api/types"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { WhatsAppPreview } from "./WhatsAppPreview"

const statusMap = {
  PENDING: { label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
  APPROVED: { label: "Aprovado", color: "bg-green-100 text-green-800" },
  REJECTED: { label: "Rejeitado", color: "bg-red-100 text-red-800" },
  SENT: { label: "Enviado", color: "bg-blue-100 text-blue-800" }
}

const platformColors = {
  MERCADOLIVRE: "bg-yellow-500",
  SHOPEE: "bg-orange-500", 
  AMAZON: "bg-gray-800",
  ALIEXPRESS: "bg-red-500"
}

interface ProductPreviewModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onStatusUpdate?: (productId: string, status: ProductStatus) => void
  onEdit?: (productId: string) => void
  onSendWhatsApp?: (productId: string) => void
}

export function ProductPreviewModal({
  product,
  isOpen,
  onClose,
  onStatusUpdate,
  onEdit,
  onSendWhatsApp
}: ProductPreviewModalProps) {
  const [copied, setCopied] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showWhatsAppPreview, setShowWhatsAppPreview] = useState(false)

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [copied])

  if (!isOpen || !product) return null

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    })
  }

  const getDiscountPercentage = () => {
    if (!product.originalPrice) return 0
    return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
  }

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(product.affiliateUrl || product.productUrl)
      setCopied(true)
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

  const statusInfo = statusMap[product.status]
  const discountPercent = getDiscountPercentage()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">Preview do Produto</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {showWhatsAppPreview ? (
            <div className="p-6 flex justify-center">
              <WhatsAppPreview product={product} />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6 p-6">
            {/* Image Section */}
            <div className="space-y-4">
              <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                {!imageError ? (
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-gray-400">Imagem não disponível</span>
                  </div>
                )}
                
                {/* Discount badge */}
                {discountPercent > 0 && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-red-500 text-white text-lg px-3 py-1">
                      -{discountPercent}%
                    </Badge>
                  </div>
                )}

                {/* Platform badge */}
                <div className="absolute bottom-4 left-4">
                  <div className={`${platformColors[product.platform]} text-white px-3 py-1 rounded-full text-sm`}>
                    {product.platform}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2">
                <Button 
                  className="w-full"
                  onClick={() => window.open(product.productUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver no site original
                </Button>
                
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={copyUrl}
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar link
                      </>
                    )}
                  </Button>
                  
                  {onEdit && (
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        onEdit(product.id)
                        onClose()
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  )}
                </div>

                {onSendWhatsApp && (
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      onSendWhatsApp(product.id)
                      onClose()
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Enviar para WhatsApp
                  </Button>
                )}
              </div>
            </div>

            {/* Details Section */}
            <div className="space-y-4">
              {/* Title and status */}
              <div>
                <h3 className="text-xl font-semibold mb-2">{product.title}</h3>
                <div className="flex items-center space-x-2">
                  <Badge className={statusInfo.color}>
                    {statusInfo.label}
                  </Badge>
                  {product.category && (
                    <Badge variant="outline">
                      <Tag className="h-3 w-3 mr-1" />
                      {product.category}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-baseline space-x-3">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatPrice(product.price)}
                  </span>
                  {product.originalPrice && (
                    <span className="text-lg text-gray-500 line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                </div>
                {product.discount && (
                  <p className="text-sm text-green-600 mt-1">
                    Economia de {formatPrice(product.originalPrice! - product.price)}
                  </p>
                )}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4">
                {product.ratings && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-gray-600">Avaliação</span>
                    </div>
                    <p className="text-lg font-semibold mt-1">
                      {product.ratings.toFixed(1)}
                      {product.reviewCount && (
                        <span className="text-sm text-gray-500 ml-1">
                          ({product.reviewCount})
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {product.salesCount && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <ShoppingCart className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-gray-600">Vendas</span>
                    </div>
                    <p className="text-lg font-semibold mt-1">
                      {product.salesCount.toLocaleString('pt-BR')}
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <div>
                  <h4 className="font-medium mb-2">Descrição</h4>
                  <p className="text-sm text-gray-600 line-clamp-4">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Timestamps */}
              <div className="border-t pt-4">
                <div className="space-y-1 text-sm text-gray-500">
                  <p className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Encontrado em {format(new Date(product.createdAt), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  </p>
                  {product.updatedAt !== product.createdAt && (
                    <p className="flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Atualizado em {format(new Date(product.updatedAt), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </div>
              </div>

              {/* Status actions */}
              {onStatusUpdate && product.status === 'PENDING' && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-3">Ações rápidas:</p>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        onStatusUpdate(product.id, 'APPROVED')
                        onClose()
                      }}
                    >
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => {
                        onStatusUpdate(product.id, 'REJECTED')
                        onClose()
                      }}
                    >
                      Rejeitar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between p-6 border-t">
          <Button 
            variant={showWhatsAppPreview ? "default" : "outline"}
            onClick={() => setShowWhatsAppPreview(!showWhatsAppPreview)}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            {showWhatsAppPreview ? "Ver detalhes" : "Preview WhatsApp"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  )
}