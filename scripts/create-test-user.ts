#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function createTestUser() {
  console.log('🔧 Creating test user...\n')

  try {
    // Create test user
    const hashedPassword = await bcrypt.hash('test123', 10)
    
    const user = await prisma.user.upsert({
      where: {
        email: 'test@example.com'
      },
      update: {
        password: hashedPassword,
        isActive: true
      },
      create: {
        email: 'test@example.com',
        name: 'Test User',
        password: hashedPassword,
        role: 'USER',
        isActive: true
      }
    })

    // Also create the demo user that the login page expects
    const demoPassword = await bcrypt.hash('demo123', 10)
    await prisma.user.upsert({
      where: {
        email: 'demo@achadinhos.com'
      },
      update: {
        password: demoPassword,
        isActive: true
      },
      create: {
        email: 'demo@achadinhos.com',
        name: 'Demo User',
        password: demoPassword,
        role: 'USER',
        isActive: true
      }
    })

    console.log('✅ User created/updated:')
    console.log('   Email: test@example.com')
    console.log('   Password: test123')
    console.log('   ID:', user.id)
    
    console.log('✅ Demo user created/updated:')
    console.log('   Email: demo@achadinhos.com')
    console.log('   Password: demo123')

    // Create affiliate config for the user
    const affiliateConfig = await prisma.affiliateConfig.upsert({
      where: {
        userId: user.id
      },
      update: {},
      create: {
        userId: user.id,
        mercadolivreId: null,
        amazonTag: null,
        shopeeId: null,
        aliexpressId: null,
        enableTracking: true,
        customUtmSource: 'whatsapp',
        customUtmMedium: 'affiliate'
      }
    })

    console.log('\n✅ Affiliate config created for user')
    console.log('   Ready to configure affiliate IDs\n')

    // Create admin user too
    const adminPassword = await bcrypt.hash('admin123', 10)
    const admin = await prisma.user.upsert({
      where: {
        email: 'admin@example.com'
      },
      update: {
        password: adminPassword,
        isActive: true
      },
      create: {
        email: 'admin@example.com',
        name: 'Admin User',
        password: adminPassword,
        role: 'ADMIN',
        isActive: true
      }
    })

    console.log('✅ Admin user created/updated:')
    console.log('   Email: admin@example.com')
    console.log('   Password: admin123')
    console.log('   Role: ADMIN')

  } catch (error) {
    console.error('❌ Failed to create test user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
createTestUser()
  .then(() => {
    console.log('\n✨ Test users ready!')
    console.log('\n📝 Login with:')
    console.log('   Regular user: test@example.com / test123')
    console.log('   Admin user: admin@example.com / admin123')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })