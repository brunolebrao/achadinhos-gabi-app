import { apiClient } from '../client'
import { Template } from '../types'

class TemplatesService {
  async getTemplates(filters?: { category?: string; isActive?: boolean }): Promise<Template[]> {
    const params = new URLSearchParams()
    
    if (filters?.category) {
      params.append('category', filters.category)
    }
    
    if (filters?.isActive !== undefined) {
      params.append('isActive', filters.isActive.toString())
    }

    return apiClient.get<Template[]>(`/templates?${params.toString()}`)
  }

  async getTemplate(id: string): Promise<Template> {
    return apiClient.get<Template>(`/templates/${id}`)
  }

  async createTemplate(data: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<Template> {
    return apiClient.post<Template>('/templates', data)
  }

  async updateTemplate(id: string, data: Partial<Template>): Promise<Template> {
    return apiClient.put<Template>(`/templates/${id}`, data)
  }

  async deleteTemplate(id: string): Promise<void> {
    await apiClient.delete(`/templates/${id}`)
  }

  async previewTemplate(id: string, variables: Record<string, string>): Promise<{ preview: string }> {
    return apiClient.post(`/templates/${id}/preview`, { variables })
  }

  async duplicateTemplate(id: string, name: string): Promise<Template> {
    const template = await this.getTemplate(id)
    const { id: _, createdAt, updatedAt, ...templateData } = template
    
    return this.createTemplate({
      ...templateData,
      name,
      isDefault: false
    })
  }

  async toggleTemplateStatus(id: string): Promise<Template> {
    const template = await this.getTemplate(id)
    return this.updateTemplate(id, { isActive: !template.isActive })
  }

  async setDefaultTemplate(id: string): Promise<Template> {
    return this.updateTemplate(id, { isDefault: true })
  }
}

export const templatesService = new TemplatesService()