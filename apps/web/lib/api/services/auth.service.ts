import { apiClient } from '../client'
import { User } from '../types'

class AuthService {
  async register(data: {
    email: string
    password: string
    name: string
  }): Promise<{ user: User; token: string }> {
    try {
      console.log('📝 Tentando registro para:', data.email)
      
      const response = await apiClient.post<{ user: User; token: string }>('/auth/register', data)
      
      console.log('✅ Registro bem-sucedido para:', data.email)
      
      return response
    } catch (error: any) {
      console.error('❌ Erro no registro:', error)
      throw error
    }
  }

  async getCurrentUser(): Promise<{ user: User }> {
    try {
      console.log('👤 Buscando usuário atual...')
      const response = await apiClient.get<{ user: User }>('/auth/me')
      console.log('✅ Usuário atual:', response.user.name)
      return response
    } catch (error: any) {
      console.error('❌ Erro ao buscar usuário atual:', error)
      throw error
    }
  }
}

export const authService = new AuthService()