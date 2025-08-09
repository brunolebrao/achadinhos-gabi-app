#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function setupScrapers() {
  console.log('🚀 Configurando scrapers automáticos...\n')

  try {
    // Buscar um usuário admin ou criar um usuário do sistema
    let user = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })

    if (!user) {
      // Criar usuário do sistema se não existir
      user = await prisma.user.upsert({
        where: { email: 'system@achadinhos.com' },
        update: {},
        create: {
          email: 'system@achadinhos.com',
          password: '$2b$10$YourHashedPasswordHere', // Senha criptografada
          name: 'Sistema Achadinhos',
          role: 'ADMIN'
        }
      })
      console.log('✅ Usuário do sistema criado:', user.email)
    }

    // Configurar affiliate config se não existir
    await prisma.affiliateConfig.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        mercadolivreId: process.env.MERCADOLIVRE_AFFILIATE_ID || 'ML-DEFAULT',
        shopeeId: process.env.SHOPEE_AFFILIATE_ID || 'SHOPEE-DEFAULT',
        amazonTag: process.env.AMAZON_AFFILIATE_TAG || 'AMAZON-DEFAULT',
        aliexpressId: process.env.ALIEXPRESS_AFFILIATE_ID || 'ALI-DEFAULT',
        enableTracking: true
      }
    })

    // Scrapers configurados para diferentes categorias
    const scraperConfigs = [
      {
        platform: 'MERCADOLIVRE' as const,
        name: 'Eletrônicos e Tecnologia',
        keywords: [
          'iphone', 'samsung galaxy', 'xiaomi', 'notebook', 'macbook',
          'smart tv', 'fone bluetooth', 'smartwatch', 'tablet', 'kindle',
          'playstation', 'xbox', 'nintendo switch', 'camera', 'gopro'
        ],
        categories: ['eletronicos', 'informatica', 'celulares-telefones', 'games'],
        minDiscount: 30,
        maxProducts: 50,
        minPrice: 50,
        maxPrice: 10000,
        frequency: '*/15 * * * *' // A cada 15 minutos
      },
      {
        platform: 'MERCADOLIVRE' as const,
        name: 'Casa e Decoração',
        keywords: [
          'air fryer', 'cafeteira', 'aspirador', 'ventilador', 'ar condicionado',
          'geladeira', 'micro-ondas', 'fogão', 'liquidificador', 'batedeira',
          'panela elétrica', 'robô aspirador', 'purificador'
        ],
        categories: ['casa-moveis-decoracao', 'eletrodomesticos'],
        minDiscount: 25,
        maxProducts: 40,
        minPrice: 50,
        maxPrice: 5000,
        frequency: '*/30 * * * *' // A cada 30 minutos
      },
      {
        platform: 'MERCADOLIVRE' as const,
        name: 'Moda e Beleza',
        keywords: [
          'perfume', 'maquiagem', 'tênis nike', 'tênis adidas', 'bolsa',
          'relógio', 'óculos de sol', 'secador de cabelo', 'kit skincare',
          'protetor solar', 'batom', 'base', 'creme facial'
        ],
        categories: ['beleza-cuidado-pessoal', 'calcados-roupas-bolsas'],
        minDiscount: 30,
        maxProducts: 40,
        minPrice: 30,
        maxPrice: 2000,
        frequency: '*/30 * * * *' // A cada 30 minutos
      },
      {
        platform: 'MERCADOLIVRE' as const,
        name: 'Esportes e Fitness',
        keywords: [
          'whey protein', 'creatina', 'bicicleta', 'esteira', 'halteres',
          'colchonete yoga', 'tênis corrida', 'smartband', 'suplemento',
          'bola futebol', 'raquete', 'skate', 'patins'
        ],
        categories: ['esportes-fitness'],
        minDiscount: 25,
        maxProducts: 30,
        minPrice: 30,
        maxPrice: 3000,
        frequency: '0 */2 * * *' // A cada 2 horas
      },
      {
        platform: 'MERCADOLIVRE' as const,
        name: 'Brinquedos e Hobbies',
        keywords: [
          'lego', 'boneca', 'hot wheels', 'nerf', 'quebra cabeça',
          'funko pop', 'action figure', 'jogos tabuleiro', 'pelúcia',
          'barbie', 'playmobil', 'brinquedo educativo'
        ],
        categories: ['brinquedos-hobbies'],
        minDiscount: 30,
        maxProducts: 30,
        minPrice: 20,
        maxPrice: 1000,
        frequency: '0 */3 * * *' // A cada 3 horas
      }
    ]

    // Criar ou atualizar scrapers
    for (const config of scraperConfigs) {
      const scraper = await prisma.scraperConfig.upsert({
        where: {
          platform_name: {
            platform: config.platform,
            name: config.name
          }
        },
        update: {
          keywords: config.keywords,
          categories: config.categories,
          minDiscount: config.minDiscount,
          maxProducts: config.maxProducts,
          minPrice: config.minPrice,
          maxPrice: config.maxPrice,
          frequency: config.frequency,
          isActive: true,
          userId: user.id
        },
        create: {
          ...config,
          isActive: true,
          userId: user.id,
          config: {
            maxPages: 3,
            rateLimit: 2000,
            retryAttempts: 3
          }
        }
      })

      console.log(`✅ Scraper configurado: ${scraper.name}`)
      console.log(`   - ${config.keywords.length} palavras-chave`)
      console.log(`   - ${config.categories.length} categorias`)
      console.log(`   - Desconto mínimo: ${config.minDiscount}%`)
      console.log(`   - Frequência: ${config.frequency}`)
      console.log()
    }

    // Verificar scrapers ativos
    const activeScrapers = await prisma.scraperConfig.count({
      where: { isActive: true }
    })

    console.log(`\n📊 Total de scrapers ativos: ${activeScrapers}`)
    
    // Agendar primeira execução para daqui 1 minuto
    const nextRun = new Date(Date.now() + 60000)
    await prisma.scraperConfig.updateMany({
      where: { isActive: true },
      data: { nextRun }
    })
    
    console.log(`⏰ Primeira execução agendada para: ${nextRun.toLocaleTimeString()}`)

  } catch (error) {
    console.error('❌ Erro ao configurar scrapers:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar o script
setupScrapers()
  .then(() => {
    console.log('\n✨ Scrapers configurados com sucesso!')
    console.log('📝 Execute "pnpm dev --filter=scraper" para iniciar o serviço')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })