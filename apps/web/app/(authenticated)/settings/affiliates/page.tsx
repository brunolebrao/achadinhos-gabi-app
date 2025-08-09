"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card"
import { Button } from "@repo/ui/button"
import { Badge } from "@repo/ui/badge"
import { 
  Link2, 
  ExternalLink, 
  Check, 
  X, 
  Loader2, 
  Info,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Package,
  RefreshCw
} from "lucide-react"
import { toast } from "sonner"

interface AffiliateConfig {
  mercadolivreId?: string | null
  amazonTag?: string | null
  shopeeId?: string | null
  aliexpressId?: string | null
  enableTracking: boolean
  customUtmSource?: string | null
  customUtmMedium?: string | null
  customUtmCampaign?: string | null
}

interface PlatformConfig {
  key: keyof Pick<AffiliateConfig, 'mercadolivreId' | 'amazonTag' | 'shopeeId' | 'aliexpressId'>
  name: string
  platform: 'MERCADOLIVRE' | 'AMAZON' | 'SHOPEE' | 'ALIEXPRESS'
  placeholder: string
  helpText: string
  color: string
  icon: string
}

const platforms: PlatformConfig[] = [
  {
    key: 'mercadolivreId',
    name: 'Mercado Livre',
    platform: 'MERCADOLIVRE',
    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    helpText: 'UUID de tracking do programa de afiliados (formato: a9aee640-eb7d-440e-ab24-e228a34d70bd)',
    color: 'bg-yellow-500',
    icon: '🛒'
  },
  {
    key: 'amazonTag',
    name: 'Amazon Associates',
    platform: 'AMAZON',
    placeholder: 'seusite-20',
    helpText: 'Tag de associado (formato: nome-20)',
    color: 'bg-gray-800',
    icon: '📦'
  },
  {
    key: 'shopeeId',
    name: 'Shopee',
    platform: 'SHOPEE',
    placeholder: 'AF123456',
    helpText: 'ID de afiliado Shopee',
    color: 'bg-orange-500',
    icon: '🛍️'
  },
  {
    key: 'aliexpressId',
    name: 'AliExpress',
    platform: 'ALIEXPRESS',
    placeholder: '12345678',
    helpText: 'ID numérico de afiliado',
    color: 'bg-red-500',
    icon: '🎁'
  }
]

