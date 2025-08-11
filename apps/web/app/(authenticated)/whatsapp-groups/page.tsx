"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/card'
import { Button } from '@repo/ui/button'
import { Badge } from '@repo/ui/badge'
import { 
  Users, 
  RefreshCw, 
  Loader2, 
  MessageSquare, 
  Settings, 
  Eye,
  EyeOff,
  Tag,
  Phone,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react'
import { toast } from 'sonner'
import { useGroups, type Group } from '../../../lib/hooks/useGroups'

interface WhatsAppSession {
  id: string
  name: string
  phoneNumber: string
  isConnected: boolean
}

export default function WhatsAppGroupsPage() {
  const { groups, loading, error, refresh } = useGroups()
  const [syncingGroups, setSyncingGroups] = useState(false)
  const [whatsappSessions, setWhatsappSessions] = useState<WhatsAppSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)

  useEffect(() => {
    fetchWhatsAppSessions()
  }, [])

  const fetchWhatsAppSessions = async () => {
    try {
      setLoadingSessions(true)
      const response = await fetch('http://localhost:3001/api/whatsapp/status')
      if (response.ok) {
        const data = await response.json()
        // Mock session data based on status - in real app this would come from the sessions endpoint
        setWhatsappSessions([
          {
            id: 'session-1',
            name: 'WhatsApp Principal',
            phoneNumber: '+55 11 99999-9999',
            isConnected: data.hasConnectedSession
          }
        ])
      }
    } catch (error) {
      console.error('Failed to fetch WhatsApp sessions:', error)
    } finally {
      setLoadingSessions(false)
    }
  }

  const handleSyncGroups = async (sessionId: string) => {
    setSyncingGroups(true)
    try {
      const response = await fetch(`http://localhost:3001/api/whatsapp/sessions/${sessionId}/sync-groups`, {
        method: 'POST'
      })
      
      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        refresh() // Refresh groups list
      } else {
        toast.error('Erro ao sincronizar grupos')
      }
    } catch (error) {
      console.error('Sync groups error:', error)
      toast.error('Erro ao sincronizar grupos')
    } finally {
      setSyncingGroups(false)
    }
  }

  const toggleGroupStatus = async (groupId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`http://localhost:3001/api/groups/${groupId}/toggle`, {
        method: 'PATCH'
      })
      
      if (response.ok) {
        toast.success(`Grupo ${currentStatus ? 'desativado' : 'ativado'} com sucesso`)
        refresh()
      } else {
        toast.error('Erro ao alterar status do grupo')
      }
    } catch (error) {
      console.error('Toggle group error:', error)
      toast.error('Erro ao alterar status do grupo')
    }
  }

  const renderWhatsAppStatus = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Status do WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loadingSessions ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Verificando conexões...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {whatsappSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    session.isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <div className="font-medium">{session.name}</div>
                    <div className="text-sm text-gray-600 flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {session.phoneNumber}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={session.isConnected ? "default" : "destructive"}
                    className="flex items-center gap-1"
                  >
                    {session.isConnected ? (
                      <>
                        <Wifi className="h-3 w-3" />
                        Conectado
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-3 w-3" />
                        Desconectado
                      </>
                    )}
                  </Badge>
                  {session.isConnected && (
                    <Button
                      size="sm"
                      onClick={() => handleSyncGroups(session.id)}
                      disabled={syncingGroups}
                    >
                      {syncingGroups ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Sincronizando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Sincronizar Grupos
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )

  const renderGroupsStats = () => {
    const activeGroups = groups.filter(g => g.isActive).length
    const inactiveGroups = groups.filter(g => !g.isActive).length
    const totalMembers = groups.reduce((sum, g) => sum + (g._count?.members || 0), 0)

    return (
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grupos Ativos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeGroups}</div>
            <p className="text-xs text-muted-foreground">
              Recebendo mensagens
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Grupos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groups.length}</div>
            <p className="text-xs text-muted-foreground">
              {inactiveGroups} inativos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membros Totais</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              Através de todos os grupos
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8" />
            Grupos do WhatsApp
          </h2>
          <p className="text-muted-foreground">
            Gerencie os grupos que receberão suas campanhas de produtos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {renderWhatsAppStatus()}
      {renderGroupsStats()}

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-800">Erro ao carregar grupos</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : groups.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum grupo encontrado</h3>
            <p className="text-gray-600 mb-4">
              Conecte seu WhatsApp e sincronize os grupos para começar a enviar campanhas.
            </p>
            <div className="space-x-2">
              {whatsappSessions.some(s => s.isConnected) ? (
                <Button 
                  onClick={() => handleSyncGroups(whatsappSessions.find(s => s.isConnected)?.id || '')}
                  disabled={syncingGroups}
                >
                  {syncingGroups ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sincronizar Grupos
                    </>
                  )}
                </Button>
              ) : (
                <Button variant="outline" onClick={() => window.location.href = '/whatsapp'}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Configurar WhatsApp
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {groups.map((group) => (
            <Card key={group.id} className={`${
              !group.isActive ? 'opacity-60' : ''
            }`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{group.name}</h3>
                        <Badge 
                          variant={group.isActive ? "default" : "secondary"}
                          className={`${
                            group.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {group.isActive ? (
                            <>
                              <Eye className="h-3 w-3 mr-1" />
                              Ativo
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3 mr-1" />
                              Inativo
                            </>
                          )}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {group._count?.members || 0} membros
                        </div>
                        
                        {group.category && (
                          <div className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {group.category}
                          </div>
                        )}
                        
                        <div className="text-xs">
                          ID: {group.groupId.substring(0, 20)}...
                        </div>
                      </div>

                      {group.tags && group.tags.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500">Tags:</span>
                          {group.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500 mt-2">
                        Criado em: {new Date(group.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant={group.isActive ? "outline" : "default"}
                      size="sm"
                      onClick={() => toggleGroupStatus(group.id, group.isActive)}
                      className={
                        group.isActive 
                          ? "text-red-600 hover:text-red-700" 
                          : "text-green-600 hover:text-green-700"
                      }
                    >
                      {group.isActive ? (
                        <>
                          <EyeOff className="h-3 w-3 mr-1" />
                          Desativar
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3 mr-1" />
                          Ativar
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // TODO: Open group details modal
                        toast.info('Detalhes do grupo em breve')
                      }}
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Detalhes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}