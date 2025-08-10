import { apiClient } from '../client'

export interface InstagramAuthResponse {
  authUrl: string
  state: string
  mockMode?: boolean
}

export interface InstagramAccount {
  id: string
  platform: 'INSTAGRAM'
  username: string
  accountId: string
  isActive: boolean
  createdAt: string
  settings?: {
    accountType?: string
    mediaCount?: number
    instagramUserId?: string
    tokenExpiresAt?: string
  }
}

export interface InstagramTokenExchange {
  success: boolean
  account?: InstagramAccount
  error?: string
  message?: string
}

class InstagramAuthService {
  /**
   * Start Instagram OAuth flow
   */
  async connect(userId?: string): Promise<InstagramAuthResponse> {
    const params = new URLSearchParams()
    if (userId) params.set('userId', userId)
    params.set('redirectUri', `${window.location.origin}/social-accounts`)
    
    const response = await apiClient.get<InstagramAuthResponse>(
      `/auth/instagram/oauth/authorize?${params.toString()}`
    )
    
    return response
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeToken(code: string, userId: string): Promise<InstagramTokenExchange> {
    return apiClient.post<InstagramTokenExchange>('/auth/instagram/exchange-token', {
      code,
      userId
    })
  }

  /**
   * Get connected Instagram accounts
   */
  async getAccounts(): Promise<{ accounts: InstagramAccount[] }> {
    try {
      const response = await apiClient.get<{ data: any[] }>('/social-accounts')
      
      // Filter and format Instagram accounts
      const instagramAccounts = response.data
        ?.filter(acc => acc.platform === 'INSTAGRAM')
        ?.map(acc => ({
          id: acc.id,
          platform: 'INSTAGRAM' as const,
          username: acc.username || '@unknown',
          accountId: acc.accountId,
          isActive: acc.isActive,
          createdAt: acc.createdAt,
          settings: acc.settings
        })) || []
      
      return { accounts: instagramAccounts }
    } catch (error) {
      console.error('Failed to fetch Instagram accounts:', error)
      return { accounts: [] }
    }
  }

  /**
   * Disconnect Instagram account
   */
  async disconnect(accountId: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/auth/instagram/oauth/disconnect/${accountId}`)
  }

  /**
   * Refresh access token
   */
  async refreshToken(accountId: string): Promise<{ success: boolean; expiresAt?: string }> {
    return apiClient.post('/auth/instagram/oauth/refresh-token', { accountId })
  }

  /**
   * Connect Instagram using direct redirect
   */
  async connectWithPopup(userId?: string): Promise<InstagramAccount | null> {
    try {
      // Store user ID in localStorage for callback
      if (userId) {
        localStorage.setItem('instagram_user_id', userId)
      }
      
      // Redirect directly to Instagram OAuth
      window.location.href = `/api/auth/instagram/oauth/authorize?${new URLSearchParams({
        userId: userId || '',
        redirectUri: `${window.location.origin}/social-accounts`
      }).toString()}`
      
      return null // Will redirect, so return null
    } catch (error) {
      console.error('Instagram auth error:', error)
      throw error
    }
  }

  /**
   * Handle OAuth callback (when redirected back to the app)
   */
  async handleCallback(): Promise<InstagramAccount | null> {
    try {
      // Check URL params for OAuth callback
      const urlParams = new URLSearchParams(window.location.search)
      const success = urlParams.get('success')
      const error = urlParams.get('error')
      const message = urlParams.get('message')
      const username = urlParams.get('username')
      
      // Clean up URL first
      const cleanUrl = new URL(window.location.href)
      cleanUrl.searchParams.delete('success')
      cleanUrl.searchParams.delete('error')
      cleanUrl.searchParams.delete('message')
      cleanUrl.searchParams.delete('platform')
      cleanUrl.searchParams.delete('username')
      window.history.replaceState({}, '', cleanUrl.toString())
      
      if (error) {
        throw new Error(message || error)
      }
      
      if (success === 'true') {
        // Refresh accounts to get the new connected account
        const { accounts } = await this.getAccounts()
        const newAccount = accounts.find(acc => acc.username === `@${username}`)
        
        // Clean up localStorage
        localStorage.removeItem('instagram_user_id')
        
        return newAccount || null
      }
      
      return null
    } catch (error) {
      console.error('Instagram callback error:', error)
      
      // Clean up localStorage on error
      localStorage.removeItem('instagram_user_id')
      
      throw error
    }
  }
}

export const instagramAuthService = new InstagramAuthService()