import { prisma } from '@repo/database'
import bcrypt from 'bcrypt'

async function main() {
  console.log('🌱 Starting database seeding...')

  // Seed Demo User
  const hashedPassword = await bcrypt.hash('demo123', 10)
  
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@achadinhos.com' },
    update: {},
    create: {
      email: 'demo@achadinhos.com',
      name: 'Demo User',
      password: hashedPassword,
      role: 'ADMIN'
    }
  })

  console.log('✅ Demo user created:', demoUser.email)

  // Seed Demo Templates
  const templates = [
    {
      name: 'Promoção Flash',
      content: '🔥 *OFERTA RELÂMPAGO* 🔥\n\n{{product_name}}\n💰 De ~~R$ {{original_price}}~~ por *R$ {{price}}*\n⚡ {{discount}}% OFF - Só hoje!\n\n{{product_link}}\n\n⏰ Corre que é por tempo limitado!',
      category: 'promocao',
      isDefault: true,
      variables: {
        product_name: 'Nome do produto',
        original_price: 'Preço original',
        price: 'Preço com desconto',
        discount: 'Porcentagem de desconto',
        product_link: 'Link do produto'
      }
    },
    {
      name: 'Produto Novo',
      content: '✨ *NOVIDADE CHEGANDO!* ✨\n\n{{product_name}}\n🏷️ Categoria: {{category}}\n💰 Preço: *R$ {{price}}*\n⭐ Avaliação: {{rating}} ({{reviews}} avaliações)\n\n{{product_link}}\n\n📱 Compre agora e aproveite!',
      category: 'produto',
      variables: {
        product_name: 'Nome do produto',
        category: 'Categoria',
        price: 'Preço',
        rating: 'Avaliação',
        reviews: 'Número de avaliações',
        product_link: 'Link do produto'
      }
    }
  ]

  for (const template of templates) {
    const createdTemplate = await prisma.template.upsert({
      where: { name: template.name },
      update: {},
      create: template
    })
    console.log('✅ Template created:', createdTemplate.name)
  }

  // Seed Demo Products
  const products = [
    {
      title: 'iPhone 15 Pro Max 256GB Titânio Natural',
      price: 8999.99,
      originalPrice: 10499.99,
      discount: '14%',
      imageUrl: 'https://via.placeholder.com/300x300?text=iPhone+15+Pro',
      productUrl: 'https://www.mercadolivre.com.br/iphone-15-pro-max',
      affiliateUrl: 'https://www.mercadolivre.com.br/iphone-15-pro-max?affiliate=demo',
      platform: 'MERCADOLIVRE',
      category: 'Eletrônicos',
      status: 'APPROVED',
      ratings: 4.8,
      reviewCount: 1247,
      salesCount: 89
    },
    {
      title: 'Smart TV Samsung 55" 4K Crystal UHD',
      price: 2399.99,
      originalPrice: 2899.99,
      discount: '17%',
      imageUrl: 'https://via.placeholder.com/300x300?text=Samsung+TV',
      productUrl: 'https://shopee.com.br/samsung-tv-55',
      platform: 'SHOPEE',
      category: 'TV e Home Theater',
      status: 'PENDING',
      ratings: 4.6,
      reviewCount: 856,
      salesCount: 156
    },
    {
      title: 'Notebook Dell Inspiron 15 i5 8GB 512GB SSD',
      price: 3299.99,
      originalPrice: 3799.99,
      discount: '13%',
      imageUrl: 'https://via.placeholder.com/300x300?text=Dell+Notebook',
      productUrl: 'https://www.amazon.com.br/dell-inspiron-15',
      platform: 'AMAZON',
      category: 'Informática',
      status: 'SENT',
      ratings: 4.5,
      reviewCount: 432,
      salesCount: 67
    }
  ]

  for (const product of products) {
    const createdProduct = await prisma.product.upsert({
      where: { productUrl: product.productUrl },
      update: {},
      create: product
    })
    console.log('✅ Product created:', createdProduct.title)
  }

  // Seed Demo Scraper Configs
  const scraperConfigs = [
    {
      platform: 'MERCADOLIVRE',
      name: 'Eletrônicos - Smartphones',
      categories: ['Eletrônicos', 'Smartphones'],
      keywords: ['iphone', 'samsung', 'xiaomi', 'smartphone'],
      minPrice: 500,
      maxPrice: 15000,
      minDiscount: 10,
      frequency: '0 */6 * * *', // A cada 6 horas
      maxProducts: 50,
      config: {
        maxPages: 5,
        excludeUsed: true,
        minRating: 4.0
      }
    },
    {
      platform: 'SHOPEE',
      name: 'Casa e Jardim',
      categories: ['Casa e Jardim'],
      keywords: ['decoracao', 'moveis', 'cozinha'],
      minPrice: 50,
      maxPrice: 5000,
      minDiscount: 15,
      frequency: '0 8,20 * * *', // 8h e 20h
      maxProducts: 30,
      config: {
        maxPages: 3,
        excludeUsed: false,
        minRating: 4.2
      }
    }
  ]

  for (const config of scraperConfigs) {
    const createdConfig = await prisma.scraperConfig.upsert({
      where: { 
        platform_name: {
          platform: config.platform,
          name: config.name
        }
      },
      update: {},
      create: config
    })
    console.log('✅ Scraper config created:', createdConfig.name)
  }

  // Seed Settings
  const settings = [
    {
      key: 'system.name',
      value: 'Achadinhos da Gabi',
      description: 'Nome do sistema'
    },
    {
      key: 'system.version',
      value: '1.0.0',
      description: 'Versão do sistema'
    },
    {
      key: 'whatsapp.daily_limit',
      value: 300,
      description: 'Limite diário de mensagens por conta WhatsApp'
    },
    {
      key: 'scraper.delay_min',
      value: 2000,
      description: 'Delay mínimo entre requests (ms)'
    },
    {
      key: 'scraper.delay_max',
      value: 5000,
      description: 'Delay máximo entre requests (ms)'
    }
  ]

  for (const setting of settings) {
    const createdSetting = await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting
    })
    console.log('✅ Setting created:', createdSetting.key)
  }

  console.log('🎉 Database seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })