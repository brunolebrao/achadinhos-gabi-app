import { apiClient } from '../client'
import { Contact, Group, PaginatedResponse } from '../types'

interface ContactFilters {
  searchTerm?: string
  tags?: string[]
  page?: number
  limit?: number
}

interface GroupFilters {
  searchTerm?: string
  tags?: string[]
  page?: number
  limit?: number
}

class ContactsService {
  // Contacts
  async getContacts(filters?: ContactFilters): Promise<PaginatedResponse<Contact>> {
    const params = new URLSearchParams()
    
    if (filters) {
      if (filters.searchTerm) params.append('searchTerm', filters.searchTerm)
      if (filters.tags?.length) params.append('tags', filters.tags.join(','))
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())
    }

    const response = await apiClient.get<{
      contacts: Contact[]
      pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
      }
    }>(`/contacts?${params.toString()}`)

    return {
      data: response.contacts,
      pagination: response.pagination
    }
  }

  async getContact(id: string): Promise<Contact> {
    return apiClient.get<Contact>(`/contacts/${id}`)
  }

  async createContact(data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact> {
    return apiClient.post<Contact>('/contacts', data)
  }

  async updateContact(id: string, data: Partial<Contact>): Promise<Contact> {
    return apiClient.put<Contact>(`/contacts/${id}`, data)
  }

  async deleteContact(id: string): Promise<void> {
    await apiClient.delete(`/contacts/${id}`)
  }

  async addTagsToContact(id: string, tags: string[]): Promise<Contact> {
    return apiClient.post(`/contacts/${id}/tags`, { tags })
  }

  async removeTagsFromContact(id: string, tags: string[]): Promise<Contact> {
    return apiClient.delete(`/contacts/${id}/tags`, { data: { tags } })
  }

  // Groups
  async getGroups(filters?: GroupFilters): Promise<PaginatedResponse<Group>> {
    const params = new URLSearchParams()
    
    if (filters) {
      if (filters.searchTerm) params.append('searchTerm', filters.searchTerm)
      if (filters.tags?.length) params.append('tags', filters.tags.join(','))
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())
    }

    const response = await apiClient.get<{
      groups: Group[]
      pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
      }
    }>(`/groups?${params.toString()}`)

    return {
      data: response.groups,
      pagination: response.pagination
    }
  }

  async getGroup(id: string): Promise<Group & { members: Contact[] }> {
    return apiClient.get<Group & { members: Contact[] }>(`/groups/${id}`)
  }

  async updateGroup(id: string, data: Partial<Group>): Promise<Group> {
    return apiClient.put<Group>(`/groups/${id}`, data)
  }

  async deleteGroup(id: string): Promise<void> {
    await apiClient.delete(`/groups/${id}`)
  }

  async addContactsToGroup(groupId: string, contactIds: string[]): Promise<void> {
    await apiClient.post(`/groups/${groupId}/members`, { contactIds })
  }

  async removeContactsFromGroup(groupId: string, contactIds: string[]): Promise<void> {
    await apiClient.delete(`/groups/${groupId}/members`, { data: { contactIds } })
  }

  // Import/Export
  async importContacts(file: File): Promise<{ imported: number; failed: number }> {
    const formData = new FormData()
    formData.append('file', file)

    return apiClient.post('/contacts/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }

  async exportContacts(filters?: ContactFilters): Promise<Blob> {
    const params = new URLSearchParams()
    
    if (filters) {
      if (filters.searchTerm) params.append('searchTerm', filters.searchTerm)
      if (filters.tags?.length) params.append('tags', filters.tags.join(','))
    }

    const response = await apiClient.get(`/contacts/export?${params.toString()}`, {
      responseType: 'blob'
    })

    return response as Blob
  }
}

export const contactsService = new ContactsService()