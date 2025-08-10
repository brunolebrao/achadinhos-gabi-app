#!/usr/bin/env node

const axios = require('axios')

async function getValidToken() {
  // Load environment variables
  require('dotenv').config({ path: require('path').join(process.cwd(), '.env') })
  
  const appId = process.env.INSTAGRAM_APP_ID
  const appSecret = process.env.INSTAGRAM_APP_SECRET
  
  console.log('🔍 Instagram Token Helper')
  console.log('========================')
  console.log('')
  
  console.log('📋 Para obter um token de longa duração:')
  console.log('')
  console.log('1. Acesse o Meta Developer Console:')
  console.log('   https://developers.facebook.com/tools/debug/')
  console.log('')
  console.log('2. Cole o token de curta duração no depurador')
  console.log('')
  console.log('3. Clique em "Estender token de acesso"')
  console.log('')
  console.log('4. Copie o novo token de longa duração')
  console.log('')
  console.log('5. Use o comando: pnpm setup:instagram')
  console.log('')
  
  // Show current app info
  console.log(`📱 App ID atual: ${appId}`)
  console.log(`🔐 App Secret: ${appSecret ? appSecret.substring(0, 10) + '...' : 'Não configurado'}`)
  console.log('')
  
  // Test app credentials
  if (appId && appSecret) {
    try {
      console.log('🧪 Testando credenciais do app...')
      
      const appAccessToken = `${appId}|${appSecret}`
      const response = await axios.get('https://graph.facebook.com/v18.0/me', {
        params: {
          access_token: appAccessToken
        },
        timeout: 10000
      })
      
      console.log('✅ App credentials are valid')
      console.log(`   App Name: ${response.data.name || 'N/A'}`)
      console.log(`   App ID: ${response.data.id || appId}`)
      
    } catch (error) {
      if (error.response) {
        console.log('⚠️  App credentials test failed:')
        console.log(`   ${error.response.data.error?.message || error.message}`)
        console.log('')
        console.log('💡 Isso pode ser normal para alguns tipos de app')
      } else {
        console.log('⚠️  Connection test failed:', error.message)
      }
    }
  } else {
    console.log('❌ App credentials not configured')
  }
  
  console.log('')
  console.log('🔗 Links úteis:')
  console.log('   Meta Developer Console: https://developers.facebook.com/')
  console.log('   Token Debugger: https://developers.facebook.com/tools/debug/')
  console.log('   Instagram Basic Display: https://developers.facebook.com/docs/instagram-basic-display-api/')
  console.log('')
}

if (require.main === module) {
  getValidToken().catch(console.error)
}

module.exports = { getValidToken }