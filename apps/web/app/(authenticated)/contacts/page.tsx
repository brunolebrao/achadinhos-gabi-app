"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card"
import { Button } from "@repo/ui/button"
import { 
  Plus, 
  Users, 
  User, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  MessageSquare,
  Phone,
  UserPlus,
  Download,
  Upload,
  MoreHorizontal,
  UserCheck,
  UserX,
  Crown,
  Shield
} from "lucide-react"

// Mock data para demonstração
const mockContacts = [
  {
    id: "1",
    name: "João Silva",
    phone: "+55 11 99999-1234",
    whatsappAccount: "Gabi Principal",
    isGroup: false,
    status: "ACTIVE",
    addedAt: "2025-01-05T10:30:00Z",
    lastMessage: "2025-01-08T09:15:00Z",
    messageCount: 47,
    tags: ["vip", "fidelizado"],
    avatar: null
  },
  {
    id: "2",
    name: "Maria Santos",
    phone: "+55 11 98888-5678",
    whatsappAccount: "Gabi Principal",
    isGroup: false,
    status: "ACTIVE",
    addedAt: "2025-01-03T14:20:00Z",
    lastMessage: "2025-01-08T08:30:00Z",
    messageCount: 23,
    tags: ["novo"],
    avatar: null
  },
  {
    id: "3",
    name: "Ofertas Imperdíveis",
    phone: null,
    whatsappAccount: "Gabi Principal",
    isGroup: true,
    status: "ACTIVE",
    addedAt: "2025-01-01T12:00:00Z",
    lastMessage: "2025-01-08T10:45:00Z",
    messageCount: 156,
    memberCount: 247,
    tags: ["grupo", "promocoes"],
    avatar: null,
    description: "Grupo para compartilhar as melhores ofertas e promoções"
  },
  {
    id: "4",
    name: "Pedro Costa",
    phone: "+55 11 97777-9876",
    whatsappAccount: "Ofertas Especiais",
    isGroup: false,
    status: "BLOCKED",
    addedAt: "2024-12-28T16:45:00Z",
    lastMessage: "2025-01-06T14:22:00Z",
    messageCount: 12,
    tags: ["bloqueado"],
    avatar: null
  },
  {
    id: "5",
    name: "Promoções VIP",
    phone: null,
    whatsappAccount: "Ofertas Especiais",
    isGroup: true,
    status: "ACTIVE",
    addedAt: "2024-12-20T09:30:00Z",
    lastMessage: "2025-01-07T18:15:00Z",
    messageCount: 89,
    memberCount: 89,
    tags: ["grupo", "vip"],
    avatar: null,
    description: "Grupo exclusivo para clientes VIP com ofertas especiais"
  }
]

const statusMap = {
  ACTIVE: { label: "Ativo", color: "text-green-600 bg-green-100", icon: UserCheck },
  BLOCKED: { label: "Bloqueado", color: "text-red-600 bg-red-100", icon: UserX },
  INACTIVE: { label: "Inativo", color: "text-gray-600 bg-gray-100", icon: User }
}

const tagColors = {
  vip: "bg-purple-100 text-purple-800",
  fidelizado: "bg-blue-100 text-blue-800",
  novo: "bg-green-100 text-green-800",
  grupo: "bg-yellow-100 text-yellow-800",
  promocoes: "bg-orange-100 text-orange-800",
  bloqueado: "bg-red-100 text-red-800"
}

