"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card"
import { Button } from "@repo/ui/button"
import { useWhatsAppSessions, useWhatsAppActions, useWhatsAppQRCode } from "../../../lib/hooks"
import { Toaster } from "sonner"
import { 
  Plus, 
  Smartphone, 
  QrCode, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  MoreHorizontal,
  Eye,
  Trash2,
  RefreshCcw,
  Users,
  MessageSquare,
  Clock,
  Loader2,
  Send,
  X,
  UserPlus,
  UsersIcon
} from "lucide-react"

const statusMap = {
  connected: { 
    label: "Conectado", 
    color: "text-green-600 bg-green-100", 
    icon: CheckCircle,
    dot: "bg-green-500"
  },
  connecting: { 
    label: "Conectando", 
    color: "text-yellow-600 bg-yellow-100", 
    icon: AlertCircle,
    dot: "bg-yellow-500"
  },
  disconnected: { 
    label: "Desconectado", 
    color: "text-red-600 bg-red-100", 
    icon: XCircle,
    dot: "bg-red-500"
  }
}

export default function WhatsAppPage() {
  const { sessions, loading: sessionsLoading, refetch } = useWhatsAppSessions()
  const { 
    loading: actionLoading, 
    createSession, 
    restartSession, 
    deleteSession,
    syncContacts,
    syncGroups,
    sendMessage 
  } = useWhatsAppActions()

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // Selected items
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)
  
  // Form data
  const [newSessionData, setNewSessionData] = useState({ name: "", phoneNumber: "" })
  const [messageData, setMessageData] = useState({ to: "", message: "" })

  // QR Code hook
  const { qrCode, loading: qrLoading } = useWhatsAppQRCode(
    showQrModal ? selectedSessionId : null
  )

  // Metrics
  const connectedCount = sessions.filter(s => s.isConnected).length
  const totalMessages = sessions.reduce((sum, s) => sum + s.messagesSent, 0)
  const totalContacts = sessions.reduce((sum, s) => sum + s.contacts, 0)
  const totalGroups = sessions.reduce((sum, s) => sum + s.groups, 0)

  // Handlers
  const handleCreateSession = async () => {
    if (!newSessionData.name || !newSessionData.phoneNumber) {
      return
    }

    try {
      const sessionId = await createSession(newSessionData.name, newSessionData.phoneNumber)
      setNewSessionData({ name: "", phoneNumber: "" })
      setShowCreateModal(false)
      
      // Open QR modal for the new session
      setSelectedSessionId(sessionId)
      setShowQrModal(true)
      
      // Refresh sessions list
      refetch()
    } catch (error) {
      // Error handled by hook
    }
  }

  const handleRestartSession = async (sessionId: string) => {
    try {
      await restartSession(sessionId)
      refetch()
    } catch (error) {
      // Error handled by hook
    }
  }

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return

    try {
      await deleteSession(sessionToDelete)
      setSessionToDelete(null)
      setShowDeleteConfirm(false)
      refetch()
    } catch (error) {
      // Error handled by hook
    }
  }

  const handleSyncContacts = async (sessionId: string) => {
    try {
      await syncContacts(sessionId)
      refetch()
    } catch (error) {
      // Error handled by hook
    }
  }

  const handleSyncGroups = async (sessionId: string) => {
    try {
      await syncGroups(sessionId)
      refetch()
    } catch (error) {
      // Error handled by hook
    }
  }

  const handleSendMessage = async () => {
    if (!selectedSessionId || !messageData.to || !messageData.message) {
      return
    }

    try {
      await sendMessage(selectedSessionId, messageData.to, messageData.message)
      setMessageData({ to: "", message: "" })
      setShowMessageModal(false)
    } catch (error) {
      // Error handled by hook
    }
  }

  const getSessionStatus = (session: any) => {
    if (session.isConnected) return 'connected'
    if (session.qrCode) return 'connecting'
    return 'disconnected'
  }

  return (
    <>
      <Toaster position="top-right" />
      
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">WhatsApp</h1>
            <p className="mt-2 text-sm text-gray-600">
              Gerencie contas WhatsApp e sessões de mensagens
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Contas Conectadas
              </CardTitle>
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{connectedCount}/{sessions.length}</div>
              <p className="text-xs text-muted-foreground">
                {connectedCount === sessions.length ? "Todas conectadas" : "Algumas desconectadas"}
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
                Total acumulado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Contatos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalContacts}</div>
              <p className="text-xs text-muted-foreground">
                Em todas as contas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Grupos
              </CardTitle>
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalGroups}</div>
              <p className="text-xs text-muted-foreground">
                Grupos disponíveis
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sessions List */}
        <Card>
          <CardHeader>
            <CardTitle>Contas WhatsApp</CardTitle>
            <CardDescription>
              Gerenciar sessões e status de conexão das contas
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {sessionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12">
                <Smartphone className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma conta conectada</h3>
                <p className="mt-1 text-sm text-gray-500">Comece criando uma nova sessão WhatsApp.</p>
                <div className="mt-6">
                  <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeira Sessão
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {sessions.map((session) => {
                  const status = getSessionStatus(session)
                  const statusInfo = statusMap[status]
                  const StatusIcon = statusInfo.icon
                  
                  return (
                    <div key={session.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center">
                              <Smartphone className="h-6 w-6 text-white" />
                            </div>
                            <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${statusInfo.dot}`}></div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <h3 className="text-lg font-medium text-gray-900">
                                {session.name}
                              </h3>
                              {session.isDefault && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  Principal
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{session.phoneNumber}</p>
                            <p className="text-xs text-gray-400">
                              ID: {session.id}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-6">
                          <div className="text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusInfo.label}
                            </span>
                            <div className="mt-1 text-xs text-gray-500">
                              {session.connectedAt ? (
                                <>Conectado em {new Date(session.connectedAt).toLocaleString('pt-BR')}</>
                              ) : status === 'connecting' ? (
                                "Aguardando conexão..."
                              ) : (
                                "Desconectado"
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right text-sm text-gray-500">
                            <div>{session.contacts} contatos</div>
                            <div>{session.groups} grupos</div>
                            <div>{session.messagesSent} enviadas</div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {status === 'connecting' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedSessionId(session.id)
                                  setShowQrModal(true)
                                }}
                              >
                                <QrCode className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {session.isConnected && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedSessionId(session.id)
                                    setShowMessageModal(true)
                                  }}
                                  title="Enviar mensagem de teste"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                                
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleSyncContacts(session.id)}
                                  disabled={actionLoading}
                                  title="Sincronizar contatos"
                                >
                                  <UserPlus className="h-4 w-4" />
                                </Button>
                                
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleSyncGroups(session.id)}
                                  disabled={actionLoading}
                                  title="Sincronizar grupos"
                                >
                                  <UsersIcon className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleRestartSession(session.id)}
                              disabled={actionLoading}
                              title="Reiniciar sessão"
                            >
                              <RefreshCcw className="h-4 w-4" />
                            </Button>
                            
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSessionToDelete(session.id)
                                setShowDeleteConfirm(true)
                              }}
                              disabled={actionLoading}
                              title="Remover sessão"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {session.lastMessage && (
                        <div className="mt-3 text-xs text-gray-500">
                          Última mensagem: {new Date(session.lastMessage).toLocaleString('pt-BR')}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Session Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Nova Sessão WhatsApp</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da Sessão
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Conta Principal"
                    value={newSessionData.name}
                    onChange={(e) => setNewSessionData({ ...newSessionData, name: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Telefone
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 5511999999999"
                    value={newSessionData.phoneNumber}
                    onChange={(e) => setNewSessionData({ ...newSessionData, phoneNumber: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Digite apenas números, sem espaços ou símbolos
                  </p>
                </div>
                
                <div className="flex space-x-2 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={handleCreateSession}
                    disabled={actionLoading || !newSessionData.name || !newSessionData.phoneNumber}
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Criar Sessão"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* QR Code Modal */}
        {showQrModal && selectedSessionId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Conectar WhatsApp</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowQrModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="text-center">
                {qrLoading ? (
                  <div className="mb-4 h-48 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : qrCode ? (
                  <div className="mb-4">
                    <img 
                      src={qrCode} 
                      alt="QR Code"
                      className="mx-auto w-48 h-48 border rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="mb-4 h-48 flex items-center justify-center border rounded-lg bg-gray-50">
                    <div className="text-gray-500">
                      <QrCode className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-sm">QR Code não disponível</p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2 text-sm text-gray-600">
                  <p className="font-medium">Como conectar:</p>
                  <ol className="text-left space-y-1 list-decimal list-inside">
                    <li>Abra o WhatsApp no seu celular</li>
                    <li>Vá em Menu → Dispositivos conectados</li>
                    <li>Toque em "Conectar um dispositivo"</li>
                    <li>Aponte a câmera para este código QR</li>
                  </ol>
                </div>
                
                <div className="mt-4">
                  <Button className="w-full" onClick={() => setShowQrModal(false)}>
                    Fechar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Send Message Modal */}
        {showMessageModal && selectedSessionId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Enviar Mensagem de Teste</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowMessageModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número do Destinatário
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 5511999999999"
                    value={messageData.to}
                    onChange={(e) => setMessageData({ ...messageData, to: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mensagem
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Digite sua mensagem..."
                    value={messageData.message}
                    onChange={(e) => setMessageData({ ...messageData, message: e.target.value })}
                  />
                </div>
                
                <div className="flex space-x-2 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setShowMessageModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={handleSendMessage}
                    disabled={actionLoading || !messageData.to || !messageData.message}
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && sessionToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Confirmar Remoção</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <p className="text-gray-600 mb-6">
                Tem certeza que deseja remover esta sessão WhatsApp? Esta ação não pode ser desfeita.
              </p>
              
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDeleteSession}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Remover"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}