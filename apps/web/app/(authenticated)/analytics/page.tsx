"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card"
import { Button } from "@repo/ui/button"
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  MessageSquare,
  Package,
  Users,
  DollarSign,
  Eye,
  MousePointer,
  ShoppingCart,
  Clock
} from "lucide-react"

// Mock data para demonstração
const mockAnalytics = {
  overview: {
    totalProducts: 2847,
    totalMessages: 12459,
    totalClicks: 8923,
    conversionRate: 3.2,
    revenueGenerated: 45678.90
  },
  trends: {
    products: { current: 2847, previous: 2371, change: 20.1 },
    messages: { current: 12459, previous: 10825, change: 15.1 },
    clicks: { current: 8923, previous: 8212, change: 8.7 },
    conversion: { current: 3.2, previous: 2.7, change: 18.5 }
  },
  platformPerformance: [
    { platform: "Mercado Livre", products: 1247, messages: 5678, clicks: 4234, conversion: 4.1, color: "bg-yellow-500" },
    { platform: "Shopee", products: 856, messages: 3456, clicks: 2456, conversion: 3.8, color: "bg-orange-500" },
    { platform: "Amazon", products: 432, messages: 2134, clicks: 1567, conversion: 2.9, color: "bg-gray-800" },
    { platform: "AliExpress", products: 312, messages: 1191, clicks: 666, conversion: 1.8, color: "bg-red-500" }
  ],
  categoryPerformance: [
    { category: "Eletrônicos", products: 1125, revenue: 18234.50, conversion: 4.2 },
    { category: "Casa e Jardim", products: 734, revenue: 12456.30, conversion: 3.1 },
    { category: "Moda", products: 567, revenue: 8967.20, conversion: 2.8 },
    { category: "Livros", products: 421, revenue: 6020.90, conversion: 2.1 }
  ],
  timePerformance: [
    { hour: "08:00", messages: 234, clicks: 156, conversion: 2.8 },
    { hour: "12:00", messages: 456, clicks: 289, conversion: 3.4 },
    { hour: "18:00", messages: 678, clicks: 445, conversion: 4.1 },
    { hour: "20:00", messages: 589, clicks: 398, conversion: 3.9 }
  ]
}

