"use client"

import { 
  Package, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Percent,
  ShoppingBag,
  Clock,
  CheckCircle,
  XCircle,
  Send
} from "lucide-react"
import { Card, CardContent } from "@repo/ui/card"
import { Product } from "../../lib/api/types"

interface ProductMetricsProps {
  products: Product[]
}

export function ProductMetrics({ products }: ProductMetricsProps) {
  // Calculate metrics
  const totalProducts = products.length
  const pendingProducts = products.filter(p => p.status === 'PENDING').length
  const approvedProducts = products.filter(p => p.status === 'APPROVED').length
  const rejectedProducts = products.filter(p => p.status === 'REJECTED').length
  const sentProducts = products.filter(p => p.status === 'SENT').length

  // Calculate price metrics
  const avgPrice = products.length > 0
    ? products.reduce((sum, p) => sum + p.price, 0) / products.length
    : 0

  const productsWithDiscount = products.filter(p => p.originalPrice && p.originalPrice > p.price)
  const avgDiscount = productsWithDiscount.length > 0
    ? productsWithDiscount.reduce((sum, p) => {
        const discount = ((p.originalPrice! - p.price) / p.originalPrice!) * 100
        return sum + discount
      }, 0) / productsWithDiscount.length
    : 0

  // Platform distribution
  const platformCounts = products.reduce((acc, p) => {
    acc[p.platform] = (acc[p.platform] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const topPlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]

  const metrics = [
    {
      title: "Total de Produtos",
      value: totalProducts.toLocaleString('pt-BR'),
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Pendentes",
      value: pendingProducts.toLocaleString('pt-BR'),
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      percentage: totalProducts > 0 ? ((pendingProducts / totalProducts) * 100).toFixed(1) + '%' : '0%'
    },
    {
      title: "Aprovados",
      value: approvedProducts.toLocaleString('pt-BR'),
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
      percentage: totalProducts > 0 ? ((approvedProducts / totalProducts) * 100).toFixed(1) + '%' : '0%'
    },
    {
      title: "Preço Médio",
      value: `R$ ${avgPrice.toFixed(2)}`,
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      title: "Desconto Médio",
      value: avgDiscount.toFixed(1) + '%',
      icon: Percent,
      color: "text-red-600",
      bgColor: "bg-red-100",
      subtitle: `${productsWithDiscount.length} produtos`
    },
    {
      title: "Plataforma Top",
      value: topPlatform ? topPlatform[0] : '-',
      icon: ShoppingBag,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
      subtitle: topPlatform ? `${topPlatform[1]} produtos` : ''
    }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {metrics.map((metric, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </div>
              {metric.percentage && (
                <span className="text-xs text-gray-500">
                  {metric.percentage}
                </span>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">{metric.title}</p>
              <p className="text-lg font-bold text-gray-900">{metric.value}</p>
              {metric.subtitle && (
                <p className="text-xs text-gray-500 mt-1">{metric.subtitle}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}