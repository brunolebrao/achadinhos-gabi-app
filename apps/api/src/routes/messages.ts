import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@repo/database'
import { renderTemplateWithProduct, suggestTemplate, type ProductForTemplate } from '../utils/template-utils'
import { whatsappService } from '../services/whatsapp-service'

const messageSchema = z.object({
  productId: z.string().optional(),
  templateId: z.string().optional(),
  content: z.string().min(1),
  scheduledAt: z.coerce.date(),
  recipients: z.array(z.string()).min(1),
  recipientType: z.enum(['CONTACT', 'GROUP', 'BROADCAST']).default('GROUP')
})

const bulkCampaignSchema = z.object({
  name: z.string().min(1),
  productIds: z.array(z.string()).min(1),
  targetType: z.enum(['CONTACTS', 'GROUPS', 'ALL']).default('GROUPS'),
  templateMode: z.enum(['AUTO_SUGGEST', 'SPECIFIC']).default('AUTO_SUGGEST'),
  templateId: z.string().optional(),
  scheduledAt: z.coerce.date().optional(),
  tags: z.array(z.string()).optional(), // Filter recipients by tags
  groupIds: z.array(z.string()).optional(), // Specific group IDs for targeted campaigns
  maxRecipientsPerMessage: z.number().min(1).max(50).default(10), // Avoid large recipient lists
  delayBetweenMessages: z.number().min(5).max(300).default(30) // Seconds between messages
})

