'use client'

import { useState, useEffect } from 'react'
import { Card } from '@repo/ui/card'
import { Button } from '@repo/ui/button'
import { Badge } from '@repo/ui/badge'
import { 
  Instagram, 
  Music2, 
  MessageCircle, 
  Plus, 
  Settings, 
  Trash2, 
  CheckCircle, 
  XCircle,
  Loader2
} from 'lucide-react'
import { instagramAuthService, type InstagramAccount } from '@/lib/api/services/instagram-auth.service'
import { toast } from 'sonner'
import { Toaster } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'

interface SocialAccount {
  id: string
  platform: 'INSTAGRAM' | 'TIKTOK' | 'WHATSAPP'
  username?: string
  accountId: string
  isActive: boolean
  createdAt: string
  analytics?: {
    followers: number
    posts: number
    engagement: number
  }
}

export default function SocialAccountsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    fetchAccounts()
    handleInstagramCallback()
  }, [])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      
      // Fetch real Instagram accounts
      try {
        const { accounts: igAccounts } = await instagramAuthService.getAccounts()
        
        // Convert to display format
        const formattedAccounts: SocialAccount[] = igAccounts.map(acc => ({
          id: acc.id,
          platform: 'INSTAGRAM' as const,
          username: acc.username || '@unknown',
          accountId: acc.accountId,
          isActive: acc.isActive,
          createdAt: acc.createdAt,
          analytics: {
            followers: 0,
            posts: acc.settings?.mediaCount || 0,
            engagement: 0
          }
        }))
        
        setAccounts(formattedAccounts)
      } catch (error) {
        console.error('Failed to fetch Instagram accounts:', error)
        // If API fails, continue without Instagram accounts
        setAccounts([])
      }
      
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
      toast.error('Erro ao carregar contas conectadas')
    } finally {
      setLoading(false)
    }
  }

  const handleInstagramCallback = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.has('instagram_code')) {
        const account = await instagramAuthService.handleCallback()
        if (account) {
          toast.success(`Instagram @${account.username} conectado com sucesso!`)
          await fetchAccounts()
        }
      }
    } catch (error: any) {
      console.error('Instagram callback error:', error)
      toast.error(error.message || 'Erro ao conectar Instagram')
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'INSTAGRAM':
        return <Instagram className="w-6 h-6" />
      case 'TIKTOK':
        return <Music2 className="w-6 h-6" />
      case 'WHATSAPP':
        return <MessageCircle className="w-6 h-6" />
      default:
        return null
    }
  }

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'INSTAGRAM':
        return 'bg-gradient-to-r from-purple-500 to-pink-500'
      case 'TIKTOK':
        return 'bg-black'
      case 'WHATSAPP':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  const handleConnect = async (platform: string) => {
    if (platform === 'INSTAGRAM') {
      try {
        setConnectingPlatform('INSTAGRAM')
        
        // Use popup method for better UX
        // Pass user ID if available
        const userId = (user as any)?.id || (user as any)?.userId
        const account = await instagramAuthService.connectWithPopup(userId)
        
        if (account) {
          toast.success(`Instagram @${account.username} conectado com sucesso!`)
          await fetchAccounts()
        }
      } catch (error: any) {
        console.error('Instagram connect error:', error)
        if (error.message !== 'Authentication cancelled') {
          toast.error(error.message || 'Erro ao conectar Instagram')
        }
      } finally {
        setConnectingPlatform(null)
      }
    } else {
      // For other platforms, show modal
      setSelectedPlatform(platform)
      setShowConnectModal(true)
    }
  }

  const handleDisconnect = async (accountId: string) => {
    const account = accounts.find(a => a.id === accountId)
    
    if (confirm(`Tem certeza que deseja desconectar ${account?.username || 'esta conta'}?`)) {
      try {
        if (account?.platform === 'INSTAGRAM') {
          await instagramAuthService.disconnect(accountId)
          toast.success('Instagram desconectado com sucesso')
        }
        
        setAccounts(accounts.filter(a => a.id !== accountId))
        await fetchAccounts()
      } catch (error) {
        console.error('Failed to disconnect account:', error)
        toast.error('Erro ao desconectar conta')
      }
    }
  }

  const toggleAccountStatus = async (accountId: string) => {
    try {
      // Call API to toggle status
      setAccounts(accounts.map(a => 
        a.id === accountId ? { ...a, isActive: !a.isActive } : a
      ))
    } catch (error) {
      console.error('Failed to toggle account status:', error)
    }
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Contas Sociais</h1>
            <p className="text-gray-600 mt-2">
              Gerencie suas contas do Instagram, TikTok e WhatsApp
            </p>
          </div>
          <Button
            onClick={() => setShowConnectModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Conectar Conta
          </Button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Connected Accounts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts.map((account) => (
                <Card key={account.id} className="relative overflow-hidden">
                  <div className={`h-2 ${getPlatformColor(account.platform)}`} />
                  
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getPlatformColor(account.platform)} text-white`}>
                          {getPlatformIcon(account.platform)}
                        </div>
                        <div>
                          <h3 className="font-semibold">{account.username}</h3>
                          <p className="text-sm text-gray-500">{account.platform}</p>
                        </div>
                      </div>
                      {account.isActive ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" /> Ativa
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="w-3 h-3 mr-1" /> Inativa
                        </Badge>
                      )}
                    </div>

                    {account.analytics && (
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold">
                            {account.analytics.followers.toLocaleString('pt-BR')}
                          </p>
                          <p className="text-xs text-gray-500">Seguidores</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold">
                            {account.analytics.posts}
                          </p>
                          <p className="text-xs text-gray-500">Posts</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold">
                            {account.analytics.engagement}%
                          </p>
                          <p className="text-xs text-gray-500">Engajamento</p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAccountStatus(account.id)}
                        className="flex-1"
                      >
                        {account.isActive ? 'Pausar' : 'Ativar'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Settings className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(account.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              {/* Add New Account Cards */}
              {!accounts.find(a => a.platform === 'INSTAGRAM') && (
                <Card 
                  className="border-2 border-dashed cursor-pointer hover:border-purple-500 transition-colors relative"
                  onClick={() => !connectingPlatform && handleConnect('INSTAGRAM')}
                >
                  <div className="p-6 flex flex-col items-center justify-center h-full min-h-[250px]">
                    {connectingPlatform === 'INSTAGRAM' ? (
                      <>
                        <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-4" />
                        <p className="text-sm text-gray-600">Conectando ao Instagram...</p>
                      </>
                    ) : (
                      <>
                        <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white mb-4">
                          <Instagram className="w-8 h-8" />
                        </div>
                        <h3 className="font-semibold mb-2">Conectar Instagram</h3>
                        <p className="text-sm text-gray-500 text-center">
                          Publique posts, stories e reels automaticamente
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-xs text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          <span>OAuth Configurado</span>
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              )}

              {!accounts.find(a => a.platform === 'TIKTOK') && (
                <Card 
                  className="border-2 border-dashed cursor-pointer hover:border-black transition-colors"
                  onClick={() => handleConnect('TIKTOK')}
                >
                  <div className="p-6 flex flex-col items-center justify-center h-full min-h-[250px]">
                    <div className="p-3 rounded-lg bg-black text-white mb-4">
                      <Music2 className="w-8 h-8" />
                    </div>
                    <h3 className="font-semibold mb-2">Conectar TikTok</h3>
                    <p className="text-sm text-gray-500 text-center">
                      Crie vídeos virais com produtos em promoção
                    </p>
                  </div>
                </Card>
              )}

              {!accounts.find(a => a.platform === 'WHATSAPP') && (
                <Card 
                  className="border-2 border-dashed cursor-pointer hover:border-green-500 transition-colors"
                  onClick={() => handleConnect('WHATSAPP')}
                >
                  <div className="p-6 flex flex-col items-center justify-center h-full min-h-[250px]">
                    <div className="p-3 rounded-lg bg-green-500 text-white mb-4">
                      <MessageCircle className="w-8 h-8" />
                    </div>
                    <h3 className="font-semibold mb-2">Conectar WhatsApp</h3>
                    <p className="text-sm text-gray-500 text-center">
                      Envie mensagens para grupos e contatos
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </>
        )}

        {/* Connect Modal for other platforms */}
        {showConnectModal && selectedPlatform !== 'INSTAGRAM' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Conectar {selectedPlatform}</h2>
                <p className="text-gray-600 mb-4">
                  {selectedPlatform === 'TIKTOK' && 'A integração com TikTok estará disponível em breve.'}
                  {selectedPlatform === 'WHATSAPP' && 'Use a página WhatsApp para gerenciar suas sessões.'}
                </p>
                <div className="flex justify-end gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowConnectModal(false)}
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  )
}