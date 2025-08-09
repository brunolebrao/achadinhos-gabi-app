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
    
    const response = await apiClient.get<InstagramAuthResponse>(
      `/auth/instagram/connect?${params.toString()}`
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
    return apiClient.get('/auth/instagram/accounts')
  }

  /**
   * Disconnect Instagram account
   */
  async disconnect(accountId: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/auth/instagram/disconnect/${accountId}`)
  }

  /**
   * Refresh access token
   */
  async refreshToken(accountId: string): Promise<{ success: boolean; expiresAt?: string }> {
    return apiClient.post('/auth/instagram/refresh-token', { accountId })
  }

  /**
   * Open Instagram OAuth in popup window
   */
  async connectWithPopup(userId?: string): Promise<InstagramAccount | null> {
    try {
      // Get auth URL
      const { authUrl, state, mockMode } = await this.connect(userId)
      
      // If in mock mode, redirect directly
      if (mockMode) {
        window.location.href = authUrl
        return null // Page will redirect, so return null
      }
      
      // Calculate popup position
      const width = 600
      const height = 700
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2
      
      // Open popup
      const popup = window.open(
        authUrl,
        'instagram-auth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      )
      
      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.')
      }
      
      // Wait for callback
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          try {
            if (popup.closed) {
              clearInterval(checkInterval)
              reject(new Error('Authentication cancelled'))
              return
            }
            
            // Check if popup URL contains callback
            const popupUrl = popup.location.href
            if (popupUrl.includes('/social-accounts')) {
              // Extract code from URL
              const url = new URL(popupUrl)
              const code = url.searchParams.get('instagram_code')
              
              if (code) {
                clearInterval(checkInterval)
                popup.close()
                
                // Exchange code for token
                this.exchangeToken(code, userId || '')
                  .then(result => {
                    if (result.success && result.account) {
                      resolve(result.account)
                    } else {
                      reject(new Error(result.message || 'Failed to connect Instagram'))
                    }
                  })
                  .catch(reject)
              }
            }
          } catch (e) {
            // Cross-origin error is expected, ignore it
          }
        }, 1000)
        
        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(checkInterval)
          if (popup && !popup.closed) {
            popup.close()
          }
          reject(new Error('Authentication timeout'))
        }, 5 * 60 * 1000)
      })
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
      // Check if we have a code in the URL
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('instagram_code')
      const error = urlParams.get('error')
      
      if (error) {
        throw new Error(error)
      }
      
      if (!code) {
        return null
      }
      
      // Get userId from state or local storage
      const userId = urlParams.get('userId') || localStorage.getItem('userId') || ''
      
      // Exchange code for token
      const result = await this.exchangeToken(code, userId)
      
      if (result.success && result.account) {
        // Clean up URL
        const url = new URL(window.location.href)
        url.searchParams.delete('instagram_code')
        url.searchParams.delete('state')
        url.searchParams.delete('userId')
        url.searchParams.delete('error')
        window.history.replaceState({}, '', url.toString())
        
        return result.account
      }
      
      throw new Error(result.message || 'Failed to connect Instagram')
    } catch (error) {
      console.error('Instagram callback error:', error)
      
      // Clean up URL on error
      const url = new URL(window.location.href)
      url.searchParams.delete('instagram_code')
      url.searchParams.delete('state')
      url.searchParams.delete('userId')
      url.searchParams.delete('error')
      window.history.replaceState({}, '', url.toString())
      
      throw error
    }
  }
}

export const instagramAuthService = new InstagramAuthService()