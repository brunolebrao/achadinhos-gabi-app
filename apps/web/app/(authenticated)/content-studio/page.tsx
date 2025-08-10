'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@repo/ui/card'
import { Button } from '@repo/ui/button'
import { Badge } from '@repo/ui/badge'
import { 
  Image, 
  Video, 
  FileText, 
  Palette, 
  Wand2, 
  Download,
  Eye,
  Copy,
  Share2,
  Instagram,
  Music2,
  MessageCircle,
  Upload,
  X,
  Calendar,
  Loader2
} from 'lucide-react'
import { instagramAuthService } from '@/lib/api/services/instagram-auth.service'
import { instagramPublisherService } from '@/lib/api/services/instagram-publisher.service'
import { toast } from 'sonner'
import { Toaster } from 'sonner'

export default function ContentStudioPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<'instagram' | 'tiktok' | 'whatsapp'>('instagram')
  const [selectedFormat, setSelectedFormat] = useState<'post' | 'story' | 'reel'>('post')
  const [previewContent, setPreviewContent] = useState<any>(null)
  const [instagramAccounts, setInstagramAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [caption, setCaption] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)
  const [showScheduler, setShowScheduler] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (selectedPlatform === 'instagram') {
      fetchInstagramAccounts()
    }
  }, [selectedPlatform])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        instagramPublisherService.revokePreviewUrl(previewUrl)
      }
    }
  }, [previewUrl])

  const fetchInstagramAccounts = async () => {
    try {
      const { accounts } = await instagramAuthService.getAccounts()
      setInstagramAccounts(accounts)
      if (accounts.length > 0 && !selectedAccount && accounts[0]) {
        setSelectedAccount(accounts[0].accountId)
      }
    } catch (error) {
      console.error('Failed to fetch Instagram accounts:', error)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const mediaType = file.type.startsWith('image/') ? 'image' : 'video'
    const validation = instagramPublisherService.validateMedia(
      file,
      mediaType === 'video' && selectedFormat === 'reel' ? 'reel' : mediaType
    )

    if (!validation.valid) {
      toast.error(validation.error)
      return
    }

    setUploadedFile(file)
    const url = instagramPublisherService.generatePreviewUrl(file)
    setPreviewUrl(url)
  }

  const removeUploadedFile = () => {
    if (previewUrl) {
      instagramPublisherService.revokePreviewUrl(previewUrl)
    }
    setUploadedFile(null)
    setPreviewUrl('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handlePublish = async () => {
    if (!selectedAccount) {
      toast.error('Selecione uma conta do Instagram')
      return
    }

    if (!uploadedFile) {
      toast.error('Adicione uma imagem ou vídeo')
      return
    }

    if (!caption.trim()) {
      toast.error('Adicione uma legenda')
      return
    }

    setIsPublishing(true)

    try {
      // Upload media first
      const mediaUpload = await instagramPublisherService.uploadMedia(uploadedFile)
      
      // Generate caption with hashtags
      const fullCaption = instagramPublisherService.generateCaption(
        caption,
        hashtags.split(' ').filter(tag => tag.trim()),
        undefined,
        undefined
      )

      // Determine media type
      let mediaType: 'IMAGE' | 'VIDEO' | 'REELS' = 'IMAGE'
      if (uploadedFile.type.startsWith('video/')) {
        mediaType = selectedFormat === 'reel' ? 'REELS' : 'VIDEO'
      }

      // Publish or schedule
      if (showScheduler && scheduledDate && scheduledTime) {
        const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`)
        const result = await instagramPublisherService.schedule({
          accountId: selectedAccount,
          caption: fullCaption,
          mediaType,
          imageUrl: mediaType === 'IMAGE' ? mediaUpload.url : undefined,
          videoUrl: mediaType !== 'IMAGE' ? mediaUpload.url : undefined,
          scheduledFor
        })

        if (result.success) {
          toast.success('Post agendado com sucesso!')
          resetForm()
        } else {
          throw new Error(result.error || 'Falha ao agendar post')
        }
      } else {
        const result = await instagramPublisherService.publish({
          accountId: selectedAccount,
          caption: fullCaption,
          mediaType,
          imageUrl: mediaType === 'IMAGE' ? mediaUpload.url : undefined,
          videoUrl: mediaType !== 'IMAGE' ? mediaUpload.url : undefined
        })

        if (result.success) {
          toast.success('Publicado no Instagram com sucesso!')
          resetForm()
        } else {
          throw new Error(result.error || 'Falha ao publicar')
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao publicar conteúdo')
    } finally {
      setIsPublishing(false)
    }
  }

  const resetForm = () => {
    removeUploadedFile()
    setCaption('')
    setHashtags('')
    setScheduledDate('')
    setScheduledTime('')
    setShowScheduler(false)
  }

  const platforms = [
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'from-purple-500 to-pink-500' },
    { id: 'tiktok', name: 'TikTok', icon: Music2, color: 'from-black to-gray-800' },
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, color: 'from-green-500 to-green-600' }
  ]

  const formats = {
    instagram: [
      { id: 'post', name: 'Post', dimensions: '1080x1080' },
      { id: 'story', name: 'Story', dimensions: '1080x1920' },
      { id: 'reel', name: 'Reel', dimensions: '1080x1920' }
    ],
    tiktok: [
      { id: 'video', name: 'Vídeo', dimensions: '1080x1920' },
      { id: 'live', name: 'Live', dimensions: '1080x1920' }
    ],
    whatsapp: [
      { id: 'status', name: 'Status', dimensions: '1080x1920' },
      { id: 'message', name: 'Mensagem', dimensions: 'Variável' }
    ]
  }

  const templates = [
    { id: '1', name: 'Oferta Flash', type: 'image', preview: '🔥' },
    { id: '2', name: 'Desconto Especial', type: 'image', preview: '💰' },
    { id: '3', name: 'Novo Produto', type: 'image', preview: '✨' },
    { id: '4', name: 'Countdown', type: 'video', preview: '⏰' },
    { id: '5', name: 'Antes e Depois', type: 'carousel', preview: '📸' }
  ]

  return (
    <>
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Sidebar - Tools */}
      <div className="w-80 border-r p-6 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Content Studio</h2>

        {/* Platform Selection */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Plataforma
          </label>
          <div className="grid grid-cols-3 gap-2">
            {platforms.map(platform => {
              const Icon = platform.icon
              return (
                <button
                  key={platform.id}
                  onClick={() => setSelectedPlatform(platform.id as any)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedPlatform === platform.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-6 h-6 mx-auto" />
                  <span className="text-xs mt-1 block">{platform.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Format Selection */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Formato
          </label>
          <div className="space-y-2">
            {formats[selectedPlatform]?.map(format => (
              <button
                key={format.id}
                onClick={() => setSelectedFormat(format.id as any)}
                className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                  selectedFormat === format.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{format.name}</span>
                  <span className="text-xs text-gray-500">{format.dimensions}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Templates */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Templates
          </label>
          <div className="grid grid-cols-2 gap-2">
            {templates.map(template => (
              <Card
                key={template.id}
                className="p-4 cursor-pointer hover:border-purple-500 transition-all"
              >
                <div className="text-3xl text-center mb-2">{template.preview}</div>
                <p className="text-xs text-center text-gray-600">{template.name}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Tools */}
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start">
            <Palette className="w-4 h-4 mr-2" />
            Paleta de Cores
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <FileText className="w-4 h-4 mr-2" />
            Adicionar Texto
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <Image className="w-4 h-4 mr-2" />
            Upload de Imagem
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <Wand2 className="w-4 h-4 mr-2" />
            Gerar com IA
          </Button>
        </div>
      </div>

      {/* Center - Canvas */}
      <div className="flex-1 bg-gray-50 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Canvas Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold">Canvas</h3>
              <Badge variant="secondary">
                {selectedPlatform} - {selectedFormat}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button variant="outline" size="sm">
                <Copy className="w-4 h-4 mr-2" />
                Duplicar
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>

          {/* Canvas Area */}
          <Card className="aspect-square bg-white shadow-lg overflow-hidden">
            {previewUrl ? (
              <div className="relative w-full h-full">
                {uploadedFile?.type.startsWith('image/') ? (
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video 
                    src={previewUrl} 
                    controls 
                    className="w-full h-full object-cover"
                  />
                )}
                <button
                  onClick={removeUploadedFile}
                  className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-center">
                  <Upload className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-lg font-medium">Clique para adicionar mídia</p>
                  <p className="text-sm mt-2">ou arraste uma imagem/vídeo aqui</p>
                  <p className="text-xs mt-4 text-gray-500">
                    Imagens: JPG, PNG (máx. 8MB)<br/>
                    Vídeos: MP4, MOV (máx. 100MB)
                  </p>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </Card>

          {/* Quick Actions */}
          <div className="mt-6">
            {selectedPlatform === 'instagram' && instagramAccounts.length > 0 && (
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Conta do Instagram
                </label>
                <select 
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  {instagramAccounts.map(account => (
                    <option key={account.id} value={account.accountId}>
                      @{account.username}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {showScheduler && (
              <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Data
                    </label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Hora
                    </label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-center gap-4">
              {selectedPlatform === 'instagram' ? (
                <>
                  {instagramAccounts.length === 0 ? (
                    <Button 
                      onClick={() => window.location.href = '/social-accounts'}
                      className="flex items-center gap-2"
                    >
                      <Instagram className="w-4 h-4" />
                      Conectar Instagram
                    </Button>
                  ) : (
                    <>
                      <Button 
                        onClick={handlePublish}
                        disabled={isPublishing || !uploadedFile || !caption}
                        className="flex items-center gap-2"
                      >
                        {isPublishing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {showScheduler ? 'Agendando...' : 'Publicando...'}
                          </>
                        ) : (
                          <>
                            <Share2 className="w-4 h-4" />
                            {showScheduler ? 'Agendar Post' : 'Publicar Agora'}
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setShowScheduler(!showScheduler)}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        {showScheduler ? 'Publicar Agora' : 'Agendar'}
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <Button variant="outline" disabled>
                  Em breve
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Properties */}
      <div className="w-80 border-l p-6 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Propriedades</h3>

        {/* Element Properties */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Legenda
            </label>
            <textarea
              className="w-full p-2 border rounded-lg"
              rows={5}
              placeholder="Digite a legenda do seu post..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={2200}
            />
            <p className="text-xs text-gray-500 mt-1">
              {caption.length}/2200 caracteres
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Hashtags
            </label>
            <input
              type="text"
              className="w-full p-2 border rounded-lg"
              placeholder="#promoção #desconto #oferta"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Separe as hashtags com espaço
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Call to Action
            </label>
            <select className="w-full p-2 border rounded-lg">
              <option>Compre Agora</option>
              <option>Saiba Mais</option>
              <option>Aproveite</option>
              <option>Link na Bio</option>
            </select>
          </div>
        </div>

        {/* Style Properties */}
        <div className="mt-6 pt-6 border-t">
          <h4 className="font-medium mb-3">Estilo</h4>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">
                Cor de Fundo
              </label>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded bg-white border cursor-pointer" />
                <div className="w-8 h-8 rounded bg-black cursor-pointer" />
                <div className="w-8 h-8 rounded bg-purple-500 cursor-pointer" />
                <div className="w-8 h-8 rounded bg-pink-500 cursor-pointer" />
                <div className="w-8 h-8 rounded bg-blue-500 cursor-pointer" />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">
                Fonte
              </label>
              <select className="w-full p-2 border rounded-lg text-sm">
                <option>Inter</option>
                <option>Roboto</option>
                <option>Montserrat</option>
                <option>Playfair Display</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">
                Tamanho do Texto
              </label>
              <input
                type="range"
                min="12"
                max="72"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    <Toaster position="top-right" />
    </>
  )
}