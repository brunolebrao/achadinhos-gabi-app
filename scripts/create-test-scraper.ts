#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createTestScraper() {
  console.log('🔧 Creating test scraper with user association...\n')

  try {
    // Get test user
    const user = await prisma.user.findUnique({ 
      where: { email: 'test@example.com' } 
    })
    
    if (!user) {
      console.log('❌ Test user not found')
      return
    }
    
    console.log('✅ Found test user:', user.email, 'ID:', user.id)
    
    // Create scraper with userId
    const scraper = await prisma.scraperConfig.create({
      data: {
        platform: 'MERCADOLIVRE',
        name: 'Tech Gadgets - User Test',
        isActive: true,
        categories: ['eletrônicos', 'tecnologia'],
        keywords: ['smartphone', 'notebook'],
        minPrice: 100,
        maxPrice: 2000,
        minDiscount: 20,
        frequency: '0 */6 * * *', // Every 6 hours
        userId: user.id,
        config: {
          scraper: 'tech-gadgets',
          maxPages: 3,
          rateLimit: 2000
        }
      }
    })
    
    console.log('\n✅ Created test scraper:')
    console.log('   ID:', scraper.id)
    console.log('   Name:', scraper.name)
    console.log('   Platform:', scraper.platform)
    console.log('   UserId:', scraper.userId)
    console.log('   Categories:', scraper.categories)
    console.log('   Keywords:', scraper.keywords)
    
    // Check user's affiliate config
    const affiliateConfig = await prisma.affiliateConfig.findUnique({
      where: { userId: user.id }
    })
    
    if (affiliateConfig) {
      console.log('\n📊 User affiliate configuration:')
      console.log('   Mercado Livre ID:', affiliateConfig.mercadolivreId)
      console.log('   Amazon Tag:', affiliateConfig.amazonTag)
      console.log('   Tracking enabled:', affiliateConfig.enableTracking)
    } else {
      console.log('\n⚠️  User has no affiliate configuration')
    }
    
  } catch (error) {
    console.error('❌ Failed to create test scraper:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
createTestScraper()
  .then(() => {
    console.log('\n✨ Test scraper ready!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })