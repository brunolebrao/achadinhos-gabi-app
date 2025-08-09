import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@repo/database'

const contactSchema = z.object({
  name: z.string().min(1),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  tags: z.array(z.string()).default([]),
  isBlocked: z.boolean().default(false)
})

export default async function contactsRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request) => {
    const { search, tag, isBlocked, page = 1, limit = 20 } = z.object({
      search: z.string().optional(),
      tag: z.string().optional(),
      isBlocked: z.coerce.boolean().optional(),
      page: z.coerce.number().positive().default(1),
      limit: z.coerce.number().positive().max(100).default(20)
    }).parse(request.query)

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { phoneNumber: { contains: search } }
        ]
      }),
      ...(tag && { tags: { has: tag } }),
      ...(isBlocked !== undefined && { isBlocked })
    }

    const contacts = await prisma.contact.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' }
    })

    const total = await prisma.contact.count({ where })

    return {
      contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  })

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        groups: {
          include: {
            group: true
          }
        }
      }
    })

    if (!contact) {
      return reply.code(404).send({ error: 'Contact not found' })
    }

    return contact
  })

  fastify.post('/', async (request, reply) => {
    const contactData = contactSchema.parse(request.body)

    const contact = await prisma.contact.create({
      data: contactData
    })

    return reply.code(201).send(contact)
  })

  fastify.post('/bulk', async (request, reply) => {
    const { contacts } = z.object({
      contacts: z.array(contactSchema)
    }).parse(request.body)

    const results = await Promise.allSettled(
      contacts.map(contact =>
        prisma.contact.upsert({
          where: { phoneNumber: contact.phoneNumber },
          update: contact,
          create: contact
        })
      )
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    return reply.code(201).send({
      successful,
      failed,
      total: contacts.length
    })
  })

  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const updates = contactSchema.partial().parse(request.body)

    const contact = await prisma.contact.update({
      where: { id },
      data: updates
    })

    return contact
  })

  fastify.patch('/:id/block', async (request, reply) => {
    const { id } = request.params as { id: string }

    const contact = await prisma.contact.update({
      where: { id },
      data: { isBlocked: true }
    })

    return contact
  })

  fastify.patch('/:id/unblock', async (request, reply) => {
    const { id } = request.params as { id: string }

    const contact = await prisma.contact.update({
      where: { id },
      data: { isBlocked: false }
    })

    return contact
  })

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    await prisma.contact.delete({
      where: { id }
    })

    return reply.code(204).send()
  })

  fastify.get('/tags', async () => {
    const contacts = await prisma.contact.findMany({
      select: { tags: true }
    })

    const tagsSet = new Set<string>()
    contacts.forEach(contact => {
      contact.tags.forEach(tag => tagsSet.add(tag))
    })

    return Array.from(tagsSet).sort()
  })
}