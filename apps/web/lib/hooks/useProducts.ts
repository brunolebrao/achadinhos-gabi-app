import { useEffect } from 'react'
import { useProductsStore } from '../stores'
import { ProductFilters } from '../api/types'

export function useProducts(autoFetch = true) {
  const {
    products,
    pagination,
    filters,
    isLoading,
    error,
    fetchProducts,
    setFilters,
    setPage,
    resetFilters
  } = useProductsStore()

  useEffect(() => {
    if (autoFetch) {
      fetchProducts()
    }
  }, [autoFetch, filters, fetchProducts])

  const updateFilters = (newFilters: Partial<ProductFilters>) => {
    setFilters(newFilters)
  }

  const goToPage = (page: number) => {
    setPage(page)
  }

  const refresh = () => {
    fetchProducts()
  }

  return {
    products,
    pagination,
    filters,
    isLoading,
    error,
    updateFilters,
    goToPage,
    resetFilters,
    refresh
  }
}