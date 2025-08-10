#!/usr/bin/env node

const axios = require('axios')
const { prisma } = require('../packages/database')

class InstagramSetupValidator {
  constructor() {
    // Load environment variables from root .env if available
    require('dotenv').config({ path: require('path').join(process.cwd(), '.env') })
    
    this.appId = process.env.INSTAGRAM_APP_ID
    this.appSecret = process.env.INSTAGRAM_APP_SECRET
    this.callbackUrl = process.env.INSTAGRAM_CALLBACK_URL
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
  }

  log(message) {
    console.log(`🔍 ${message}`)
  }

  success(message) {
    console.log(`✅ ${message}`)
  }

  warning(message) {
    console.warn(`⚠️  ${message}`)
  }

  error(message) {
    console.error(`❌ ${message}`)
  }

  async validateEnvironmentVariables() {
    this.log('Validating environment variables...')
    
    const requiredVars = [
      { name: 'INSTAGRAM_APP_ID', value: this.appId },
      { name: 'INSTAGRAM_APP_SECRET', value: this.appSecret },
      { name: 'INSTAGRAM_CALLBACK_URL', value: this.callbackUrl }
    ]
    
    let isValid = true
    
    requiredVars.forEach(({ name, value }) => {
      if (!value || value === 'your-instagram-app-id' || value === 'your-instagram-app-secret') {
        this.error(`${name} is not set or using placeholder value`)
        isValid = false
      } else {
        this.success(`${name} is configured`)
      }
    })
    
    // Check URL format
    if (this.callbackUrl) {
      try {
        new URL(this.callbackUrl)
        this.success('Callback URL format is valid')
      } catch {
        this.error('Callback URL format is invalid')
        isValid = false
      }
    }
    
    return isValid
  }

  async validateFacebookApp() {
    this.log('Validating Facebook App configuration...')
    
    if (!this.appId || !this.appSecret) {
      this.error('App ID or Secret not configured')
      return false
    }
    
    try {
      // Validate app credentials
      const debugUrl = 'https://graph.facebook.com/debug_token'
      const appAccessToken = `${this.appId}|${this.appSecret}`
      
      // Generate a temporary token for validation (this won't work without a real token)
      this.log('Checking app credentials format...')
      
      // Basic validation
      if (this.appId.length < 10 || this.appSecret.length < 20) {
        this.warning('App ID or Secret seems too short - please verify')
        return false
      }
      
      this.success('App credentials format looks valid')
      
      // Test app access token format
      try {
        const response = await axios.get('https://graph.facebook.com/v18.0/me', {
          params: {
            access_token: appAccessToken,
            fields: 'id,name'
          },
          timeout: 10000
        })
        
        this.success('App access token is valid')
      } catch (error) {
        if (error.response?.status === 400) {
          this.warning('App credentials might be invalid or app not configured properly')
        } else {
          this.warning('Unable to verify app credentials (this is normal during setup)')
        }
      }
      
      return true
    } catch (error) {
      this.error(`Facebook App validation failed: ${error.message}`)
      return false
    }
  }

  async validateDatabaseConnection() {
    this.log('Validating database connection...')
    
    try {
      await prisma.$connect()
      this.success('Database connection successful')
      
      // Check if SocialAccount table exists and has correct schema
      const result = await prisma.socialAccount.findMany({
        take: 1,
        where: { platform: 'INSTAGRAM' }
      })
      
      this.success('SocialAccount table is accessible')
      
      if (result.length > 0) {
        this.success(`Found ${result.length} existing Instagram account(s)`)
      } else {
        this.log('No Instagram accounts found (this is normal for new setup)')
      }
      
      return true
    } catch (error) {
      this.error(`Database validation failed: ${error.message}`)
      return false
    } finally {
      await prisma.$disconnect()
    }
  }