export default async function messagesRoutes(fastify: FastifyInstance) {
  // Debug endpoint to check recent messages
  fastify.get('/debug/recent', async (request) => {
    const messages = await prisma.scheduledMessage.findMany({
      include: {
        product: {
          select: { id: true, title: true, status: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    const stats = {
      total: await prisma.scheduledMessage.count(),
      pending: await prisma.scheduledMessage.count({ where: { status: 'PENDING' } }),
      sent: await prisma.scheduledMessage.count({ where: { status: 'SENT' } }),
      failed: await prisma.scheduledMessage.count({ where: { status: 'FAILED' } }),
      recentMessages: messages.length
    }

    return { stats, messages }
  })

  fastify.get('/', async (request) => {
    const { status, from, to } = z.object({
      status: z.enum(['PENDING', 'SENT', 'FAILED', 'CANCELLED']).optional(),
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional()
    }).parse(request.query)

    const messages = await prisma.scheduledMessage.findMany({
      where: {
        ...(status && { status }),
        ...(from && { scheduledAt: { gte: from } }),
        ...(to && { scheduledAt: { lte: to } })
      },
      include: {
        product: true
      },
      orderBy: { scheduledAt: 'asc' }
    })

    return messages
  })

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const message = await prisma.scheduledMessage.findUnique({
      where: { id },
      include: {
        product: true
      }
    })

    if (!message) {
      return reply.code(404).send({ error: 'Message not found' })
    }

    return message
  })

  fastify.post('/', async (request, reply) => {
    const messageData = messageSchema.parse(request.body)

    const message = await prisma.scheduledMessage.create({
      data: messageData,
      include: {
        product: true
      }
    })

    return reply.code(201).send(message)
  })

  fastify.post('/bulk', async (request, reply) => {
    const { messages } = z.object({
      messages: z.array(messageSchema)
    }).parse(request.body)

    const createdMessages = await prisma.scheduledMessage.createMany({
      data: messages
    })

    return reply.code(201).send({
      count: createdMessages.count
    })
  })

  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const updates = messageSchema.partial().parse(request.body)

    const message = await prisma.scheduledMessage.update({
      where: { id },
      data: updates,
      include: {
        product: true
      }
    })

    return message
  })

  fastify.patch('/:id/cancel', async (request, reply) => {
    const { id } = request.params as { id: string }

    const message = await prisma.scheduledMessage.findUnique({
      where: { id }
    })

    if (!message) {
      return reply.code(404).send({ error: 'Message not found' })
    }

    if (message.status !== 'PENDING') {
      return reply.code(400).send({ error: 'Can only cancel pending messages' })
    }

    const updatedMessage = await prisma.scheduledMessage.update({
      where: { id },
      data: { status: 'CANCELLED' }
    })

    return updatedMessage
  })

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    await prisma.scheduledMessage.delete({
      where: { id }
    })

    return reply.code(204).send()
  })

  fastify.get('/queue', async (request) => {
    const now = new Date()
    
    const pendingMessages = await prisma.scheduledMessage.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: now }
      },
      include: {
        product: true
      },
      orderBy: { scheduledAt: 'asc' },
      take: 10
    })

    return pendingMessages
  })

  // Create bulk campaign - intelligent message generation
  fastify.post('/campaign', async (request, reply) => {
    const campaign = bulkCampaignSchema.parse(request.body)

    console.log('🚀 Starting campaign creation:', {
      name: campaign.name,
      productIds: campaign.productIds.length,
      targetType: campaign.targetType,
      templateMode: campaign.templateMode,
      groupIds: campaign.groupIds?.length || 0
    })

    try {
      // 1. Get products
      console.log(`🔍 Fetching ${campaign.productIds.length} products...`)
      const products = await prisma.product.findMany({
        where: {
          id: { in: campaign.productIds },
          status: 'APPROVED' // Only send approved products
        }
      })

      console.log(`📦 Found ${products.length} approved products out of ${campaign.productIds.length} requested`)
      
      if (products.length === 0) {
        console.log('❌ Campaign failed: No approved products found')
        const allProducts = await prisma.product.findMany({
          where: { id: { in: campaign.productIds } },
          select: { id: true, status: true, title: true }
        })
        console.log('📊 Product statuses:', allProducts.map(p => ({ 
          title: p.title.substring(0, 30) + '...', 
          status: p.status 
        })))
        return reply.code(400).send({ 
          error: 'No approved products found',
          details: `Found ${campaign.productIds.length} products but none are APPROVED`,
          productStatuses: allProducts.map(p => ({ id: p.id, status: p.status }))
        })
      }

      // 2. Get recipients based on target type
      console.log(`👥 Searching for recipients with targetType: ${campaign.targetType}`)
      let recipients: Array<{ id: string; type: 'CONTACT' | 'GROUP' }> = []

      if (campaign.targetType === 'CONTACTS' || campaign.targetType === 'ALL') {
        console.log('📞 Searching for contacts...')
        const contacts = await prisma.contact.findMany({
          where: {
            isBlocked: false,
            ...(campaign.tags && campaign.tags.length > 0 && {
              tags: { hasSome: campaign.tags }
            })
          },
          select: { id: true, phoneNumber: true }
        })
        console.log(`📞 Found ${contacts.length} active contacts`)
        recipients.push(...contacts.map(c => ({ id: c.phoneNumber, type: 'CONTACT' as const })))
      }

      if (campaign.targetType === 'GROUPS' || campaign.targetType === 'ALL') {
        console.log('👥 Searching for WhatsApp groups...')
        let groupsQuery: any = {
          isActive: true
        }

        // If specific group IDs are provided, filter by those
        if (campaign.groupIds && campaign.groupIds.length > 0) {
          console.log(`🎯 Filtering by specific group IDs: ${campaign.groupIds.length} groups`)
          groupsQuery.groupId = { in: campaign.groupIds }
        } else if (campaign.tags && campaign.tags.length > 0) {
          console.log(`🏷️ Filtering by tags: ${campaign.tags.join(', ')}`)
          // Otherwise use tag filtering
          groupsQuery.tags = { hasSome: campaign.tags }
        }

        const groups = await prisma.group.findMany({
          where: groupsQuery,
          select: { id: true, groupId: true, name: true }
        })

        console.log(`👥 Found ${groups.length} groups for campaign:`)
        groups.forEach((g, i) => {
          console.log(`  ${i + 1}. ${g.name} (${g.groupId})`)
        })
        recipients.push(...groups.map(g => ({ id: g.groupId, type: 'GROUP' as const })))
      }

      console.log(`📊 Total recipients found: ${recipients.length} (${recipients.filter(r => r.type === 'CONTACT').length} contacts, ${recipients.filter(r => r.type === 'GROUP').length} groups)`)

      if (recipients.length === 0) {
        console.log('❌ Campaign failed: No recipients found')
        // Debug info for troubleshooting
        if (campaign.targetType === 'GROUPS' || campaign.targetType === 'ALL') {
          const totalGroups = await prisma.group.count()
          const activeGroups = await prisma.group.count({ where: { isActive: true } })
          console.log(`📊 Groups debug: ${activeGroups} active out of ${totalGroups} total groups`)
          
          if (campaign.groupIds && campaign.groupIds.length > 0) {
            const foundGroups = await prisma.group.findMany({
              where: { groupId: { in: campaign.groupIds } },
              select: { groupId: true, name: true, isActive: true }
            })
            console.log('🔍 Specific group search results:', foundGroups)
          }
        }
        return reply.code(400).send({ 
          error: 'No recipients found',
          debug: {
            targetType: campaign.targetType,
            groupIds: campaign.groupIds?.length || 0,
            tags: campaign.tags?.length || 0
          }
        })
      }

      // 3. Create messages for each product
      console.log(`📝 Creating messages for ${products.length} products...`)
      const messages: any[] = []
      let currentScheduledTime = campaign.scheduledAt || new Date()
      let productsProcessed = 0
      let templatesNotFound = 0

      for (const product of products) {
        console.log(`📦 Processing product: ${product.title.substring(0, 50)}...`)
        
        // Map product to template format
        const productForTemplate: ProductForTemplate = {
          id: product.id,
          title: product.title,
          price: product.price,
          originalPrice: product.originalPrice,
          discount: product.discount,
          productUrl: product.productUrl,
          imageUrl: product.imageUrl, // Include product image
          platform: product.platform,
          category: product.category,
          isNew: false
        }

        // Get or suggest template
        let templateId = campaign.templateId
        if (campaign.templateMode === 'AUTO_SUGGEST') {
          console.log(`🤖 Auto-suggesting template for product with ${product.discount || '0%'} discount...`)
          templateId = await suggestTemplate(productForTemplate)
          console.log(`💡 Suggested template ID: ${templateId || 'none'}`)
        } else {
          console.log(`📋 Using specific template ID: ${templateId}`)
        }

        if (!templateId) {
          console.warn(`⚠️ No template found for product ${product.title.substring(0, 30)}... (discount: ${product.discount || 'none'}, platform: ${product.platform})`)
          templatesNotFound++
          continue
        }

        // Get template and render content
        const template = await prisma.template.findUnique({
          where: { id: templateId }
        })

        if (!template) {
          console.warn(`❌ Template ${templateId} not found in database`)
          templatesNotFound++
          continue
        }

        console.log(`✅ Using template: ${template.name} (${template.category})`)
        const content = await renderTemplateWithProduct(template.content, productForTemplate)
        console.log(`📄 Generated message preview: ${content.substring(0, 100)}...`)

        productsProcessed++

        // Split recipients into chunks
        const recipientChunks = []
        for (let i = 0; i < recipients.length; i += campaign.maxRecipientsPerMessage) {
          recipientChunks.push(recipients.slice(i, i + campaign.maxRecipientsPerMessage))
        }

        // Create messages for each chunk
        for (const chunk of recipientChunks) {
          const recipientIds = chunk.map(r => r.id)
          const recipientType = chunk[0].type // All in chunk should be same type

          messages.push({
            productId: product.id,
            templateId: templateId,
            content,
            scheduledAt: currentScheduledTime,
            recipients: recipientIds,
            recipientType
          })

          // Add delay between messages
          currentScheduledTime = new Date(currentScheduledTime.getTime() + campaign.delayBetweenMessages * 1000)
        }
      }

      // 4. Bulk create messages
      console.log(`💾 Saving ${messages.length} messages to database...`)
      console.log(`📊 Campaign summary:`)
      console.log(`  - Products processed: ${productsProcessed}`)
      console.log(`  - Templates not found: ${templatesNotFound}`)
      console.log(`  - Messages created: ${messages.length}`)
      console.log(`  - Recipients reached: ${recipients.length}`)

      if (messages.length === 0) {
        console.log('❌ Campaign failed: No messages to create')
        return reply.code(400).send({ 
          error: 'No messages created',
          details: `Processed ${productsProcessed} products but no messages were generated. Check if templates exist.`,
          debug: {
            productsRequested: campaign.productIds.length,
            productsApproved: products.length,
            productsProcessed,
            templatesNotFound
          }
        })
      }

      const result = await prisma.scheduledMessage.createMany({
        data: messages
      })

      console.log(`✅ Campaign created successfully! ${result.count} messages saved`)
      console.log(`⏰ First message scheduled for: ${new Date(messages[0]?.scheduledAt).toISOString()}`)
      console.log(`🏁 Last message scheduled for: ${currentScheduledTime.toISOString()}`)

      return reply.code(201).send({
        campaign: {
          name: campaign.name,
          productsProcessed,
          messagesCreated: result.count,
          recipientsReached: recipients.length,
          estimatedDuration: Math.ceil(messages.length * campaign.delayBetweenMessages / 60), // minutes
          startTime: campaign.scheduledAt || new Date(),
          endTime: currentScheduledTime
        },
        summary: {
          products: products.slice(0, productsProcessed).map(p => ({ id: p.id, title: p.title })),
          recipientTypes: {
            contacts: recipients.filter(r => r.type === 'CONTACT').length,
            groups: recipients.filter(r => r.type === 'GROUP').length
          }
        },
        debug: {
          templatesNotFound,
          messagesPerProduct: Math.ceil(messages.length / productsProcessed)
        }
      })

    } catch (error) {
      console.error('❌ Campaign creation failed:', error)
      return reply.code(500).send({ 
        error: 'Failed to create campaign',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })

  // Get campaign analytics
  fastify.get('/analytics/campaigns', async (request) => {
    const { from, to } = z.object({
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional()
    }).parse(request.query)

    const whereClause = {
      ...(from && { createdAt: { gte: from } }),
      ...(to && { createdAt: { lte: to } })
    }

    const [totalMessages, statusCounts, recentCampaigns] = await Promise.all([
      // Total messages count
      prisma.scheduledMessage.count({
        where: whereClause
      }),

      // Status distribution
      prisma.scheduledMessage.groupBy({
        by: ['status'],
        where: whereClause,
        _count: true
      }),

      // Recent activity grouped by product (proxy for campaigns)
      prisma.scheduledMessage.findMany({
        where: {
          ...whereClause,
          productId: { not: null }
        },
        include: {
          product: {
            select: { id: true, title: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
    ])

    const statusMap = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<string, number>)

    return {
      overview: {
        totalMessages,
        pending: statusMap.PENDING || 0,
        sent: statusMap.SENT || 0,
        failed: statusMap.FAILED || 0,
        cancelled: statusMap.CANCELLED || 0
      },
      recentActivity: recentCampaigns
    }
  })

  // Process message queue (for background jobs)
  fastify.post('/process-queue', async (request, reply) => {
    const { limit } = z.object({
      limit: z.coerce.number().min(1).max(50).default(10)
    }).parse(request.query)

    const now = new Date()
    
    // Get pending messages that should be processed
    const pendingMessages = await prisma.scheduledMessage.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: now }
      },
      include: {
        product: true
      },
      orderBy: { scheduledAt: 'asc' },
      take: limit
    })

    if (pendingMessages.length === 0) {
      return { processed: 0, message: 'No pending messages to process' }
    }

    const results = []

    for (const message of pendingMessages) {
      try {
        console.log(`📤 Processing message ${message.id} with ${message.recipients.length} recipients`)
        
        // Get optimal WhatsApp session
        const sessionId = await whatsappService.getOptimalSession()
        
        if (!sessionId) {
          throw new Error('No available WhatsApp sessions')
        }

        // Send to each recipient
        const sendResults = []
        for (const recipient of message.recipients) {
          try {
            const result = await whatsappService.sendMessage(sessionId, {
              to: recipient,
              message: message.content,
              type: 'text'
            })
            
            sendResults.push({
              recipient,
              success: result.success,
              error: result.error
            })
            
            // Add small delay between messages to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000))
            
          } catch (error) {
            console.error(`Failed to send message to ${recipient}:`, error)
            sendResults.push({
              recipient,
              success: false,
              error: error.message
            })
          }
        }

        // Check if all sends were successful
        const allSuccessful = sendResults.every(r => r.success)
        const anySuccessful = sendResults.some(r => r.success)

        if (allSuccessful) {
          // All messages sent successfully
          await prisma.scheduledMessage.update({
            where: { id: message.id },
            data: { 
              status: 'SENT', 
              sentAt: now,
              error: null
            }
          })
          
          results.push({
            id: message.id,
            status: 'SENT',
            recipients: message.recipients.length,
            successful: sendResults.filter(r => r.success).length,
            failed: sendResults.filter(r => !r.success).length
          })

        } else if (anySuccessful) {
          // Some messages sent, some failed - mark as partially sent
          await prisma.scheduledMessage.update({
            where: { id: message.id },
            data: { 
              status: 'FAILED', 
              error: `Partial failure: ${sendResults.filter(r => !r.success).length} of ${sendResults.length} failed`
            }
          })
          
          results.push({
            id: message.id,
            status: 'PARTIAL_FAILURE',
            recipients: message.recipients.length,
            successful: sendResults.filter(r => r.success).length,
            failed: sendResults.filter(r => !r.success).length
          })

        } else {
          // All messages failed
          await prisma.scheduledMessage.update({
            where: { id: message.id },
            data: { 
              status: 'FAILED',
              error: `All sends failed: ${sendResults[0]?.error || 'Unknown error'}`
            }
          })
          
          results.push({
            id: message.id,
            status: 'FAILED',
            recipients: message.recipients.length,
            successful: 0,
            failed: sendResults.length,
            error: sendResults[0]?.error
          })
        }

      } catch (error) {
        console.error(`Failed to process message ${message.id}:`, error)
        
        // Mark message as failed
        await prisma.scheduledMessage.update({
          where: { id: message.id },
          data: { 
            status: 'FAILED',
            error: error.message || 'Unknown processing error'
          }
        })
        
        results.push({
          id: message.id,
          status: 'FAILED',
          recipients: message.recipients.length,
          successful: 0,
          failed: message.recipients.length,
          error: error.message
        })
      }
    }

    return {
      processed: pendingMessages.length,
      results,
      summary: {
        sent: results.filter(r => r.status === 'SENT').length,
        failed: results.filter(r => r.status === 'FAILED').length,
        partialFailures: results.filter(r => r.status === 'PARTIAL_FAILURE').length
      }
    }
  })
}