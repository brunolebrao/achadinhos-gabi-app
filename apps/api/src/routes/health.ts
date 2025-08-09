import { FastifyInstance } from 'fastify'
import { prisma } from '@repo/database'
import { whatsappService } from '../services/whatsapp-service'
import { healthTimeout } from '../middleware/timeout'

// Simple cache implementation
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = {
  SIMPLE_HEALTH: 1000,     // 1 second
  DETAILED_STATUS: 10000,  // 10 seconds
  SESSION_STATUS: 5000     // 5 seconds
}

function getCached(key: string, duration: number): any | null {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < duration) {
    return cached.data
  }
  return null
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() })
}

// Promise wrapper with timeout
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, defaultValue: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => 
      setTimeout(() => resolve(defaultValue), timeoutMs)
    )
  ])
}

export default async function healthRoutes(fastify: FastifyInstance) {
  // Simple health check - no database or external service checks
  fastify.get('/health', { preHandler: [healthTimeout] }, async (request, reply) => {
    reply.code(200).send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    })
  })

  // Detailed status with caching and timeouts
  fastify.get('/health/status', { preHandler: [healthTimeout] }, async (request, reply) => {
    // Check cache first
    const cached = getCached('health_status', CACHE_DURATION.DETAILED_STATUS)
    if (cached) {
      return cached
    }

    const status: any = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {}
    }

    // Database check with timeout
    status.services.database = await withTimeout(
      checkDatabase(),
      2000,
      { status: 'timeout', message: 'Database check timed out' }
    )

    // WhatsApp service check with timeout (lightweight)
    status.services.whatsapp = await withTimeout(
      checkWhatsAppService(),
      2000,
      { status: 'timeout', message: 'WhatsApp check timed out' }
    )

    // Overall status
    const allHealthy = Object.values(status.services).every(
      (service: any) => service.status === 'healthy'
    )
    status.status = allHealthy ? 'healthy' : 'degraded'

    // Cache the result
    setCache('health_status', status)

    return status
  })

  // WhatsApp session status with caching
  fastify.get('/health/sessions', { preHandler: [healthTimeout] }, async (request, reply) => {
    // Check cache first
    const cached = getCached('session_status', CACHE_DURATION.SESSION_STATUS)
    if (cached) {
      return cached
    }

    try {
      const sessionStatus = await withTimeout(
        getSessionStatus(),
        3000,
        {
          connected: 0,
          total: 0,
          hasConnectedSession: false,
          error: 'Session status check timed out'
        }
      )

      // Cache the result
      setCache('session_status', sessionStatus)

      return sessionStatus
    } catch (error) {
      return {
        connected: 0,
        total: 0,
        hasConnectedSession: false,
        error: 'Failed to check session status'
      }
    }
  })
}

async function checkDatabase() {
  try {
    const startTime = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const responseTime = Date.now() - startTime
    
    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function checkWhatsAppService() {
  try {
    // Quick check - just verify service is initialized
    const sessions = whatsappService.getAllSessions ? await whatsappService.getAllSessions() : []
    const connectedCount = sessions.filter(s => s.isConnected).length
    
    return {
      status: 'healthy',
      sessions: {
        total: sessions.length,
        connected: connectedCount
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function getSessionStatus() {
  try {
    const allSessions = await whatsappService.getAllSessions()
    const availableSessions = allSessions.filter(s => s.isConnected)

    return {
      connected: availableSessions.length,
      total: allSessions.length,
      hasConnectedSession: availableSessions.length > 0,
      sessions: availableSessions.map(s => ({
        id: s.id,
        name: s.name,
        phoneNumber: s.phoneNumber
      }))
    }
  } catch (error) {
    throw error
  }
}