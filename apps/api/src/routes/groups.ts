import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@repo/database'

const groupSchema = z.object({
  name: z.string().min(1),
  groupId: z.string().min(1),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isActive: z.boolean().default(true)
})

export default async function groupsRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request) => {
    const { category, isActive, tag, whatsAppAccountId } = z.object({
      category: z.string().optional(),
      isActive: z.coerce.boolean().optional(),
      tag: z.string().optional(),
      whatsAppAccountId: z.string().optional()
    }).parse(request.query)

    // If no specific whatsAppAccountId is provided, get the active session
    let accountFilter = whatsAppAccountId
    if (!accountFilter) {
      // Get the first active and connected WhatsApp account
      const activeAccount = await prisma.whatsAppAccount.findFirst({
        where: {
          isActive: true,
          isConnected: true
        },
        orderBy: { sentToday: 'asc' } // Get the one with less messages sent today
      })
      accountFilter = activeAccount?.id
    }

    const groups = await prisma.group.findMany({
      where: {
        ...(category && { category }),
        ...(isActive !== undefined && { isActive }),
        ...(tag && { tags: { has: tag } }),
        whatsAppAccountId: accountFilter // Always filter by account, can be null
      },
      include: {
        _count: {
          select: { members: true }
        },
        whatsAppAccount: {
          select: {
            id: true,
            name: true,
            phoneNumber: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return groups
  })

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            contact: true
          }
        }
      }
    })

    if (!group) {
      return reply.code(404).send({ error: 'Group not found' })
    }

    return group
  })

  fastify.post('/', async (request, reply) => {
    const groupData = groupSchema.parse(request.body)

    const group = await prisma.group.create({
      data: groupData
    })

    return reply.code(201).send(group)
  })

  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const groupData = groupSchema.parse(request.body)

    const group = await prisma.group.update({
      where: { id },
      data: groupData
    })

    return group
  })

  fastify.patch('/:id/toggle', async (request, reply) => {
    const { id } = request.params as { id: string }

    const group = await prisma.group.findUnique({
      where: { id }
    })

    if (!group) {
      return reply.code(404).send({ error: 'Group not found' })
    }

    const updatedGroup = await prisma.group.update({
      where: { id },
      data: { isActive: !group.isActive }
    })

    return updatedGroup
  })

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    await prisma.group.delete({
      where: { id }
    })

    return reply.code(204).send()
  })

  // Temporary endpoint to clean up groups without whatsAppAccountId
  fastify.delete('/cleanup/orphaned', async (request, reply) => {
    const deletedGroups = await prisma.group.deleteMany({
      where: { whatsAppAccountId: null }
    })

    return { deletedCount: deletedGroups.count }
  })

  fastify.post('/:id/members', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { contactIds, role = 'member' } = z.object({
      contactIds: z.array(z.string()).min(1),
      role: z.string().default('member')
    }).parse(request.body)

    const memberData = contactIds.map(contactId => ({
      groupId: id,
      contactId,
      role
    }))

    await prisma.groupMember.createMany({
      data: memberData,
      skipDuplicates: true
    })

    const updatedGroup = await prisma.group.findUnique({
      where: { id },
      include: {
        _count: {
          select: { members: true }
        }
      }
    })

    return updatedGroup
  })

  fastify.delete('/:id/members/:contactId', async (request, reply) => {
    const { id, contactId } = request.params as { id: string; contactId: string }

    await prisma.groupMember.delete({
      where: {
        groupId_contactId: {
          groupId: id,
          contactId
        }
      }
    })

    return reply.code(204).send()
  })

  fastify.get('/categories', async () => {
    const groups = await prisma.group.findMany({
      where: { category: { not: null } },
      select: { category: true },
      distinct: ['category']
    })

    return groups
      .map(g => g.category)
      .filter(Boolean)
      .sort()
  })
}