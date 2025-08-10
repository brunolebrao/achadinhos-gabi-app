'use client'

import { useState } from 'react'
import { Card } from '@repo/ui/card'
import { Button } from '@repo/ui/button'
import { Input } from '@repo/ui/input'
import { Badge } from '@repo/ui/badge'
import { 
  Instagram, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  ExternalLink,
  Copy,
  Info
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { toast } from 'sonner'
import { Toaster } from 'sonner'
import { useRouter } from 'next/navigation'

interface TokenSetupResult {
  success: boolean
  account?: any
  instagram?: any
  token?: any
  message?: string
  error?: string
  details?: string
}

export default function InstagramTokenSetupPage() {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TokenSetupResult | null>(null)
  const router = useRouter()

  // Token from the Meta Developer Console image
  const imageToken = 'EAARyTPBZCEsPNdkHAsaQvO6JwCdr4mBvJ2wTt1QrYVzVRy6NnlMFolsGRrZPILBQAbUpHxFNdOlwsMrEAQfqPJIThtqPowpjhqaJomPYVcQKgrFU4FwJnJEhMiGnCJn'

  const handleSetupToken = async () => {
    if (!token || token.length < 50) {
      toast.error('Token inválido ou muito curto')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await apiClient.post<TokenSetupResult>(
        '/auth/instagram/manual/setup-token',
        { accessToken: token }
      )

      setResult(response)
      
      if (response.success) {
        toast.success('Instagram configurado com sucesso!')
        
        // Redirect to social accounts after 3 seconds
        setTimeout(() => {
          router.push('/social-accounts')
        }, 3000)
      } else {
        toast.error(response.message || 'Falha na configuração')
      }

    } catch (error: any) {
      console.error('Token setup error:', error)
      
      const errorResult: TokenSetupResult = {
        success: false,
        error: error.response?.data?.error || 'Setup failed',
        message: error.response?.data?.message || error.message,
        details: error.response?.data?.details || 'Verifique o token e tente novamente'
      }
      
      setResult(errorResult)
      toast.error(errorResult.message || 'Erro ao configurar Instagram')
      
    } finally {
      setLoading(false)
    }
  }

  const useImageToken = () => {
    setToken(imageToken)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado para área de transferência!')
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <Instagram className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Configurar Token do Instagram</h1>
            <p className="text-gray-600 mt-1">
              Configure seu token de longa duração para conectar a conta do Instagram
            </p>
          </div>
        </div>

        {/* Instructions Card */}
        <Card className="border-blue-200 bg-blue-50">
          <div className="p-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Como obter o token de longa duração:</h3>
                <ol className="text-sm text-blue-800 space-y-2">
                  <li>1. Acesse o <a href="https://developers.facebook.com/tools/debug/" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">Meta Developer Console <ExternalLink className="w-3 h-3" /></a></li>
                  <li>2. Cole seu token no depurador de tokens</li>
                  <li>3. Clique em "Estender token de acesso"</li>
                  <li>4. Copie o novo token de longa duração</li>
                  <li>5. Cole o token no campo abaixo</li>
                </ol>
              </div>
            </div>
          </div>
        </Card>

        {/* Token Input Card */}
        <Card>
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
                  Token de Longa Duração do Instagram
                </label>
                <div className="space-y-2">
                  <Input
                    id="token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Cole seu token de longa duração aqui..."
                    className="font-mono text-sm"
                    disabled={loading}
                  />
                  
                  {/* Use Image Token Button */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={useImageToken}
                      disabled={loading}
                      className="text-xs"
                    >
                      Usar token da imagem Meta Console
                    </Button>
                    <span className="text-xs text-gray-500">
                      (Token mostrado na sua captura de tela)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSetupToken}
                  disabled={!token || loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Configurando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Configurar Instagram
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => router.push('/social-accounts')}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Result Display */}
        {result && (
          <Card className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <div className="p-6">
              <div className={`flex items-start gap-3 ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">
                    {result.success ? '🎉 Instagram Configurado com Sucesso!' : '❌ Erro na Configuração'}
                  </h3>
                  
                  {result.success && result.instagram && (
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium mb-2">📊 Informações da Conta:</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Username:</span> @{result.instagram.username}
                          </div>
                          <div>
                            <span className="font-medium">Nome:</span> {result.instagram.name}
                          </div>
                          <div>
                            <span className="font-medium">Seguidores:</span> {result.instagram.followersCount?.toLocaleString('pt-BR') || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Posts:</span> {result.instagram.mediaCount || 'N/A'}
                          </div>
                        </div>
                      </div>
                      
                      {result.instagram.pageId && (
                        <div>
                          <h4 className="font-medium mb-2">📄 Página do Facebook:</h4>
                          <div className="text-sm">
                            <div><span className="font-medium">Nome:</span> {result.instagram.pageName}</div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">ID:</span> 
                              <span className="font-mono">{result.instagram.pageId}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(result.instagram.pageId)}
                                className="p-1 h-auto"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {result.token && (
                        <div>
                          <h4 className="font-medium mb-2">🔑 Token Info:</h4>
                          <div className="flex items-center gap-2 text-sm">
                            <Badge className="bg-green-100 text-green-800">
                              {result.token.isLongLived ? 'Longa Duração' : 'Curta Duração'}
                            </Badge>
                            {result.token.daysUntilExpiry && (
                              <span className="text-gray-600">
                                Expira em {result.token.daysUntilExpiry} dias
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-4 p-3 bg-green-100 rounded-lg">
                        <p className="text-sm text-green-800">
                          ✅ Instagram está pronto para usar! Redirecionando para a página de contas sociais...
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {!result.success && (
                    <div className="space-y-2">
                      {result.message && (
                        <p className="text-sm">{result.message}</p>
                      )}
                      
                      {result.details && (
                        <p className="text-sm font-mono bg-red-100 p-2 rounded">
                          {result.details}
                        </p>
                      )}
                      
                      <div className="mt-3 text-xs text-red-700">
                        <p className="font-medium mb-1">💡 Possíveis soluções:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Verifique se o token não expirou</li>
                          <li>Confirme se o App ID está correto</li>
                          <li>Verifique se todas as permissões foram aprovadas</li>
                          <li>Tente obter um novo token de longa duração</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* App Info Card */}
        <Card className="border-gray-200 bg-gray-50">
          <div className="p-4">
            <h4 className="font-medium text-gray-700 mb-2">ℹ️ Informações do App</h4>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">App ID:</span> 1252003544986909
              </div>
              <div>
                <span className="font-medium">Callback URL:</span> /api/auth/instagram/oauth/callback
              </div>
            </div>
          </div>
        </Card>

      </div>
    </>
  )
}