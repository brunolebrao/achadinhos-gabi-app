import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@repo/database'

const settingSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
  description: z.string().optional()
})

const whatsappAccountSchema = z.object({
  name: z.string().min(1),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  isActive: z.boolean().default(true),
  dailyLimit: z.number().positive().default(300)
})

export default async function settingsRoutes(fastify: FastifyInstance) {
  fastify.get('/', async () => {
    const settings = await prisma.setting.findMany({
      orderBy: { key: 'asc' }
    })

    return settings
  })

  fastify.get('/:key', async (request, reply) => {
    const { key } = request.params as { key: string }

    const setting = await prisma.setting.findUnique({
      where: { key }
    })

    if (!setting) {
      return reply.code(404).send({ error: 'Setting not found' })
    }

    return setting
  })

  fastify.put('/:key', async (request, reply) => {
    const { key } = request.params as { key: string }
    const { value, description } = settingSchema.partial().parse(request.body)

    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description }
    })

    return setting
  })

  fastify.get('/whatsapp-accounts', async () => {
    const accounts = await prisma.whatsAppAccount.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return accounts
  })

  fastify.get('/whatsapp-accounts/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const account = await prisma.whatsAppAccount.findUnique({
      where: { id }
    })

    if (!account) {
      return reply.code(404).send({ error: 'WhatsApp account not found' })
    }

    return account
  })

  fastify.post('/whatsapp-accounts', async (request, reply) => {
    const accountData = whatsappAccountSchema.parse(request.body)

    const account = await prisma.whatsAppAccount.create({
      data: accountData
    })

    return reply.code(201).send(account)
  })

  fastify.patch('/whatsapp-accounts/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const updates = whatsappAccountSchema.partial().parse(request.body)

    const account = await prisma.whatsAppAccount.update({
      where: { id },
      data: updates
    })

    return account
  })

  fastify.patch('/whatsapp-accounts/:id/toggle', async (request, reply) => {
    const { id } = request.params as { id: string }

    const account = await prisma.whatsAppAccount.findUnique({
      where: { id }
    })

    if (!account) {
      return reply.code(404).send({ error: 'WhatsApp account not found' })
    }

    const updatedAccount = await prisma.whatsAppAccount.update({
      where: { id },
      data: { isActive: !account.isActive }
    })

    return updatedAccount
  })

  fastify.patch('/whatsapp-accounts/:id/reset-daily-limit', async (request, reply) => {
    const { id } = request.params as { id: string }

    const account = await prisma.whatsAppAccount.update({
      where: { id },
      data: {
        sentToday: 0,
        lastResetAt: new Date()
      }
    })

    return account
  })

  fastify.delete('/whatsapp-accounts/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    await prisma.whatsAppAccount.delete({
      where: { id }
    })

    return reply.code(204).send()
  })

  fastify.get('/affiliate-links', async (request) => {
    const { platform } = z.object({
      platform: z.enum(['MERCADOLIVRE', 'SHOPEE', 'AMAZON', 'ALIEXPRESS']).optional()
    }).parse(request.query)

    const links = await prisma.affiliateLink.findMany({
      where: {
        ...(platform && { platform })
      },
      include: {
        _count: {
          select: { clicks: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    return links
  })
}