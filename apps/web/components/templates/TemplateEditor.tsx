'use client'

import { useState, useEffect } from 'react'
import { Card } from '@repo/ui/card'
import { Button } from '@repo/ui/button'
import { Badge } from '@repo/ui/badge'
import { 
  Code,
  Eye,
  Save,
  Copy,
  Trash2,
  Plus,
  Variable,
  Hash,
  Image,
  Type,
  Link,
  DollarSign,
  Percent,
  Star
} from 'lucide-react'

interface Template {
  id?: string
  name: string
  platform: 'INSTAGRAM' | 'TIKTOK' | 'WHATSAPP'
  type: string
  content: string
  category?: string
  variables?: Record<string, any>
  isDefault?: boolean
}

interface TemplateEditorProps {
  template?: Template
  onSave: (template: Template) => void
  onCancel: () => void
}

export function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
  const [editingTemplate, setEditingTemplate] = useState<Template>(
    template || {
      name: '',
      platform: 'INSTAGRAM',
      type: 'FEED_POST',
      content: '',
      category: '',
      variables: {}
    }
  )
  const [previewData, setPreviewData] = useState<Record<string, any>>({
    title: 'Produto Exemplo',
    price: 99.90,
    originalPrice: 149.90,
    discount: '-33%',
    platform: 'MERCADOLIVRE',
    category: 'eletrônicos',
    affiliateUrl: 'https://link.exemplo.com/abc123'
  })
  const [showPreview, setShowPreview] = useState(false)

  const variableButtons = [
    { key: 'title', icon: Type, label: 'Título' },
    { key: 'price', icon: DollarSign, label: 'Preço' },
    { key: 'originalPrice', icon: DollarSign, label: 'Preço Original' },
    { key: 'discount', icon: Percent, label: 'Desconto' },
    { key: 'platform', icon: Hash, label: 'Plataforma' },
    { key: 'category', icon: Hash, label: 'Categoria' },
    { key: 'affiliateUrl', icon: Link, label: 'Link Afiliado' },
    { key: 'rating', icon: Star, label: 'Avaliação' },
    { key: 'imageUrl', icon: Image, label: 'Imagem' }
  ]

  const platformTemplates = {
    INSTAGRAM: {
      types: [
        { value: 'FEED_POST', label: 'Post no Feed' },
        { value: 'STORY', label: 'Story' },
        { value: 'REEL', label: 'Reel' }
      ],
      categories: ['Promoção', 'Lançamento', 'Urgência', 'Coleção', 'Review']
    },
    TIKTOK: {
      types: [
        { value: 'VIDEO', label: 'Vídeo' }
      ],
      categories: ['Viral', 'Educacional', 'Entretenimento', 'Review', 'Haul']
    },
    WHATSAPP: {
      types: [
        { value: 'MESSAGE', label: 'Mensagem' }
      ],
      categories: ['Diária', 'Flash', 'Exclusiva', 'Grupo VIP', 'Alerta']
    }
  }

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('template-content') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = editingTemplate.content
      const before = text.substring(0, start)
      const after = text.substring(end, text.length)
      const newContent = before + `{{${variable}}}` + after
      
      setEditingTemplate({ ...editingTemplate, content: newContent })
      
      // Restore cursor position
      setTimeout(() => {
        textarea.selectionStart = start + variable.length + 4
        textarea.selectionEnd = start + variable.length + 4
        textarea.focus()
      }, 0)
    }
  }

  const getPreviewContent = () => {
    let content = editingTemplate.content
    
    Object.keys(previewData).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      content = content.replace(regex, previewData[key])
    })
    
    return content
  }

  const handleSave = () => {
    // Extract variables from content
    const variableMatches = editingTemplate.content.match(/{{(\w+)}}/g)
    const variables: Record<string, any> = {}
    
    if (variableMatches) {
      variableMatches.forEach(match => {
        const variable = match.replace(/[{}]/g, '')
        if (!variables[variable]) {
          variables[variable] = {
            type: 'string',
            required: true,
            default: previewData[variable] || ''
          }
        }
      })
    }
    
    onSave({
      ...editingTemplate,
      variables
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Editor */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Editor de Template</h2>
        
        <div className="space-y-4">
          {/* Template Name */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Nome do Template
            </label>
            <input
              type="text"
              value={editingTemplate.name}
              onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
              className="w-full p-2 border rounded-lg"
              placeholder="Ex: Oferta Flash Instagram"
            />
          </div>

          {/* Platform & Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Plataforma
              </label>
              <select
                value={editingTemplate.platform}
                onChange={(e) => setEditingTemplate({ 
                  ...editingTemplate, 
                  platform: e.target.value as any,
                  type: platformTemplates[e.target.value as keyof typeof platformTemplates].types[0].value
                })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="INSTAGRAM">Instagram</option>
                <option value="TIKTOK">TikTok</option>
                <option value="WHATSAPP">WhatsApp</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Tipo
              </label>
              <select
                value={editingTemplate.type}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, type: e.target.value })}
                className="w-full p-2 border rounded-lg"
              >
                {platformTemplates[editingTemplate.platform].types.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Categoria
            </label>
            <select
              value={editingTemplate.category}
              onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value })}
              className="w-full p-2 border rounded-lg"
            >
              <option value="">Selecione...</option>
              {platformTemplates[editingTemplate.platform].categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Variables */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Variáveis Disponíveis
            </label>
            <div className="grid grid-cols-3 gap-2">
              {variableButtons.map(variable => {
                const Icon = variable.icon
                return (
                  <Button
                    key={variable.key}
                    variant="outline"
                    size="sm"
                    onClick={() => insertVariable(variable.key)}
                    className="justify-start"
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    <span className="text-xs">{variable.label}</span>
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Content Editor */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Conteúdo do Template
            </label>
            <textarea
              id="template-content"
              value={editingTemplate.content}
              onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
              className="w-full p-3 border rounded-lg font-mono text-sm"
              rows={12}
              placeholder="Digite o conteúdo do template...&#10;&#10;Use {{variavel}} para inserir variáveis dinâmicas"
            />
            <div className="mt-2 text-xs text-gray-500">
              {editingTemplate.platform === 'WHATSAPP' && (
                <div>Dica: Use *texto* para negrito, _texto_ para itálico, ~texto~ para tachado</div>
              )}
              {editingTemplate.platform === 'INSTAGRAM' && (
                <div>Dica: Use #hashtags e @menções para melhor engajamento</div>
              )}
              {editingTemplate.platform === 'TIKTOK' && (
                <div>Dica: Mantenha o texto curto e use hashtags trending</div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? 'Ocultar' : 'Mostrar'} Preview
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Template
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Preview */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Preview</h2>
          <Badge>{editingTemplate.platform}</Badge>
        </div>

        {showPreview ? (
          <>
            {/* Preview Data Controls */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Dados de Teste</h3>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Título"
                  value={previewData.title}
                  onChange={(e) => setPreviewData({ ...previewData, title: e.target.value })}
                  className="p-1 text-xs border rounded"
                />
                <input
                  type="number"
                  placeholder="Preço"
                  value={previewData.price}
                  onChange={(e) => setPreviewData({ ...previewData, price: e.target.value })}
                  className="p-1 text-xs border rounded"
                />
                <input
                  type="number"
                  placeholder="Preço Original"
                  value={previewData.originalPrice}
                  onChange={(e) => setPreviewData({ ...previewData, originalPrice: e.target.value })}
                  className="p-1 text-xs border rounded"
                />
                <input
                  type="text"
                  placeholder="Desconto"
                  value={previewData.discount}
                  onChange={(e) => setPreviewData({ ...previewData, discount: e.target.value })}
                  className="p-1 text-xs border rounded"
                />
              </div>
            </div>

            {/* Rendered Preview */}
            <div className={`p-4 rounded-lg ${
              editingTemplate.platform === 'WHATSAPP' ? 'bg-green-50' :
              editingTemplate.platform === 'INSTAGRAM' ? 'bg-gradient-to-br from-purple-50 to-pink-50' :
              'bg-black text-white'
            }`}>
              <div className="whitespace-pre-wrap text-sm">
                {getPreviewContent()}
              </div>
              
              {editingTemplate.platform === 'INSTAGRAM' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex gap-4 text-xs text-gray-600">
                    <span>❤️ 1,234</span>
                    <span>💬 56</span>
                    <span>📤 23</span>
                    <span>🔖 89</span>
                  </div>
                </div>
              )}
              
              {editingTemplate.platform === 'TIKTOK' && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="flex gap-4 text-xs">
                    <span>❤️ 5.2K</span>
                    <span>💬 234</span>
                    <span>↗️ 567</span>
                    <span>🔖 123</span>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-400">
            <div className="text-center">
              <Eye className="w-12 h-12 mx-auto mb-2" />
              <p>Clique em "Mostrar Preview" para visualizar</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}