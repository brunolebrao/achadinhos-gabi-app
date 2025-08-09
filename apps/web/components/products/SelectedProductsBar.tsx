"use client"

import { useState } from "react"
import { 
  X, 
  Check, 
  Trash2, 
  MessageSquare,
  Download,
  ChevronUp,
  ChevronDown,
  Eye,
  Package,
  XCircle
} from "lucide-react"
import { Button } from "@repo/ui/button"
import { Badge } from "@repo/ui/badge"
import { Product, ProductStatus } from "../../lib/api/types"
import { motion, AnimatePresence } from "framer-motion"

interface SelectedProductsBarProps {
  selectedCount: number
  selectedProducts: Product[]
  onClearSelection: () => void
  onBulkStatusUpdate: (status: ProductStatus) => void
  onBulkDelete: () => void
  onSendWhatsApp: () => void
  onExportCsv: () => void
  onPreviewSelection?: () => void
}

export function SelectedProductsBar({
  selectedCount,
  selectedProducts,
  onClearSelection,
  onBulkStatusUpdate,
  onBulkDelete,
  onSendWhatsApp,
  onExportCsv,
  onPreviewSelection
}: SelectedProductsBarProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showPreview, setShowPreview] = useState(true)

  if (selectedCount === 0) return null

  // Calculate stats for selected products
  const stats = {
    pending: selectedProducts.filter(p => p.status === 'PENDING').length,
    approved: selectedProducts.filter(p => p.status === 'APPROVED').length,
    rejected: selectedProducts.filter(p => p.status === 'REJECTED').length,
    totalValue: selectedProducts.reduce((sum, p) => sum + p.price, 0),
    platforms: [...new Set(selectedProducts.map(p => p.platform))]
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 md:left-64 right-0 bg-white border-t-2 border-blue-500 shadow-2xl z-40"
      >
        {/* Compact Header */}
        <div className="px-4 py-2 bg-blue-50 border-b flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-blue-900">
                {selectedCount} {selectedCount === 1 ? 'produto' : 'produtos'} selecionado{selectedCount === 1 ? '' : 's'}
              </span>
            </div>
            
            {/* Quick Stats */}
            <div className="hidden sm:flex items-center space-x-3 text-sm">
              {stats.pending > 0 && (
                <Badge variant="outline" className="bg-yellow-50">
                  {stats.pending} pendente{stats.pending > 1 ? 's' : ''}
                </Badge>
              )}
              {stats.approved > 0 && (
                <Badge variant="outline" className="bg-green-50">
                  {stats.approved} aprovado{stats.approved > 1 ? 's' : ''}
                </Badge>
              )}
              <Badge variant="outline" className="bg-purple-50">
                R$ {stats.totalValue.toFixed(2)}
              </Badge>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Preview Button */}
            {showPreview && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowPreview(!showPreview)}
                className="text-blue-600 hover:bg-blue-100"
              >
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </Button>
            )}

            {/* Expand/Collapse */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-500 hover:bg-gray-100"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>

            {/* Clear Selection */}
            <Button
              size="sm"
              variant="ghost"
              onClick={onClearSelection}
              className="text-gray-500 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Actions Area */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4">
                <div className="flex flex-wrap gap-3">
                  {/* Primary Actions */}
                  <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                    <span className="text-xs text-gray-500 uppercase tracking-wider px-2">Ações Rápidas</span>
                    <div className="h-4 w-px bg-gray-300" />
                    <Button
                      size="sm"
                      onClick={() => onBulkStatusUpdate('APPROVED')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onBulkStatusUpdate('REJECTED')}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Rejeitar
                    </Button>
                  </div>

                  {/* Communication Actions */}
                  <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                    <span className="text-xs text-gray-500 uppercase tracking-wider px-2">Comunicação</span>
                    <div className="h-4 w-px bg-gray-300" />
                    <Button
                      size="sm"
                      onClick={onSendWhatsApp}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      WhatsApp
                    </Button>
                  </div>

                  {/* Data Actions */}
                  <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                    <span className="text-xs text-gray-500 uppercase tracking-wider px-2">Dados</span>
                    <div className="h-4 w-px bg-gray-300" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onExportCsv}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Exportar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onBulkDelete}
                      className="border-red-500 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Deletar
                    </Button>
                  </div>
                </div>

                {/* Preview Panel */}
                {showPreview && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Produtos Selecionados</span>
                      <span className="text-xs text-gray-500">{selectedCount} itens</span>
                    </div>
                    <div className="max-h-32 overflow-y-auto">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {selectedProducts.slice(0, 8).map((product) => (
                          <div key={product.id} className="flex items-center space-x-2 p-2 bg-white rounded border">
                            <img 
                              src={product.imageUrl} 
                              alt={product.title}
                              className="w-8 h-8 rounded object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate">
                                {product.title}
                              </p>
                              <p className="text-xs text-gray-500">
                                R$ {product.price.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                        {selectedProducts.length > 8 && (
                          <div className="flex items-center justify-center p-2 bg-white rounded border">
                            <span className="text-xs text-gray-500">
                              +{selectedProducts.length - 8} mais
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}