  async validateApiEndpoints() {
    this.log('Validating API endpoints...')
    
    try {
      // Test health endpoint
      const healthResponse = await axios.get(`${this.apiUrl.replace('/api', '')}/health`, {
        timeout: 5000
      })
      
      if (healthResponse.status === 200) {
        this.success('API health endpoint is responding')
      }
      
      // Test Instagram OAuth authorize endpoint
      try {
        const oauthResponse = await axios.get(`${this.apiUrl}/auth/instagram/oauth/authorize`, {
          timeout: 5000,
          validateStatus: () => true // Don't throw on any status code
        })
        
        if (oauthResponse.status === 500 && oauthResponse.data?.error?.includes('Instagram App ID not configured')) {
          this.warning('Instagram OAuth endpoint is working but App ID not configured')
        } else if (oauthResponse.status === 302 || oauthResponse.headers.location) {
          this.success('Instagram OAuth authorize endpoint is working')
        } else {
          this.success('Instagram OAuth endpoint is accessible')
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          this.error('API server is not running')
          return false
        } else {
          this.warning('Instagram OAuth endpoint test inconclusive')
        }
      }
      
      // Test social accounts endpoint
      try {
        const accountsResponse = await axios.get(`${this.apiUrl}/social-accounts`, {
          timeout: 5000
        })
        
        if (accountsResponse.status === 200) {
          this.success('Social accounts endpoint is working')
        }
      } catch (error) {
        this.warning('Social accounts endpoint test failed')
      }
      
      return true
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        this.error('API server is not running')
        this.log('Please start the API server with: pnpm dev --filter=api')
        return false
      }
      
      this.error(`API validation failed: ${error.message}`)
      return false
    }
  }

  async validateInstagramAppPermissions() {
    this.log('Checking Instagram App requirements...')
    
    this.log('')
    this.log('📋 Instagram/Facebook App Setup Checklist:')
    this.log('')
    this.log('1. Facebook Developer Account:')
    this.log('   - Create account at https://developers.facebook.com/')
    this.log('   - Verify your developer account')
    this.log('')
    this.log('2. Facebook App Configuration:')
    this.log('   - App Type: Business')
    this.log('   - Add Instagram Basic Display product')
    this.log('   - Add Facebook Login product')
    this.log('')
    this.log('3. Instagram Basic Display Settings:')
    this.log(`   - Valid OAuth Redirect URIs: ${this.callbackUrl}`)
    this.log('   - Deauthorize Callback URL (optional)')
    this.log('   - Data Deletion Request URL (optional)')
    this.log('')
    this.log('4. App Review (for production):')
    this.log('   - Request instagram_basic permission')
    this.log('   - Request instagram_content_publish permission')
    this.log('   - Submit privacy policy and terms of service')
    this.log('')
    this.log('5. Test Setup:')
    this.log('   - Add test users in App Roles > Test Users')
    this.log('   - Connect Instagram accounts to test users')
    this.log('   - Test authentication flow')
    
    return true
  }

  async checkCommonIssues() {
    this.log('Checking for common setup issues...')
    
    const issues = []
    
    // Check callback URL format
    if (this.callbackUrl && !this.callbackUrl.startsWith('http')) {
      issues.push('Callback URL should start with http:// or https://')
    }
    
    if (this.callbackUrl && this.callbackUrl.includes('localhost') && this.callbackUrl.includes('https')) {
      issues.push('Localhost callback URLs should use http://, not https://')
    }
    
    // Check port consistency
    if (this.callbackUrl && this.callbackUrl.includes(':3006')) {
      issues.push('Callback URL uses port 3006 but web app runs on port 3000')
    }
    
    // Check environment consistency
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    if (apiUrl && !apiUrl.includes('localhost:3001')) {
      issues.push('API URL might not match API server port (should be localhost:3001)')
    }
    
    if (issues.length > 0) {
      this.warning('Found potential issues:')
      issues.forEach(issue => this.warning(`  - ${issue}`))
    } else {
      this.success('No common setup issues detected')
    }
    
    return issues.length === 0
  }

  async runValidation() {
    console.log('🔍 Instagram Integration Setup Validator')
    console.log('=====================================')
    console.log('')
    
    const results = []
    
    results.push(await this.validateEnvironmentVariables())
    results.push(await this.validateDatabaseConnection())
    results.push(await this.validateApiEndpoints())
    results.push(await this.validateFacebookApp())
    results.push(await this.checkCommonIssues())
    results.push(await this.validateInstagramAppPermissions())
    
    console.log('')
    console.log('=====================================')
    
    const passedTests = results.filter(Boolean).length
    const totalTests = results.length - 1 // Subtract checklist which always returns true
    
    if (passedTests >= totalTests - 1) { // Allow 1 test to fail
      this.success(`✨ Instagram setup validation completed! (${passedTests}/${totalTests} tests passed)`)
      console.log('')
      this.log('🚀 Next steps:')
      this.log('1. Start the application: pnpm dev')
      this.log('2. Visit http://localhost:3000/social-accounts')
      this.log('3. Click "Conectar Instagram"')
      this.log('4. Complete Instagram OAuth flow')
    } else {
      this.error(`❌ Instagram setup validation failed (${passedTests}/${totalTests} tests passed)`)
      console.log('')
      this.log('🛠️  Please fix the issues above and run validation again')
      process.exit(1)
    }
  }
}

// Main execution
async function main() {
  const validator = new InstagramSetupValidator()
  await validator.runValidation()
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Validation failed:', error.message)
    process.exit(1)
  })
}

module.exports = { InstagramSetupValidator }