#!/usr/bin/env tsx
/**
 * Script para salvar token do Instagram manualmente no banco de dados
 * 
 * Uso:
 * 1. Adicione o token no script
 * 2. Execute: pnpm tsx scripts/save-instagram-token.ts
 */

import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import path from 'path'

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const prisma = new PrismaClient()

// ====================================
// CONFIGURAÇÃO DO TOKEN - EDITE AQUI
// ====================================
const INSTAGRAM_CONFIG = {
  // Token de acesso do Instagram (substitua pelo token real)
  accessToken: 'YOUR_ACCESS_TOKEN_HERE',
  
  // ID da conta Instagram Business
  accountId: '17841400596343311',
  
  // Nome de usuário do Instagram (substitua pelo real)
  username: 'achadinhos_gabi',
  
  // ID do usuário Facebook
  userId: '1273321541257687',
  
  // ID do App Facebook
  appId: '739260659001663',
  
  // Permissões disponíveis
  permissions: [
    'publish_video',
    'catalog_management',
    'pages_show_list',
    'instagram_basic',
    'instagram_manage_comments',
    'instagram_manage_insights',
    'instagram_content_publish',
    'instagram_manage_messages',
    'pages_read_engagement',
    'instagram_branded_content_brand',
    'instagram_branded_content_creator',
    'instagram_branded_content_ads_brand',
    'instagram_manage_upcoming_events',
    'public_profile'
  ]
}

async function saveInstagramToken() {
  try {
    console.log('🚀 Iniciando salvamento do token Instagram...')
    
    // Verificar se o token foi configurado
    if (INSTAGRAM_CONFIG.accessToken === 'YOUR_ACCESS_TOKEN_HERE') {
      console.error('❌ Por favor, adicione o token de acesso no script!')
      console.log('   Edite a variável INSTAGRAM_CONFIG.accessToken')
      process.exit(1)
    }
    
    // Verificar se já existe uma conta com este ID
    const existingAccount = await prisma.socialAccount.findUnique({
      where: {
        platform_accountId: {
          platform: 'INSTAGRAM',
          accountId: INSTAGRAM_CONFIG.accountId
        }
      }
    })
    
    if (existingAccount) {
      console.log('📝 Conta existente encontrada, atualizando...')
      
      // Atualizar conta existente
      const updated = await prisma.socialAccount.update({
        where: {
          id: existingAccount.id
        },
        data: {
          username: INSTAGRAM_CONFIG.username,
          accessToken: INSTAGRAM_CONFIG.accessToken,
          settings: {
            instagramAccountId: INSTAGRAM_CONFIG.accountId,
            userId: INSTAGRAM_CONFIG.userId,
            appId: INSTAGRAM_CONFIG.appId,
            permissions: INSTAGRAM_CONFIG.permissions,
            tokenSavedAt: new Date().toISOString(),
            tokenType: 'manual'
          },
          isActive: true,
          updatedAt: new Date()
        }
      })
      
      console.log('✅ Conta atualizada com sucesso!')
      console.log('   ID:', updated.id)
      console.log('   Username:', updated.username)
      console.log('   Account ID:', updated.accountId)
      console.log('   Status:', updated.isActive ? 'Ativa' : 'Inativa')
    } else {
      console.log('🆕 Criando nova conta Instagram...')
      
      // Criar nova conta
      const created = await prisma.socialAccount.create({
        data: {
          platform: 'INSTAGRAM',
          accountId: INSTAGRAM_CONFIG.accountId,
          username: INSTAGRAM_CONFIG.username,
          accessToken: INSTAGRAM_CONFIG.accessToken,
          settings: {
            instagramAccountId: INSTAGRAM_CONFIG.accountId,
            userId: INSTAGRAM_CONFIG.userId,
            appId: INSTAGRAM_CONFIG.appId,
            permissions: INSTAGRAM_CONFIG.permissions,
            tokenSavedAt: new Date().toISOString(),
            tokenType: 'manual'
          },
          isActive: true
        }
      })
      
      console.log('✅ Conta criada com sucesso!')
      console.log('   ID:', created.id)
      console.log('   Username:', created.username)
      console.log('   Account ID:', created.accountId)
      console.log('   Status:', created.isActive ? 'Ativa' : 'Inativa')
    }
    
    // Verificar se foi salvo corretamente
    const verification = await prisma.socialAccount.findUnique({
      where: {
        platform_accountId: {
          platform: 'INSTAGRAM',
          accountId: INSTAGRAM_CONFIG.accountId
        }
      }
    })
    
    if (verification && verification.accessToken) {
      console.log('\n🎉 Token salvo e verificado com sucesso!')
      console.log('   Você pode agora usar a integração Instagram')
      console.log('   Acesse: http://localhost:3006/social-accounts')
    } else {
      console.error('❌ Erro na verificação do token salvo')
    }
    
  } catch (error) {
    console.error('❌ Erro ao salvar token:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar script
saveInstagramToken()
  .then(() => {
    console.log('\n✨ Script finalizado com sucesso!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error)
    process.exit(1)
  })