import { FastifyInstance } from 'fastify'
import { authenticate, authorize } from '../middleware/auth'

export default async function testAuthRoutes(fastify: FastifyInstance) {
  // Test endpoint without auth
  fastify.get('/test-no-auth', async (request, reply) => {
    return { message: 'Success - no auth required', timestamp: new Date().toISOString() }
  })

  // Test endpoint with auth
  fastify.get('/test-auth', { preHandler: [authenticate] }, async (request, reply) => {
    const user = (request as any).user
    return { 
      message: 'Success - authenticated', 
      user: user,
      timestamp: new Date().toISOString() 
    }
  })

  // Test endpoint with admin auth
  fastify.get('/test-admin', { preHandler: [authorize('ADMIN')] }, async (request, reply) => {
    const user = (request as any).user
    return { 
      message: 'Success - admin authenticated', 
      user: user,
      timestamp: new Date().toISOString() 
    }
  })

  // Test WhatsApp send without auth (for debugging)
  fastify.post('/test-whatsapp-send-no-auth', async (request, reply) => {
    const { sessionId, to, message } = request.body as any

    try {
      const response = await fetch(`http://localhost:3001/api/whatsapp/sessions/${sessionId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ to, message, type: 'text' })
      })

      const data = await response.json()
      
      return {
        status: response.status,
        success: response.ok,
        data: data,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return reply.code(500).send({
        error: 'Internal server error',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    }
  })
}