export default function ContactsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedType, setSelectedType] = useState("all")
  const [selectedAccount, setSelectedAccount] = useState("all")

  const filteredContacts = mockContacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (contact.phone && contact.phone.includes(searchTerm))
    const matchesStatus = selectedStatus === "all" || contact.status === selectedStatus
    const matchesType = selectedType === "all" || 
                       (selectedType === "contact" && !contact.isGroup) ||
                       (selectedType === "group" && contact.isGroup)
    const matchesAccount = selectedAccount === "all" || contact.whatsappAccount === selectedAccount
    
    return matchesSearch && matchesStatus && matchesType && matchesAccount
  })

  const totalContacts = mockContacts.filter(c => !c.isGroup).length
  const totalGroups = mockContacts.filter(c => c.isGroup).length
  const activeContacts = mockContacts.filter(c => c.status === "ACTIVE").length
  const totalMessages = mockContacts.reduce((sum, c) => sum + c.messageCount, 0)

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Contatos</h1>
            <p className="mt-2 text-sm text-gray-600">
              Gerencie contatos e grupos do WhatsApp
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Contato
            </Button>
          </div>
        </div>

        {/* Métricas Contatos */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Contatos
              </CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalContacts}</div>
              <p className="text-xs text-muted-foreground">
                {activeContacts} ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Grupos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalGroups}</div>
              <p className="text-xs text-muted-foreground">
                {mockContacts.filter(c => c.isGroup).reduce((sum, g) => sum + (g.memberCount || 0), 0)} membros total
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
              <div className="text-2xl font-bold">{totalMessages.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Através de todos os contatos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Taxa de Resposta
              </CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">68%</div>
              <p className="text-xs text-muted-foreground">
                Média dos últimos 30 dias
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
                    placeholder="Buscar contatos e grupos..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="all">Todos os tipos</option>
                <option value="contact">Contatos</option>
                <option value="group">Grupos</option>
              </select>
              
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">Todos os status</option>
                <option value="ACTIVE">Ativo</option>
                <option value="BLOCKED">Bloqueado</option>
                <option value="INACTIVE">Inativo</option>
              </select>
              
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
              >
                <option value="all">Todas as contas</option>
                <option value="Gabi Principal">Gabi Principal</option>
                <option value="Ofertas Especiais">Ofertas Especiais</option>
              </select>
              
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Contatos */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredContacts.length} contatos e grupos
            </CardTitle>
            <CardDescription>
              Lista de todos os contatos e grupos do WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {filteredContacts.map((contact) => {
                const statusInfo = statusMap[contact.status as keyof typeof statusMap]
                const StatusIcon = statusInfo.icon
                
                return (
                  <div key={contact.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <div className="h-12 w-12 bg-gray-300 rounded-full flex items-center justify-center">
                            {contact.isGroup ? (
                              <Users className="h-6 w-6 text-gray-600" />
                            ) : (
                              <User className="h-6 w-6 text-gray-600" />
                            )}
                          </div>
                          {contact.isGroup && (
                            <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-blue-500 rounded-full flex items-center justify-center">
                              <Users className="h-2 w-2 text-white" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-medium text-gray-900">
                              {contact.name}
                            </h3>
                            {contact.tags.includes("vip") && (
                              <Crown className="h-4 w-4 text-yellow-500" />
                            )}
                            {contact.status === "BLOCKED" && (
                              <Shield className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          
                          {contact.phone && (
                            <p className="text-sm text-gray-500">{contact.phone}</p>
                          )}
                          
                          {contact.isGroup && contact.description && (
                            <p className="text-sm text-gray-500">{contact.description}</p>
                          )}
                          
                          <div className="mt-1 flex items-center space-x-4 text-xs text-gray-400">
                            <span>Conta: {contact.whatsappAccount}</span>
                            <span>Adicionado: {new Date(contact.addedAt).toLocaleDateString('pt-BR')}</span>
                            {contact.lastMessage && (
                              <span>Última msg: {new Date(contact.lastMessage).toLocaleDateString('pt-BR')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusInfo.label}
                          </span>
                          
                          <div className="mt-2 flex flex-wrap gap-1 justify-end">
                            {contact.tags.slice(0, 3).map((tag) => (
                              <span 
                                key={tag} 
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${tagColors[tag as keyof typeof tagColors] || 'bg-gray-100 text-gray-800'}`}
                              >
                                {tag}
                              </span>
                            ))}
                            {contact.tags.length > 3 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                +{contact.tags.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right text-sm text-gray-500">
                          <div className="flex items-center">
                            <MessageSquare className="h-4 w-4 mr-1" />
                            {contact.messageCount}
                          </div>
                          {contact.isGroup && contact.memberCount && (
                            <div className="flex items-center mt-1">
                              <Users className="h-4 w-4 mr-1" />
                              {contact.memberCount}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                          
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Paginação */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <Button variant="outline">Anterior</Button>
                <Button variant="outline">Próximo</Button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Mostrando <span className="font-medium">1</span> a <span className="font-medium">{filteredContacts.length}</span> de{" "}
                    <span className="font-medium">{filteredContacts.length}</span> resultados
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <Button variant="outline" size="sm">Anterior</Button>
                    <Button variant="outline" size="sm">1</Button>
                    <Button variant="outline" size="sm">Próximo</Button>
                  </nav>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  )
}