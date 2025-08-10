#!/usr/bin/env node

const axios = require('axios')

class InstagramTokenSetup {
  constructor() {
    // Load environment variables
    require('dotenv').config({ path: require('path').join(process.cwd(), '.env') })
    
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
    this.longLivedToken = null
  }

  log(message) {
    console.log(`🔧 ${message}`)
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

  askUser(question) {
    return new Promise((resolve) => {
      const { stdin, stdout } = process
      stdout.write(question)
      
      stdin.resume()
      stdin.setEncoding('utf8')
      
      stdin.once('data', (data) => {
        stdin.pause()
        resolve(data.toString().trim())
      })
    })
  }

  async setupToken() {
    console.log('📱 Instagram Token Setup Wizard')
    console.log('===============================')
    console.log('')
    
    this.log('Este script irá configurar o token de longa duração do Instagram')
    console.log('')
    
    // Show token from image
    console.log('🔑 Token de Longa Duração da Imagem Meta Developer Console:')
    console.log('─────────────────────────────────────────────────────────────')
    console.log('EAARyTPBZCEsPNdkHAsaQvO6JwCdr4mBvJ2wTt1QrYVzVRy6NnlMFolsGRrZPILBQAbUpHxFNdOlwsMrEAQfqPJIThtqPowpjhqaJomPYVcQKgrFU4FwJnJEhMiGnCJn')
    console.log('')
    
    const useImageToken = await this.askUser('Deseja usar o token da imagem? (s/n): ')
    
    let accessToken
    if (useImageToken.toLowerCase() === 's' || useImageToken.toLowerCase() === 'sim') {
      accessToken = 'EAARyTPBZCEsPNdkHAsaQvO6JwCdr4mBvJ2wTt1QrYVzVRy6NnlMFolsGRrZPILBQAbUpHxFNdOlwsMrEAQfqPJIThtqPowpjhqaJomPYVcQKgrFU4FwJnJEhMiGnCJn'
      this.success('Usando token da imagem Meta Developer Console')
    } else {
      accessToken = await this.askUser('Cole seu token de longa duração: ')
      
      if (!accessToken || accessToken.length < 50) {
        this.error('Token inválido ou muito curto')
        process.exit(1)
      }
    }
    
    console.log('')
    this.log('Configurando conta Instagram com o token...')
    
    try {
      // Call the manual token setup endpoint
      const response = await axios.post(`${this.apiUrl}/auth/instagram/manual/setup-token`, {
        accessToken,
        // Let the API auto-detect the page and Instagram account
      })
      
      const result = response.data
      
      if (result.success) {
        console.log('')
        this.success('🎉 Instagram configurado com sucesso!')
        console.log('')
        
        console.log('📊 Informações da Conta:')
        console.log(`   Username: @${result.instagram.username}`)
        console.log(`   Nome: ${result.instagram.name}`)
        console.log(`   Seguidores: ${result.instagram.followersCount?.toLocaleString('pt-BR') || 'N/A'}`)
        console.log(`   Posts: ${result.instagram.mediaCount || 'N/A'}`)
        console.log('')
        
        console.log('📄 Página do Facebook:')
        console.log(`   Nome: ${result.instagram.pageName}`)
        console.log(`   ID: ${result.instagram.pageId}`)
        console.log('')
        
        console.log('🔑 Token Info:')
        console.log(`   Tipo: ${result.token.isLongLived ? 'Longa Duração' : 'Curta Duração'}`)
        if (result.token.expiresAt) {
          const expiresAt = new Date(result.token.expiresAt)
          console.log(`   Expira em: ${expiresAt.toLocaleDateString('pt-BR')} às ${expiresAt.toLocaleTimeString('pt-BR')}`)
          console.log(`   Dias restantes: ${result.token.daysUntilExpiry} dias`)
        }
        console.log('')
        
        this.success('Instagram está pronto para usar!')
        console.log('')
        console.log('🚀 Próximos passos:')
        console.log('1. Acesse http://localhost:3000/social-accounts')
        console.log('2. Verifique se a conta aparece como conectada')
        console.log('3. Teste publicar um post ou story')
        
      } else {
        throw new Error(result.message || 'Setup failed')
      }
      
    } catch (error) {
      console.log('')
      this.error('Falha na configuração do Instagram')
      
      if (error.response) {
        const errorData = error.response.data
        this.error(`Erro da API: ${errorData.message || error.message}`)
        
        if (errorData.details) {
          console.log(`Detalhes: ${errorData.details}`)
        }
        
        if (errorData.type === 'OAuthException') {
          console.log('')
          this.warning('Possíveis soluções:')
          console.log('1. Verifique se o token está correto e não expirou')
          console.log('2. Confirme se o App ID está correto no .env')
          console.log('3. Verifique se as permissões estão aprovadas no Meta Developer Console')
        }
        
      } else {
        this.error(error.message)
        
        if (error.code === 'ECONNREFUSED') {
          console.log('')
          this.warning('API server não está rodando')
          this.log('Inicie a API com: pnpm dev --filter=api')
        }
      }
      
      process.exit(1)
    }
  }

  async checkCurrentStatus() {
    try {
      this.log('Verificando contas Instagram existentes...')
      
      const response = await axios.get(`${this.apiUrl}/social-accounts/platform/INSTAGRAM`)
      const accounts = response.data.data || []
      
      if (accounts.length === 0) {
        this.log('Nenhuma conta Instagram encontrada')
        return false
      }
      
      console.log('')
      this.success(`Encontradas ${accounts.length} conta(s) Instagram:`)
      
      accounts.forEach((account, index) => {
        console.log(`${index + 1}. @${account.username} (${account.isActive ? 'Ativa' : 'Inativa'})`)
        
        if (account.settings) {
          const settings = account.settings
          if (settings.followersCount) {
            console.log(`   Seguidores: ${settings.followersCount.toLocaleString('pt-BR')}`)
          }
          if (settings.tokenExpiresAt) {
            const expiresAt = new Date(settings.tokenExpiresAt)
            const daysUntil = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            console.log(`   Token expira em: ${daysUntil} dias`)
          }
        }
      })
      
      return true
      
    } catch (error) {
      this.warning('Não foi possível verificar contas existentes')
      return false
    }
  }

  async run() {
    try {
      console.log('')
      
      // Check current status first
      const hasAccounts = await this.checkCurrentStatus()
      
      if (hasAccounts) {
        console.log('')
        const shouldContinue = await this.askUser('Deseja configurar uma nova conta ou reconfigurar? (s/n): ')
        
        if (shouldContinue.toLowerCase() !== 's' && shouldContinue.toLowerCase() !== 'sim') {
          this.log('Configuração cancelada')
          process.exit(0)
        }
      }
      
      await this.setupToken()
      
    } catch (error) {
      this.error(`Erro inesperado: ${error.message}`)
      process.exit(1)
    }
  }
}

// Main execution
if (require.main === module) {
  const setup = new InstagramTokenSetup()
  setup.run()
}