import { apiClient } from '../client'
import { Product, ProductFilters, PaginatedResponse } from '../types'

class ProductsService {
  async getProducts(filters?: ProductFilters): Promise<PaginatedResponse<Product>> {
    const params = new URLSearchParams()
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString())
        }
      })
    }

    const response = await apiClient.get<{
      products: Product[]
      pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
      }
    }>(`/products?${params.toString()}`)

    return {
      data: response.products,
      pagination: response.pagination
    }
  }

  async getProduct(id: string): Promise<Product> {
    return apiClient.get<Product>(`/products/${id}`)
  }

  async createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    return apiClient.post<Product>('/products', data)
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    return apiClient.patch<Product>(`/products/${id}`, data)
  }

  async updateProductStatus(id: string, status: Product['status']): Promise<Product> {
    return apiClient.patch<Product>(`/products/${id}/status`, { status })
  }

  async deleteProduct(id: string): Promise<void> {
    await apiClient.delete(`/products/${id}`)
  }

  async bulkUpdateStatus(ids: string[], status: Product['status']): Promise<void> {
    await apiClient.post('/products/bulk-status', { ids, status })
  }

  async bulkDelete(ids: string[]): Promise<{ deleted: number; message: string }> {
    return apiClient.post<{ deleted: number; message: string }>('/products/bulk-delete', { ids })
  }

  async importProducts(file: File): Promise<{ imported: number; failed: number }> {
    const formData = new FormData()
    formData.append('file', file)

    return apiClient.post('/products/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }

  async exportProducts(filters?: ProductFilters): Promise<Blob> {
    const params = new URLSearchParams()
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString())
        }
      })
    }

    const response = await apiClient.get(`/products/export?${params.toString()}`, {
      responseType: 'blob'
    })

    return response as Blob
  }
}

export const productsService = new ProductsService()