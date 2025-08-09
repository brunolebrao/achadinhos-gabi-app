import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios'
import { getSession } from 'next-auth/react'

interface ApiError {
  message: string
  statusCode: number
  error?: string
}

class ApiClient {
  private client: AxiosInstance
  private static instance: ApiClient

  private constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 30000,
    })

    // Request interceptor para adicionar token
    this.client.interceptors.request.use(
      async (config) => {
        // Get the session from NextAuth
        const session = await getSession()
        
        if (session?.accessToken) {
          config.headers.Authorization = `Bearer ${session.accessToken}`
        }
        
        // Log para debug
        console.log('🚀 API Request:', config.method?.toUpperCase(), config.url, config.data)
        
        return config
      },
      (error) => {
        console.error('❌ Request Error:', error)
        return Promise.reject(error)
      }
    )

    // Response interceptor para tratamento de erros
    this.client.interceptors.response.use(
      (response) => {
        // Log para debug
        console.log('✅ API Response:', response.status, response.config.url, response.data)
        return response
      },
      async (error: AxiosError<ApiError>) => {
        console.error('❌ Response Error:', error.response?.status, error.response?.data, error.message)
        
        if (error.response?.status === 401) {
          // Token expirado ou inválido - NextAuth will handle redirect
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/api/auth/signin?callbackUrl=' + encodeURIComponent(window.location.pathname)
          }
        }

        const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error || 
                           error.message || 
                           'Erro desconhecido'
        
        const apiError: ApiError = {
          message: errorMessage,
          statusCode: error.response?.status || 500,
          error: error.response?.data?.error
        }

        return Promise.reject(apiError)
      }
    )
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient()
    }
    return ApiClient.instance
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config)
    return response.data
  }

  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config)
    return response.data
  }

  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config)
    return response.data
  }

  public async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config)
    return response.data
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config)
    return response.data
  }
}

export const apiClient = ApiClient.getInstance()
export type { ApiError }