// Função para validar UUID
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// Função para gerar novo UUID v4
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export default function AffiliateSettingsPage() {
  const { data: session, status } = useSession()
  const [config, setConfig] = useState<AffiliateConfig>({
    enableTracking: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState<string | null>(null)
  const [metrics, setMetrics] = useState({
    totalClicks: 0,
    totalConversions: 0,
    estimatedRevenue: 0,
    conversionRate: '0.00'
  })

  useEffect(() => {
    if (status === 'authenticated' && session?.accessToken) {
      fetchConfig()
      fetchMetrics()
    }
  }, [status, session])

  const fetchConfig = async () => {
    if (!session?.accessToken) {
      console.error('No access token available')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('http://localhost:3001/api/user/affiliate-config', {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setConfig(data)
      } else if (response.status === 404) {
        // Config doesn't exist yet, that's ok
        console.log('No affiliate config found')
      }
    } catch (error) {
      console.error('Failed to fetch config:', error)
      toast.error('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  const fetchMetrics = async () => {
    if (!session?.accessToken) {
      console.error('No access token available for metrics')
      return
    }

    try {
      const response = await fetch('http://localhost:3001/api/user/affiliate-metrics', {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    }
  }

  const handleSave = async () => {
    if (!session?.accessToken) {
      toast.error('Não autenticado. Faça login novamente.')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('http://localhost:3001/api/user/affiliate-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`
        },
        body: JSON.stringify(config)
      })

      if (response.ok) {
        toast.success('Configurações salvas com sucesso!')
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      console.error('Failed to save config:', error)
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const validateId = async (platform: string, id: string) => {
    if (!id) return

    // Validação específica para Mercado Livre UUID
    if (platform === 'MERCADOLIVRE') {
      if (!isValidUUID(id)) {
        toast.error('ID inválido! Use o formato UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')
        return
      }
      toast.success('UUID do Mercado Livre válido! ✅')
      return
    }

    setValidating(platform)
    try {
      const response = await fetch('http://localhost:3001/api/user/affiliate-config/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ platform, id })
      })

      const result = await response.json()
      
      if (result.valid) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Failed to validate:', error)
    } finally {
      setValidating(null)
    }
  }

  const handleInputChange = (key: keyof AffiliateConfig, value: string) => {
    setConfig(prev => ({
      ...prev,
      [key]: value || null
    }))
  }

  const openInstructions = async (platform: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/user/affiliate-config/instructions/${platform}`)
      const instructions = await response.json()
      
      // Open instructions link in new tab
      if (instructions.link) {
        window.open(instructions.link, '_blank')
      }
    } catch (error) {
      console.error('Failed to get instructions:', error)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Não autenticado</h2>
          <p className="text-gray-600">Faça login para acessar esta página.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Link2 className="h-8 w-8" />
              Configuração de Afiliados
            </h2>
            <p className="text-muted-foreground">
              Configure seus IDs de afiliado para monetizar os links compartilhados
            </p>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Cliques</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalClicks}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversões</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalConversions}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.conversionRate}%</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Estimada</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {metrics.estimatedRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Platform Configurations */}
        <div className="grid gap-4">
          {platforms.map((platform) => (
            <Card key={platform.key}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${platform.color} flex items-center justify-center text-white text-xl`}>
                      {platform.icon}
                    </div>
                    <div>
                      <CardTitle>{platform.name}</CardTitle>
                      <CardDescription>{platform.helpText}</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openInstructions(platform.platform)}
                  >
                    <Info className="h-4 w-4 mr-2" />
                    Como obter
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 border rounded-md"
                    placeholder={platform.placeholder}
                    value={config[platform.key] || ''}
                    onChange={(e) => handleInputChange(platform.key, e.target.value)}
                  />
                  
                  {/* Botão Gerar UUID apenas para Mercado Livre */}
                  {platform.platform === 'MERCADOLIVRE' && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        const newUUID = generateUUID()
                        handleInputChange(platform.key, newUUID)
                        toast.success('Novo UUID gerado!')
                      }}
                      title="Gerar novo UUID"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={() => validateId(platform.platform, config[platform.key] || '')}
                    disabled={!config[platform.key] || validating === platform.platform}
                  >
                    {validating === platform.platform ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Validar'
                    )}
                  </Button>
                  {config[platform.key] && (
                    <Badge variant="outline" className="self-center">
                      <Check className="h-3 w-3 mr-1 text-green-500" />
                      Configurado
                    </Badge>
                  )}
                </div>
                
                {/* Preview do link para Mercado Livre */}
                {platform.platform === 'MERCADOLIVRE' && config[platform.key] && isValidUUID(config[platform.key] as string) && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <p className="text-xs text-gray-600 mb-1">Preview do link com afiliado:</p>
                    <code className="text-xs break-all text-blue-600">
                      https://produto.com?tracking_id={config[platform.key]}&source=affiliate-profile
                    </code>
                  </div>
                )}
                
                {/* Instruções específicas para Mercado Livre */}
                {platform.platform === 'MERCADOLIVRE' && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800 font-medium mb-2">📌 Como configurar:</p>
                    <ol className="text-xs text-yellow-700 space-y-1 list-decimal list-inside">
                      <li>Use o botão <RefreshCw className="inline h-3 w-3" /> para gerar um novo UUID</li>
                      <li>Ou copie um tracking_id existente do seu painel ML</li>
                      <li>O sistema adiciona automaticamente <code className="bg-yellow-100 px-1">source=affiliate-profile</code></li>
                      <li>Você pode trocar o UUID a qualquer momento</li>
                    </ol>
                    <p className="text-xs text-yellow-600 mt-2">
                      💡 Dica: Cada UUID pode rastrear campanhas diferentes
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tracking Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações de Rastreamento</CardTitle>
            <CardDescription>
              Personalize os parâmetros UTM para rastreamento avançado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enableTracking"
                checked={config.enableTracking}
                onChange={(e) => setConfig(prev => ({ ...prev, enableTracking: e.target.checked }))}
              />
              <label htmlFor="enableTracking" className="text-sm font-medium">
                Habilitar rastreamento de cliques
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium">UTM Source</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md mt-1"
                  placeholder="whatsapp"
                  value={config.customUtmSource || ''}
                  onChange={(e) => handleInputChange('customUtmSource', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">UTM Medium</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md mt-1"
                  placeholder="affiliate"
                  value={config.customUtmMedium || ''}
                  onChange={(e) => handleInputChange('customUtmMedium', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">UTM Campaign</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md mt-1"
                  placeholder="tech-gadgets"
                  value={config.customUtmCampaign || ''}
                  onChange={(e) => handleInputChange('customUtmCampaign', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="min-w-[120px]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      </div>
  )
}