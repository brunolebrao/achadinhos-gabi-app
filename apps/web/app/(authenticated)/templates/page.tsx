"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card"
import { Button } from "@repo/ui/button"
import { 
  Plus, 
  MessageSquare, 
  Eye, 
  Edit, 
  Trash2, 
  Copy,
  Search,
  Filter,
  FileText,
  Image,
  Link,
  Tag,
  Clock,
  CheckCircle,
  Users
} from "lucide-react"

// Mock data para demonstração
const mockTemplates = [
  {
    id: "1",
    name: "Promoção Flash",
    description: "Template para ofertas com desconto limitado",
    content: "🔥 *OFERTA RELÂMPAGO* 🔥\n\n{{product_name}}\n💰 De ~~R$ {{original_price}}~~ por *R$ {{price}}*\n⚡ {{discount}}% OFF - Só hoje!\n\n{{product_link}}\n\n⏰ Corre que é por tempo limitado!",
    variables: ["product_name", "original_price", "price", "discount", "product_link"],
    category: "promocao",
    isActive: true,
    createdAt: "2025-01-08T10:30:00Z",
    lastUsed: "2025-01-08T09:15:00Z",
    usageCount: 127,
    platforms: ["MERCADOLIVRE", "SHOPEE"]
  },
  {
    id: "2",
    name: "Produto Novo",
    description: "Apresentação de novos produtos encontrados",
    content: "✨ *NOVIDADE CHEGANDO!* ✨\n\n{{product_name}}\n🏷️ Categoria: {{category}}\n💰 Preço: *R$ {{price}}*\n⭐ Avaliação: {{rating}} ({{reviews}} avaliações)\n\n{{product_link}}\n\n📱 Compre agora e aproveite!",
    variables: ["product_name", "category", "price", "rating", "reviews", "product_link"],
    category: "produto",
    isActive: true,
    createdAt: "2025-01-07T14:20:00Z",
    lastUsed: "2025-01-08T08:30:00Z",
    usageCount: 89,
    platforms: ["AMAZON", "ALIEXPRESS"]
  },
  {
    id: "3",
    name: "Lista de Ofertas",
    description: "Compilado semanal das melhores ofertas",
    content: "📋 *TOP OFERTAS DA SEMANA* 📋\n\n{{offers_list}}\n\n💡 *Dica:* Essas ofertas podem acabar a qualquer momento!\n\n🔔 Ative as notificações para não perder nenhuma promoção!\n\n{{footer_message}}",
    variables: ["offers_list", "footer_message"],
    category: "lista",
    isActive: false,
    createdAt: "2025-01-06T16:45:00Z",
    lastUsed: "2025-01-07T12:00:00Z",
    usageCount: 34,
    platforms: ["MERCADOLIVRE", "SHOPEE", "AMAZON"]
  }
]

const categoryMap = {
  promocao: { label: "Promoção", color: "bg-red-100 text-red-800", icon: "🔥" },
  produto: { label: "Produto", color: "bg-blue-100 text-blue-800", icon: "🛍️" },
  lista: { label: "Lista", color: "bg-purple-100 text-purple-800", icon: "📋" },
  geral: { label: "Geral", color: "bg-gray-100 text-gray-800", icon: "💬" }
}

