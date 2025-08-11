import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@repo/database'
import { whatsappService } from '../services/whatsapp-service'
import { authenticate, authorize } from '../middleware/auth'

const messageSchema = z.object({
  to: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(['text', 'image', 'document']).default('text'),
  media: z.object({
    url: z.string().url(),
    caption: z.string().optional(),
    filename: z.string().optional()
  }).optional()
})

const createSessionSchema = z.object({
  name: z.string().min(1),
  phoneNumber: z.string().transform((val) => {
    // Remove espaços, hífens e parênteses
    const cleaned = val.replace(/[\s\-\(\)]/g, '')
    // Adiciona + se não tiver
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`
  }).refine((val) => /^\+[1-9]\d{1,14}$/.test(val), {
    message: "Número de telefone inválido. Use o formato: +5511999999999"
  })
})

// Cache for endpoints
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = {
  SESSIONS: 5000,  // 5 seconds
  STATUS: 10000    // 10 seconds
}

export default async function whatsappRoutes(fastify: FastifyInstance) {
  // Get all sessions (protected) with caching
  fastify.get('/sessions', { preHandler: [authenticate] }, async () => {
    // Check cache first
    const cached = cache.get('sessions')
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION.SESSIONS) {
      return cached.data
    }

    const sessions = await whatsappService.getAllSessions()
    const data = { sessions }
    
    // Cache the result
    cache.set('sessions', { data, timestamp: Date.now() })
    
    return data
  })

  // Get specific session (protected)
  fastify.get('/sessions/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const session = await whatsappService.getSession(id)

    if (!session) {
      return reply.code(404).send({ error: 'Session not found' })
    }

    return { session }
  })

  // Create new session (admin only)
  fastify.post('/sessions', { preHandler: [authorize('ADMIN')] }, async (request, reply) => {
    const { name, phoneNumber } = createSessionSchema.parse(request.body)
    
    try {
      const account = await whatsappService.createSession(phoneNumber, name)
      return reply.code(201).send({ 
        sessionId: account.id,
        message: 'Session created. Check QR code endpoint to connect.'
      })
    } catch (error) {
      console.error('Failed to create session:', error)
      
      // Check for common Chrome/Puppeteer errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (errorMessage.includes('libxkbcommon') || errorMessage.includes('Failed to launch')) {
        return reply.code(503).send({ 
          error: 'Chrome dependencies not installed',
          message: 'Please install Chrome dependencies. Run: ./install-chrome-deps.sh for instructions',
          details: errorMessage
        })
      }
      
      return reply.code(500).send({ 
        error: 'Failed to create session',
        details: errorMessage
      })
    }
  })

  // Get QR Code for session (protected)
  fastify.get('/sessions/:id/qr', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const session = await whatsappService.getSession(id)

    if (!session || !session.qrCode) {
      return reply.code(404).send({ error: 'QR code not available' })
    }

    return { qrCode: session.qrCode }
  })

  // Restart session (admin only)
  fastify.post('/sessions/:id/restart', { preHandler: [authorize('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    console.log(`[WhatsApp] Restart session requested for ID: ${id}`)
    
    try {
      // Check if account exists
      const account = await prisma.whatsAppAccount.findUnique({
        where: { id }
      })
      
      if (!account) {
        console.log(`[WhatsApp] Account not found: ${id}`)
        return reply.code(404).send({ error: 'WhatsApp account not found' })
      }
      
      console.log(`[WhatsApp] Destroying session for: ${account.phoneNumber}`)
      await whatsappService.destroySession(id)
      
      console.log(`[WhatsApp] Creating new session for: ${account.phoneNumber}`)
      await whatsappService.createSession(account.phoneNumber, account.name)
      
      console.log(`[WhatsApp] Session restart completed for: ${account.phoneNumber}`)
      return { message: 'Session restart initiated', accountId: id }
    } catch (error) {
      console.error('[WhatsApp] Failed to restart session:', error)
      return reply.code(500).send({ 
        error: 'Failed to restart session',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
  
  // Test endpoint - restart without auth (temporary for debugging)
  fastify.post('/sessions/:id/restart-test', async (request, reply) => {
    const { id } = request.params as { id: string }
    console.log(`[WhatsApp TEST] Restart session requested for ID: ${id}`)
    
    try {
      // Check if account exists
      const account = await prisma.whatsAppAccount.findUnique({
        where: { id }
      })
      
      if (!account) {
        console.log(`[WhatsApp TEST] Account not found: ${id}`)
        return reply.code(404).send({ error: 'WhatsApp account not found' })
      }
      
      // Check if whatsappService is initialized
      if (!whatsappService) {
        console.error('[WhatsApp TEST] WhatsApp service not initialized')
        return reply.code(503).send({ error: 'WhatsApp service not initialized' })
      }
      
      console.log(`[WhatsApp TEST] Account found: ${account.phoneNumber}, isConnected: ${account.isConnected}`)
      
      try {
        console.log(`[WhatsApp TEST] Attempting to destroy session...`)
        await whatsappService.destroySession(id)
        console.log(`[WhatsApp TEST] Session destroyed successfully`)
      } catch (destroyError) {
        console.error(`[WhatsApp TEST] Error destroying session:`, destroyError)
        // Continue anyway to try to create a new session
      }
      
      console.log(`[WhatsApp TEST] Creating new session...`)
      await whatsappService.createSession(account.phoneNumber, account.name)
      
      // Update account connection status
      await prisma.whatsAppAccount.update({
        where: { id },
        data: { isConnected: false }
      })
      
      console.log(`[WhatsApp TEST] Session restart completed`)
      return { 
        message: 'Session restart initiated',
        accountId: id,
        phoneNumber: account.phoneNumber,
        isConnected: false
      }
    } catch (error) {
      console.error('[WhatsApp TEST] Failed to restart session:', error)
      return reply.code(500).send({ 
        error: 'Failed to restart session',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
    }
  })

  // Destroy session (admin only)
  fastify.delete('/sessions/:id', { preHandler: [authorize('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    try {
      // Destroy the WhatsApp session
      await whatsappService.destroySession(id)
      
      // Delete the account from database
      await prisma.whatsAppAccount.delete({
        where: { id }
      })
      
      return reply.code(204).send()
    } catch (error) {
      console.error('Failed to destroy session:', error)
      return reply.code(500).send({ error: 'Failed to destroy session' })
    }
  })

  // Send immediate message (protected)
  fastify.post('/sessions/:id/send', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const message = messageSchema.parse(request.body)

    try {
      const result = await whatsappService.sendMessage(id, message)
      
      if (!result.success) {
        return reply.code(400).send({
          error: result.error,
          timestamp: result.timestamp
        })
      }

      return result
    } catch (error) {
      console.error('Failed to send message:', error)
      return reply.code(500).send({ error: 'Failed to send message' })
    }
  })

  // Get session contacts (protected)
  fastify.get('/sessions/:id/contacts', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    try {
      const contacts = await whatsappService.getContacts(id)
      return { contacts }
    } catch (error) {
      console.error('Failed to get contacts:', error)
      return reply.code(404).send({ error: 'Session not found or not connected' })
    }
  })

  // Get session groups (protected)
  fastify.get('/sessions/:id/groups', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    try {
      const groups = await whatsappService.getGroups(id)
      return { groups }
    } catch (error) {
      console.error('Failed to get groups:', error)
      return reply.code(404).send({ error: 'Session not found or not connected' })
    }
  })

  // Get available sessions (protected)
  fastify.get('/available', { preHandler: [authenticate] }, async () => {
    const optimalSession = await whatsappService.getOptimalSession()
    const allSessions = await whatsappService.getAllSessions()
    const availableSessions = allSessions.filter(s => s.isConnected)

    return {
      available: availableSessions.map(s => s.id),
      optimal: optimalSession,
      total: allSessions.length,
      connected: availableSessions.length
    }
  })

  // Test endpoint - get session details without auth
  fastify.get('/sessions/:id/status-test', async (request, reply) => {
    const { id } = request.params as { id: string }
    
    try {
      const session = await whatsappService.getSession(id)
      const account = await prisma.whatsAppAccount.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          isActive: true,
          isConnected: true
        }
      })
      
      if (!account) {
        return reply.code(404).send({ error: 'Account not found' })
      }
      
      return {
        account,
        session: session || { isConnected: false, qrCode: null }
      }
    } catch (error) {
      console.error('Failed to get session status:', error)
      return reply.code(500).send({ 
        error: 'Failed to get session status',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
  
  // Public status endpoint for frontend with caching
  fastify.get('/status', async () => {
    // Check cache first
    const cached = cache.get('status')
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION.STATUS) {
      return cached.data
    }

    try {
      const allSessions = await whatsappService.getAllSessions()
      const availableSessions = allSessions.filter(s => s.isConnected)

      const data = {
        connected: availableSessions.length,
        total: allSessions.length,
        hasConnectedSession: availableSessions.length > 0
      }

      // Cache the result
      cache.set('status', { data, timestamp: Date.now() })

      return data
    } catch (error) {
      return {
        connected: 0,
        total: 0,
        hasConnectedSession: false,
        error: 'Failed to check WhatsApp status'
      }
    }
  })

  // Reconnect all disconnected sessions
  fastify.post('/reconnect', async (request, reply) => {
    try {
      const allSessions = await whatsappService.getAllSessions()
      const disconnectedSessions = allSessions.filter(s => !s.isConnected)
      
      if (disconnectedSessions.length === 0) {
        return {
          success: true,
          message: 'All sessions are already connected',
          reconnected: 0
        }
      }

      let reconnected = 0
      const results = []

      for (const session of disconnectedSessions) {
        try {
          // Try to restart the session
          await whatsappService.destroySession(session.id)
          
          const account = await prisma.whatsAppAccount.findUnique({
            where: { id: session.id }
          })
          
          if (account) {
            await whatsappService.createSession(account.phoneNumber, account.name)
            reconnected++
            results.push({ sessionId: session.id, status: 'reconnecting' })
          }
        } catch (error) {
          console.error(`Failed to reconnect session ${session.id}:`, error)
          results.push({ 
            sessionId: session.id, 
            status: 'failed', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })
        }
      }

      return {
        success: reconnected > 0,
        message: `Reconnected ${reconnected} of ${disconnectedSessions.length} sessions`,
        reconnected,
        total: disconnectedSessions.length,
        results
      }
    } catch (error) {
      console.error('Failed to reconnect sessions:', error)
      return reply.code(500).send({ 
        error: 'Failed to reconnect sessions',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  // Sync contacts with database (admin only)
  fastify.post('/sessions/:id/sync-contacts', { preHandler: [authorize('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    try {
      const contacts = await whatsappService.getContacts(id)
      let syncedCount = 0
      const errors: Array<{ contact: string; error: string }> = []

      for (const contact of contacts) {
        try {
          // Skip contacts without valid phone numbers
          if (!contact.phoneNumber || contact.phoneNumber === '') {
            console.warn(`Skipping contact with invalid phone number: ${contact.name}`)
            continue
          }

          await prisma.contact.upsert({
            where: { phoneNumber: contact.phoneNumber },
            update: {
              name: contact.name
            },
            create: {
              name: contact.name,
              phoneNumber: contact.phoneNumber,
              tags: []
            }
          })
          syncedCount++
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(`Failed to sync contact ${contact.name} (${contact.phoneNumber}):`, errorMessage)
          errors.push({ 
            contact: `${contact.name} (${contact.phoneNumber})`, 
            error: errorMessage 
          })
        }
      }

      return { 
        synced: syncedCount, 
        total: contacts.length,
        errors: errors.length > 0 ? errors : undefined,
        message: syncedCount === contacts.length 
          ? 'All contacts synced successfully' 
          : `Synced ${syncedCount} of ${contacts.length} contacts`
      }
    } catch (error) {
      console.error('Failed to sync contacts:', error)
      return reply.code(500).send({ error: 'Failed to sync contacts' })
    }
  })

  // Sync groups with database (admin only)
  fastify.post('/sessions/:id/sync-groups', { preHandler: [authorize('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    try {
      const groups = await whatsappService.getGroups(id)
      let syncedCount = 0
      const errors: Array<{ group: string; error: string }> = []

      for (const group of groups) {
        try {
          // Skip groups without valid IDs
          if (!group.id || group.id === 'null') {
            console.warn(`Skipping group with invalid ID: ${group.name}`)
            continue
          }

          const dbGroup = await prisma.group.upsert({
            where: { groupId: group.id },
            update: {
              name: group.name || 'Unnamed Group',
              whatsAppAccountId: id
            },
            create: {
              name: group.name || 'Unnamed Group',
              groupId: group.id,
              whatsAppAccountId: id,
              tags: []
            }
          })

          // Sync group members
          for (const participant of group.participants) {
            try {
              // Skip participants without valid phone numbers
              if (!participant.phoneNumber || participant.phoneNumber === '') {
                continue
              }

              const contact = await prisma.contact.upsert({
                where: { phoneNumber: participant.phoneNumber },
                update: { name: participant.name },
                create: {
                  name: participant.name,
                  phoneNumber: participant.phoneNumber,
                  tags: []
                }
              })

              await prisma.groupMember.upsert({
                where: {
                  groupId_contactId: {
                    groupId: dbGroup.id,
                    contactId: contact.id
                  }
                },
                update: {},
                create: {
                  groupId: dbGroup.id,
                  contactId: contact.id
                }
              })
            } catch (participantError) {
              console.warn(`Failed to sync participant ${participant.name}:`, participantError)
              // Continue with other participants
            }
          }

          syncedCount++
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(`Failed to sync group ${group.name}:`, errorMessage)
          errors.push({ group: group.name || 'Unknown', error: errorMessage })
        }
      }

      return { 
        synced: syncedCount, 
        total: groups.length,
        errors: errors.length > 0 ? errors : undefined,
        message: syncedCount === groups.length 
          ? 'All groups synced successfully' 
          : `Synced ${syncedCount} of ${groups.length} groups`
      }
    } catch (error) {
      console.error('Failed to sync groups:', error)
      return reply.code(500).send({ error: 'Failed to sync groups' })
    }
  })

  // Broadcast message to multiple recipients (admin only)
  fastify.post('/broadcast', { preHandler: [authorize('ADMIN')] }, async (request, reply) => {
    const schema = z.object({
      message: z.string().min(1),
      recipients: z.array(z.string()).min(1),
      type: z.enum(['text', 'image', 'document']).default('text'),
      media: z.object({
        url: z.string().url(),
        caption: z.string().optional(),
        filename: z.string().optional()
      }).optional()
    })

    const data = schema.parse(request.body)

    try {
      const results = await whatsappService.broadcastMessage(
        {
          message: data.message,
          type: data.type,
          media: data.media
        },
        data.recipients
      )

      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length

      return {
        total: results.length,
        successful,
        failed,
        results
      }
    } catch (error) {
      console.error('Failed to broadcast message:', error)
      return reply.code(500).send({ error: error instanceof Error ? error.message : 'Failed to broadcast message' })
    }
  })
}