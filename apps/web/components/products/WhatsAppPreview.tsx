"use client"

import { useState, useEffect } from "react"
import { MessageSquare, Smartphone, Copy, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card"
import { Button } from "@repo/ui/button"
import { Product } from "../../lib/api/types"

interface WhatsAppPreviewProps {
  product: Product
  template?: string
}

export function WhatsAppPreview({ product, template }: WhatsAppPreviewProps) {
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    // Generate WhatsApp message based on template or default format
    const generateMessage = () => {
      if (template) {
        // Replace template variables
        return template
          .replace(/{{titulo}}/g, product.title)
          .replace(/{{preco}}/g, formatPrice(product.price))
          .replace(/{{preco_original}}/g, product.originalPrice ? formatPrice(product.originalPrice) : '')
          .replace(/{{desconto}}/g, product.discount || '')
          .replace(/{{link}}/g, product.affiliateUrl || product.productUrl)
          .replace(/{{plataforma}}/g, product.platform)
          .replace(/{{categoria}}/g, product.category || '')
      }

      // Default message format
      const discount = product.originalPrice 
        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
        : 0

      let msg = `🔥 *OFERTA IMPERDÍVEL!* 🔥\n\n`
      msg += `📦 *${truncateText(product.title, 60)}*\n\n`
      
      if (discount > 0) {
        msg += `💰 ~De R$ ${formatPrice(product.originalPrice!)}~\n`
        msg += `✅ *Por apenas R$ ${formatPrice(product.price)}*\n`
        msg += `🏷️ *Desconto de ${discount}%!*\n\n`
      } else {
        msg += `💰 *R$ ${formatPrice(product.price)}*\n\n`
      }

      msg += `🛒 *Compre agora:*\n`
      msg += `${product.affiliateUrl || product.productUrl}\n\n`
      msg += `⚡ _Corra! Oferta por tempo limitado_`

      return msg
    }

    setMessage(generateMessage())
  }, [product, template])

  const formatPrice = (price: number) => {
    return price.toFixed(2).replace('.', ',')
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy message:', error)
    }
  }

  const sendToWhatsApp = () => {
    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank')
  }

  // Simulate WhatsApp chat bubble
  const formatMessageForDisplay = (text: string) => {
    return text
      .replace(/\*([^*]+)\*/g, '<strong>$1</strong>') // Bold
      .replace(/_([^_]+)_/g, '<em>$1</em>') // Italic
      .replace(/~([^~]+)~/g, '<del>$1</del>') // Strikethrough
      .split('\n')
      .map((line, i) => line ? <div key={i} dangerouslySetInnerHTML={{ __html: line }} /> : <br key={i} />)
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5" />
          <span>Preview WhatsApp</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phone mockup */}
        <div className="relative bg-gray-100 rounded-2xl p-4 max-w-sm mx-auto">
          {/* Phone header */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
              <div>
                <p className="text-sm font-semibold">Achadinhos da Gabi</p>
                <p className="text-xs text-gray-500">online</p>
              </div>
            </div>
            <Smartphone className="h-4 w-4 text-gray-500" />
          </div>

          {/* Chat bubble */}
          <div className="bg-green-100 rounded-lg p-3 relative">
            <div className="absolute top-0 -left-2 w-0 h-0 border-t-[10px] border-t-transparent border-r-[10px] border-r-green-100 border-b-[10px] border-b-transparent"></div>
            <div className="text-sm text-gray-800 whitespace-pre-wrap">
              {formatMessageForDisplay(message)}
            </div>
            <div className="text-xs text-gray-500 text-right mt-1">
              {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Character count */}
        <div className="text-sm text-gray-500 text-center">
          {message.length} caracteres
        </div>

        {/* Action buttons */}
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={copyMessage}
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </>
            )}
          </Button>
          <Button 
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={sendToWhatsApp}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Enviar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}