export default function TemplatesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const filteredTemplates = mockTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const activeTemplates = mockTemplates.filter(t => t.isActive).length
  const totalUsage = mockTemplates.reduce((sum, t) => sum + t.usageCount, 0)

  // Template preview com variáveis substituídas
  const getPreviewContent = (template: typeof mockTemplates[0]) => {
    let content = template.content
    const sampleData = {
      product_name: "iPhone 15 Pro Max 256GB",
      original_price: "10.499,99",
      price: "8.999,99",
      discount: "14",
      product_link: "https://exemplo.com/produto",
      category: "Eletrônicos",
      rating: "4.8",
      reviews: "1247",
      offers_list: "• iPhone 15 Pro - R$ 8.999,99\n• Samsung Galaxy S24 - R$ 3.499,99\n• iPad Air - R$ 4.299,99",
      footer_message: "Achadinhos da Gabi - Sempre as melhores ofertas! 💝"
    }
    
    template.variables.forEach(variable => {
      const value = sampleData[variable as keyof typeof sampleData] || `{{${variable}}}`
      content = content.replace(new RegExp(`{{${variable}}}`, 'g'), value)
    })
    
    return content
  }

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Templates</h1>
            <p className="mt-2 text-sm text-gray-600">
              Crie e gerencie templates de mensagens para WhatsApp
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </Button>
        </div>

        {/* Métricas Templates */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Templates Ativos
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeTemplates}/{mockTemplates.length}</div>
              <p className="text-xs text-muted-foreground">
                {activeTemplates === mockTemplates.length ? "Todos ativos" : `${mockTemplates.length - activeTemplates} inativos`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Usos Totais
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsage.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Mensagens enviadas com templates
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Mais Usado
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Promoção Flash</div>
              <p className="text-xs text-muted-foreground">
                127 usos este mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Variáveis Únicas
              </CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">
                Variáveis disponíveis
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar templates..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">Todas as categorias</option>
                <option value="promocao">Promoção</option>
                <option value="produto">Produto</option>
                <option value="lista">Lista</option>
                <option value="geral">Geral</option>
              </select>
              
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Templates */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {filteredTemplates.map((template) => {
            const categoryInfo = categoryMap[template.category as keyof typeof categoryMap]
            
            return (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${categoryInfo.color}`}>
                          {categoryInfo.icon} {categoryInfo.label}
                        </span>
                        {template.isActive ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <CardDescription>{template.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 rounded-md p-3">
                    <div className="text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">
                      {template.content}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {template.variables.slice(0, 4).map((variable) => (
                      <span key={variable} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                        {variable}
                      </span>
                    ))}
                    {template.variables.length > 4 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                        +{template.variables.length - 4} mais
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex space-x-4">
                      <span>📊 {template.usageCount} usos</span>
                      <span>🕐 {new Date(template.lastUsed).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex space-x-1">
                      {template.platforms.slice(0, 2).map((platform) => (
                        <span key={platform} className="text-xs px-1 py-0.5 bg-gray-200 rounded">
                          {platform}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-between pt-2 border-t">
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedTemplate(template.id)
                          setShowPreview(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Modal Preview */}
        {showPreview && selectedTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              {(() => {
                const template = mockTemplates.find(t => t.id === selectedTemplate)!
                const categoryInfo = categoryMap[template.category as keyof typeof categoryMap]
                
                return (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-semibold flex items-center space-x-2">
                          <span>{template.name}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${categoryInfo.color}`}>
                            {categoryInfo.icon} {categoryInfo.label}
                          </span>
                        </h3>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowPreview(false)}
                      >
                        ✕
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Template Raw */}
                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          Template Original
                        </h4>
                        <div className="bg-gray-50 rounded-md p-3 text-sm font-mono whitespace-pre-wrap">
                          {template.content}
                        </div>
                        
                        <div className="mt-4">
                          <h5 className="font-medium mb-2">Variáveis:</h5>
                          <div className="flex flex-wrap gap-1">
                            {template.variables.map((variable) => (
                              <span key={variable} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                                {variable}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Preview */}
                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <Eye className="h-4 w-4 mr-2" />
                          Preview (com dados de exemplo)
                        </h4>
                        <div className="bg-green-50 border border-green-200 rounded-md p-3">
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <div className="text-sm whitespace-pre-wrap">
                              {getPreviewContent(template)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 text-xs text-gray-500">
                          <div>📊 {template.usageCount} usos</div>
                          <div>🕐 Última utilização: {new Date(template.lastUsed).toLocaleString('pt-BR')}</div>
                          <div>🏷️ Plataformas: {template.platforms.join(', ')}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 flex justify-end space-x-2">
                      <Button variant="outline">
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button variant="outline">
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicar
                      </Button>
                      <Button>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Usar Template
                      </Button>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        )}
      </div>
  )
}