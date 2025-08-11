import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import dotenv from 'dotenv'
import path from 'path'
import { prisma } from '@repo/database'
import { whatsappService } from './services/whatsapp-service'
import { messageWorker } from './workers/message-worker'

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

console.log('🔧 Environment loaded from:', path.resolve(__dirname, '../../../.env'))
console.log('📊 DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 30))

const fastify = Fastify({
  logger: true
})

async function bootstrap() {
  await fastify.register(helmet)
  
  await fastify.register(cors, {
    origin: true, // Allow all origins for testing
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
  })

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
  })

  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'your-secret-key'
  })

  // Initialize WhatsApp service
  whatsappService.setFastify(fastify)
  
  // Initialize WhatsApp sessions in background (non-blocking)
  setTimeout(async () => {
    try {
      console.log('🔄 Initializing WhatsApp service in background...')
      await whatsappService.initialize()
      console.log('✅ WhatsApp service initialized')
      
      // Start message worker after WhatsApp is initialized
      setTimeout(() => {
        messageWorker.start()
        console.log('✅ Message worker started')
      }, 2000)
      
    } catch (error) {
      console.error('❌ Failed to initialize WhatsApp service:', error)
    }
  }, 5000)

  // Register health routes (includes /health endpoint)
  await fastify.register(import('./routes/health'))

  // Debug endpoint
  fastify.get('/debug', async () => {
    const debug = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT_SET',
        DATABASE_URL: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 50) + '...' : 'NOT_SET',
        CORS_ORIGIN: process.env.CORS_ORIGIN || 'DEFAULT'
      }
    }

    try {
      // Test database connection
      const userCount = await prisma.user.count()
      debug.database = { status: 'connected', userCount }
    } catch (error) {
      debug.database = { status: 'error', error: error.message }
    }

    try {
      // Test bcrypt
      const bcrypt = require('bcrypt')
      const testHash = await bcrypt.hash('test', 10)
      debug.bcrypt = { status: 'working', version: 'available' }
    } catch (error) {
      debug.bcrypt = { status: 'error', error: error.message }
    }

    try {
      // Message worker stats
      debug.messageWorker = await messageWorker.getStats()
    } catch (error) {
      debug.messageWorker = { status: 'error', error: error.message }
    }

    return debug
  })

  await fastify.register(import('./routes/auth'), { prefix: '/api/auth' })
  await fastify.register(import('./routes/users'), { prefix: '/api/users' })
  await fastify.register(import('./routes/products'), { prefix: '/api/products' })
  await fastify.register(import('./routes/templates'), { prefix: '/api/templates' })
  await fastify.register(import('./routes/messages'), { prefix: '/api/messages' })
  await fastify.register(import('./routes/scrapers'), { prefix: '/api/scrapers' })
  await fastify.register(import('./routes/contacts'), { prefix: '/api/contacts' })
  await fastify.register(import('./routes/groups'), { prefix: '/api/groups' })
  await fastify.register(import('./routes/settings'), { prefix: '/api/settings' })
  await fastify.register(import('./routes/analytics'), { prefix: '/api/analytics' })
  await fastify.register(import('./routes/whatsapp'), { prefix: '/api/whatsapp' })
  await fastify.register(import('./routes/affiliate-config'), { prefix: '/api' })
  await fastify.register(import('./routes/social-templates'), { prefix: '/api/social-templates' })
  await fastify.register(import('./routes/content-generation'), { prefix: '/api/content' })
  await fastify.register(import('./routes/social-accounts'), { prefix: '/api/social-accounts' })
  await fastify.register(import('./routes/auth-instagram-oauth'), { prefix: '/api/auth/instagram/oauth' })
  await fastify.register(import('./routes/auth-instagram'), { prefix: '/api/auth/instagram' })
  await fastify.register(import('./routes/auth-instagram-manual'), { prefix: '/api/auth/instagram-manual' })
  await fastify.register(import('./routes/auth-instagram-manual-token'), { prefix: '/api/auth/instagram/manual' })
  await fastify.register(import('./routes/instagram-publisher'), { prefix: '/api/instagram' })
  await fastify.register(import('./routes/scrapers-status'), { prefix: '/api/scrapers' })
  await fastify.register(import('./routes/test-auth'), { prefix: '/api' })

  const port = parseInt(process.env.PORT || '3001')
  const host = process.env.HOST || '0.0.0.0'

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    console.log('🛑 Shutting down server...')
    messageWorker.stop()
    await whatsappService.shutdown()
    await prisma.$disconnect()
  })

  try {
    await fastify.listen({ port, host })
    console.log(`Server running at http://${host}:${port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...')
  await fastify.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...')
  await fastify.close()
  process.exit(0)
})

bootstrap()