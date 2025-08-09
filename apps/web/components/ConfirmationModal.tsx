"use client"

import { ReactNode } from 'react'
import { Button } from "@repo/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card"
import { X, AlertTriangle, Info, CheckCircle, XCircle, Loader2 } from "lucide-react"

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info' | 'success'
  icon?: ReactNode
  loading?: boolean
  children?: ReactNode
}

const variantStyles = {
  danger: {
    icon: <AlertTriangle className="h-6 w-6 text-red-500" />,
    confirmButton: "bg-red-600 hover:bg-red-700 text-white",
    iconBg: "bg-red-100",
    border: "border-red-200"
  },
  warning: {
    icon: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
    confirmButton: "bg-yellow-600 hover:bg-yellow-700 text-white",
    iconBg: "bg-yellow-100",
    border: "border-yellow-200"
  },
  info: {
    icon: <Info className="h-6 w-6 text-blue-500" />,
    confirmButton: "bg-blue-600 hover:bg-blue-700 text-white",
    iconBg: "bg-blue-100",
    border: "border-blue-200"
  },
  success: {
    icon: <CheckCircle className="h-6 w-6 text-green-500" />,
    confirmButton: "bg-green-600 hover:bg-green-700 text-white",
    iconBg: "bg-green-100",
    border: "border-green-200"
  }
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = 'info',
  icon,
  loading = false,
  children
}: ConfirmationModalProps) {
  if (!isOpen) return null

  const styles = variantStyles[variant]

  const handleConfirm = async () => {
    await onConfirm()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop com blur */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={!loading ? onClose : undefined}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-md animate-in zoom-in-95 duration-200">
        <Card className={`border-2 ${styles.border} shadow-2xl`}>
          <CardHeader className="relative pb-3">
            {/* Close button */}
            {!loading && (
              <button
                onClick={onClose}
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Fechar</span>
              </button>
            )}
            
            {/* Icon and Title */}
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full ${styles.iconBg}`}>
                {icon || styles.icon}
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg font-semibold">
                  {title}
                </CardTitle>
                {description && (
                  <CardDescription className="mt-1.5 text-sm">
                    {description}
                  </CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
          
          {children && (
            <CardContent className="pt-0 pb-4">
              {children}
            </CardContent>
          )}
          
          {/* Actions */}
          <div className="flex gap-3 px-6 pb-6">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={loading}
            >
              {cancelText}
            </Button>
            <Button
              className={`flex-1 ${styles.confirmButton}`}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

// Variante específica para delete
export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType = "item",
  loading = false
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  itemName: string
  itemType?: string
  loading?: boolean
}) {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Excluir ${itemType}`}
      description={`Tem certeza que deseja excluir "${itemName}"? Esta ação não pode ser desfeita.`}
      confirmText="Excluir"
      cancelText="Cancelar"
      variant="danger"
      icon={<XCircle className="h-6 w-6 text-red-500" />}
      loading={loading}
    >
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
        <p className="text-sm text-red-800">
          <strong>Atenção:</strong> Todos os dados relacionados a este {itemType} serão permanentemente removidos.
        </p>
      </div>
    </ConfirmationModal>
  )
}