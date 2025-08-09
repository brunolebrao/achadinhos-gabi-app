import { create } from 'zustand'
import { Product, ProductFilters, PaginatedResponse } from '../api/types'
import { productsService } from '../api/services'

interface ProductsState {
  // Data
  products: Product[]
  selectedProduct: Product | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  
  // Filters
  filters: ProductFilters
  
  // UI State
  isLoading: boolean
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
  error: string | null
  
  // Actions
  fetchProducts: (filters?: ProductFilters) => Promise<void>
  fetchProduct: (id: string) => Promise<void>
  createProduct: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Product>
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>
  updateProductStatus: (id: string, status: Product['status']) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  bulkDeleteProducts: (ids: string[]) => Promise<{ deleted: number; message: string }>
  
  // Filter actions
  setFilters: (filters: Partial<ProductFilters>) => void
  resetFilters: () => void
  setPage: (page: number) => void
  
  // UI actions
  setSelectedProduct: (product: Product | null) => void
  clearError: () => void
}

const initialFilters: ProductFilters = {
  page: 1,
  limit: 20,
  searchTerm: '',
  platform: undefined,
  category: undefined,
  status: undefined,
  minPrice: undefined,
  maxPrice: undefined,
  minDiscount: undefined
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  // Initial state
  products: [],
  selectedProduct: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  },
  filters: initialFilters,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,

  // Actions
  fetchProducts: async (customFilters?: ProductFilters) => {
    set({ isLoading: true, error: null })
    try {
      const filters = customFilters || get().filters
      const response = await productsService.getProducts(filters)
      set({
        products: response.data,
        pagination: response.pagination,
        filters,
        isLoading: false
      })
    } catch (error: any) {
      set({ 
        error: error.message || 'Erro ao carregar produtos',
        isLoading: false 
      })
    }
  },

  fetchProduct: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const product = await productsService.getProduct(id)
      set({ 
        selectedProduct: product,
        isLoading: false 
      })
    } catch (error: any) {
      set({ 
        error: error.message || 'Erro ao carregar produto',
        isLoading: false 
      })
    }
  },

  createProduct: async (data) => {
    set({ isCreating: true, error: null })
    try {
      const product = await productsService.createProduct(data)
      
      // Atualizar lista local
      set(state => ({
        products: [product, ...state.products],
        isCreating: false
      }))
      
      return product
    } catch (error: any) {
      set({ 
        error: error.message || 'Erro ao criar produto',
        isCreating: false 
      })
      throw error
    }
  },

  updateProduct: async (id, data) => {
    set({ isUpdating: true, error: null })
    try {
      const updatedProduct = await productsService.updateProduct(id, data)
      
      // Atualizar lista local
      set(state => ({
        products: state.products.map(p => 
          p.id === id ? updatedProduct : p
        ),
        selectedProduct: state.selectedProduct?.id === id 
          ? updatedProduct 
          : state.selectedProduct,
        isUpdating: false
      }))
    } catch (error: any) {
      set({ 
        error: error.message || 'Erro ao atualizar produto',
        isUpdating: false 
      })
      throw error
    }
  },

  updateProductStatus: async (id, status) => {
    set({ isUpdating: true, error: null })
    try {
      const updatedProduct = await productsService.updateProductStatus(id, status)
      
      // Atualizar lista local
      set(state => ({
        products: state.products.map(p => 
          p.id === id ? updatedProduct : p
        ),
        selectedProduct: state.selectedProduct?.id === id 
          ? updatedProduct 
          : state.selectedProduct,
        isUpdating: false
      }))
    } catch (error: any) {
      set({ 
        error: error.message || 'Erro ao atualizar status',
        isUpdating: false 
      })
      throw error
    }
  },

  deleteProduct: async (id) => {
    set({ isDeleting: true, error: null })
    try {
      await productsService.deleteProduct(id)
      
      // Remover da lista local
      set(state => ({
        products: state.products.filter(p => p.id !== id),
        selectedProduct: state.selectedProduct?.id === id 
          ? null 
          : state.selectedProduct,
        isDeleting: false
      }))
    } catch (error: any) {
      set({ 
        error: error.message || 'Erro ao deletar produto',
        isDeleting: false 
      })
      throw error
    }
  },

  bulkDeleteProducts: async (ids) => {
    set({ isDeleting: true, error: null })
    try {
      const result = await productsService.bulkDelete(ids)
      
      // Remover da lista local
      set(state => ({
        products: state.products.filter(p => !ids.includes(p.id)),
        selectedProduct: state.selectedProduct && ids.includes(state.selectedProduct.id)
          ? null 
          : state.selectedProduct,
        isDeleting: false
      }))
      
      return result
    } catch (error: any) {
      set({ 
        error: error.message || 'Erro ao deletar produtos',
        isDeleting: false 
      })
      throw error
    }
  },

  // Filter actions
  setFilters: (newFilters) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters, page: 1 }
    }))
  },

  resetFilters: () => {
    set({ filters: initialFilters })
  },

  setPage: (page) => {
    set(state => ({
      filters: { ...state.filters, page }
    }))
  },

  // UI actions
  setSelectedProduct: (product) => {
    set({ selectedProduct: product })
  },

  clearError: () => {
    set({ error: null })
  }
}))