'use client'

import { useState } from 'react'
import { Card } from '@repo/ui/card'
import { Button } from '@repo/ui/button'
import { Badge } from '@repo/ui/badge'
import { 
  Image,
  Video,
  FileText,
  Upload,
  Download,
  Trash2,
  Edit,
  Eye,
  Filter,
  Search,
  Grid,
  List,
  Wand2,
  Sparkles,
  Palette,
  Layers
} from 'lucide-react'

interface MediaItem {
  id: string
  type: 'image' | 'video' | 'template'
  name: string
  url: string
  thumbnail?: string
  platform: string
  dimensions: string
  size: string
  createdAt: string
  tags: string[]
}

export default function MediaLibraryPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedType, setSelectedType] = useState<'all' | 'image' | 'video' | 'template'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  const mediaItems: MediaItem[] = [
    {
      id: '1',
      type: 'image',
      name: 'Oferta Flash - Fone Bluetooth',
      url: '/api/placeholder/400/400',
      platform: 'Instagram',
      dimensions: '1080x1080',
      size: '245 KB',
      createdAt: '2024-01-15',
      tags: ['promoção', 'eletrônicos', 'instagram']
    },
    {
      id: '2',
      type: 'video',
      name: 'Review Produto - TikTok',
      url: '/api/placeholder/400/600',
      thumbnail: '/api/placeholder/400/600',
      platform: 'TikTok',
      dimensions: '1080x1920',
      size: '12.3 MB',
      createdAt: '2024-01-14',
      tags: ['review', 'tiktok', 'vídeo']
    },
    {
      id: '3',
      type: 'template',
      name: 'Template Story - Countdown',
      url: '/api/placeholder/400/700',
      platform: 'Instagram',
      dimensions: '1080x1920',
      size: '156 KB',
      createdAt: '2024-01-13',
      tags: ['template', 'story', 'countdown']
    }
  ]

  const filteredItems = mediaItems.filter(item => {
    const matchesType = selectedType === 'all' || item.type === selectedType
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.tags.some(tag => tag.includes(searchQuery.toLowerCase()))
    return matchesType && matchesSearch
  })

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="w-4 h-4" />
      case 'video':
        return <Video className="w-4 h-4" />
      case 'template':
        return <FileText className="w-4 h-4" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Biblioteca de Mídia</h1>
          <p className="text-gray-600 mt-2">
            Gerencie imagens, vídeos e templates para suas publicações
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
          <Button>
            <Wand2 className="w-4 h-4 mr-2" />
            Gerar com IA
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 cursor-pointer hover:border-purple-500 transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold">Gerar Card</h3>
              <p className="text-sm text-gray-500">Criar card de produto</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 cursor-pointer hover:border-purple-500 transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Video className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold">Criar Vídeo</h3>
              <p className="text-sm text-gray-500">Vídeo promocional</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 cursor-pointer hover:border-purple-500 transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Layers className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold">Criar Story</h3>
              <p className="text-sm text-gray-500">Story animado</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 cursor-pointer hover:border-purple-500 transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Palette className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold">Templates</h3>
              <p className="text-sm text-gray-500">Biblioteca de templates</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <Button
                variant={selectedType === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedType('all')}
              >
                Todos
              </Button>
              <Button
                variant={selectedType === 'image' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedType('image')}
              >
                <Image className="w-4 h-4 mr-1" />
                Imagens
              </Button>
              <Button
                variant={selectedType === 'video' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedType('video')}
              >
                <Video className="w-4 h-4 mr-1" />
                Vídeos
              </Button>
              <Button
                variant={selectedType === 'template' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedType('template')}
              >
                <FileText className="w-4 h-4 mr-1" />
                Templates
              </Button>
            </div>

            <div className="flex bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          </div>
        </div>

        {selectedItems.length > 0 && (
          <div className="mt-4 p-3 bg-purple-50 rounded-lg flex items-center justify-between">
            <span className="text-sm text-purple-700">
              {selectedItems.length} item(s) selecionado(s)
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1" />
                Baixar
              </Button>
              <Button variant="outline" size="sm" className="text-red-600">
                <Trash2 className="w-4 h-4 mr-1" />
                Excluir
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Media Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredItems.map(item => (
            <Card
              key={item.id}
              className={`overflow-hidden cursor-pointer transition-all ${
                selectedItems.includes(item.id) ? 'ring-2 ring-purple-500' : 'hover:shadow-lg'
              }`}
              onClick={() => toggleItemSelection(item.id)}
            >
              <div className="aspect-square bg-gray-100 relative">
                {item.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="p-3 bg-black bg-opacity-50 rounded-full">
                      <Video className="w-6 h-6 text-white" />
                    </div>
                  </div>
                )}
                {selectedItems.includes(item.id) && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-medium line-clamp-1">{item.name}</h3>
                  {getTypeIcon(item.type)}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <span>{item.dimensions}</span>
                  <span>•</span>
                  <span>{item.size}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {item.tags.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {item.tags.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{item.tags.length - 2}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="divide-y">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className={`p-4 flex items-center gap-4 hover:bg-gray-50 cursor-pointer ${
                  selectedItems.includes(item.id) ? 'bg-purple-50' : ''
                }`}
                onClick={() => toggleItemSelection(item.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={() => {}}
                  className="rounded"
                />
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  {getTypeIcon(item.type)}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{item.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                    <span>{item.platform}</span>
                    <span>{item.dimensions}</span>
                    <span>{item.size}</span>
                    <span>{item.createdAt}</span>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {item.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}