export default function AnalyticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("30d")
  const [selectedPlatform, setSelectedPlatform] = useState("all")

  const { overview, trends, platformPerformance, categoryPerformance, timePerformance } = mockAnalytics

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="mt-2 text-sm text-gray-600">
              Análise de performance e métricas do sistema
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">              
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="90d">Últimos 90 dias</option>
                <option value="1y">Último ano</option>
              </select>
              
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
              >
                <option value="all">Todas as plataformas</option>
                <option value="MERCADOLIVRE">Mercado Livre</option>
                <option value="SHOPEE">Shopee</option>
                <option value="AMAZON">Amazon</option>
                <option value="ALIEXPRESS">AliExpress</option>
              </select>
              
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Mais Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Métricas Principais */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Produtos Ativos
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.totalProducts.toLocaleString()}</div>
              <p className={`text-xs flex items-center ${trends.products.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trends.products.change > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(trends.products.change)}% vs período anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Mensagens Enviadas
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.totalMessages.toLocaleString()}</div>
              <p className={`text-xs flex items-center ${trends.messages.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trends.messages.change > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(trends.messages.change)}% vs período anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Cliques em Links
              </CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.totalClicks.toLocaleString()}</div>
              <p className={`text-xs flex items-center ${trends.clicks.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trends.clicks.change > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(trends.clicks.change)}% vs período anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Taxa de Conversão
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.conversionRate}%</div>
              <p className={`text-xs flex items-center ${trends.conversion.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trends.conversion.change > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(trends.conversion.change)}% vs período anterior
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Performance por Plataforma */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Performance por Plataforma
              </CardTitle>
              <CardDescription>
                Comparativo de métricas entre plataformas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {platformPerformance.map((platform) => (
                  <div key={platform.platform} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${platform.color}`}></div>
                        <span className="font-medium">{platform.platform}</span>
                      </div>
                      <span className="text-sm text-gray-500">{platform.conversion}% conversão</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Produtos</p>
                        <p className="font-semibold">{platform.products.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Mensagens</p>
                        <p className="font-semibold">{platform.messages.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Cliques</p>
                        <p className="font-semibold">{platform.clicks.toLocaleString()}</p>
                      </div>
                    </div>
                    
                    {/* Barra de progresso */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${platform.color}`}
                        style={{ width: `${(platform.conversion / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance por Categoria */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChart className="h-5 w-5 mr-2" />
                Performance por Categoria
              </CardTitle>
              <CardDescription>
                Receita e conversão por categoria de produto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryPerformance.map((category, index) => (
                  <div key={category.category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{category.category}</span>
                      <span className="text-sm text-gray-500">{category.conversion}% conversão</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Produtos</p>
                        <p className="font-semibold">{category.products.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Receita Est.</p>
                        <p className="font-semibold">R$ {category.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                    
                    {/* Barra de progresso */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          index === 0 ? 'bg-blue-500' : 
                          index === 1 ? 'bg-green-500' : 
                          index === 2 ? 'bg-yellow-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${(category.products / Math.max(...categoryPerformance.map(c => c.products))) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Performance por Horário */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Performance por Horário
              </CardTitle>
              <CardDescription>
                Melhores horários para envio de mensagens
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timePerformance.map((timeSlot) => (
                  <div key={timeSlot.hour} className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="font-medium w-16">{timeSlot.hour}</span>
                      <div className="text-sm text-gray-500">
                        {timeSlot.messages} msgs • {timeSlot.clicks} cliques
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{timeSlot.conversion}%</span>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(timeSlot.conversion / 5) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Resumo Financeiro */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Resumo Financeiro
              </CardTitle>
              <CardDescription>
                Estimativa de receita gerada através das vendas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-gray-500">Receita Total Estimada</p>
                  <p className="text-3xl font-bold text-green-600">
                    R$ {overview.revenueGenerated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Baseado em comissões estimadas de 3-5%
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Receita por Produto</p>
                    <p className="text-lg font-semibold">
                      R$ {(overview.revenueGenerated / overview.totalProducts).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Receita por Clique</p>
                    <p className="text-lg font-semibold">
                      R$ {(overview.revenueGenerated / overview.totalClicks).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">Meta Mensal</p>
                      <p className="text-xs text-green-600">R$ 50.000,00</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-800">91%</p>
                      <p className="text-xs text-green-600">Atingido</p>
                    </div>
                  </div>
                  <div className="mt-2 w-full bg-green-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '91%' }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insights e Recomendações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              Insights e Recomendações
            </CardTitle>
            <CardDescription>
              Análises automáticas e sugestões de melhoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <TrendingUp className="h-4 w-4 text-blue-500 mr-2" />
                  <h4 className="font-medium text-blue-800">Melhor Performance</h4>
                </div>
                <p className="text-sm text-blue-700">
                  Mercado Livre tem a melhor taxa de conversão (4.1%). Considere focar mais recursos nesta plataforma.
                </p>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Clock className="h-4 w-4 text-yellow-500 mr-2" />
                  <h4 className="font-medium text-yellow-800">Horário Ideal</h4>
                </div>
                <p className="text-sm text-yellow-700">
                  18h é o horário com melhor conversão (4.1%). Programe mais envios para este período.
                </p>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Package className="h-4 w-4 text-green-500 mr-2" />
                  <h4 className="font-medium text-green-800">Categoria Promissora</h4>
                </div>
                <p className="text-sm text-green-700">
                  Eletrônicos geram mais receita. Aumente a frequência de scraping nesta categoria.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  )
}