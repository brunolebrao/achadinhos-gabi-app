import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import { prisma, UserRole } from '@repo/database'
import { authenticate, authorize } from '../middleware/auth'

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  role: z.enum(['USER', 'ADMIN']).default('USER')
})

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  isActive: z.boolean().optional()
})

export default async function usersRoutes(fastify: FastifyInstance) {
  // List all users (admin only)
  fastify.get('/', { preHandler: [authorize('ADMIN')] }, async (request, reply) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return { users }
  })

  // Get single user (admin or self)
  fastify.get('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const requestingUser = request.user as any
    
    // Check if user is requesting their own data or is admin
    if (requestingUser.userId !== id && requestingUser.role !== 'ADMIN') {
      return reply.code(403).send({ error: 'Forbidden' })
    }
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })
    
    if (!user) {
      return reply.code(404).send({ error: 'User not found' })
    }
    
    return { user }
  })

  // Create new user (admin only)
  fastify.post('/', { preHandler: [authorize('ADMIN')] }, async (request, reply) => {
    try {
      const { email, name, password, role } = createUserSchema.parse(request.body)
      
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })
      
      if (existingUser) {
        return reply.code(409).send({ error: 'User already exists' })
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10)
      
      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: role as UserRole
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      })
      
      return reply.code(201).send({ user })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors })
      }
      throw error
    }
  })

  // Update user (admin or self with restrictions)
  fastify.patch('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const requestingUser = request.user as any
      const updates = updateUserSchema.parse(request.body)
      
      // Check permissions
      if (requestingUser.userId !== id && requestingUser.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Forbidden' })
      }
      
      // Non-admins can't change role or isActive
      if (requestingUser.role !== 'ADMIN') {
        delete updates.role
        delete updates.isActive
      }
      
      // Hash password if provided
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 10)
      }
      
      const user = await prisma.user.update({
        where: { id },
        data: updates,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          updatedAt: true
        }
      })
      
      return { user }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors })
      }
      throw error
    }
  })

  // Delete user (admin only, can't delete self)
  fastify.delete('/:id', { preHandler: [authorize('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const requestingUser = request.user as any
    
    // Prevent self-deletion
    if (requestingUser.userId === id) {
      return reply.code(400).send({ error: 'Cannot delete your own account' })
    }
    
    // Soft delete by setting isActive to false
    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true
      }
    })
    
    return { message: 'User deactivated successfully', user }
  })

  // Change password (self only)
  fastify.post('/change-password', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const schema = z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(6)
      })
      
      const { currentPassword, newPassword } = schema.parse(request.body)
      const requestingUser = request.user as any
      
      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: requestingUser.userId }
      })
      
      if (!user) {
        return reply.code(404).send({ error: 'User not found' })
      }
      
      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password)
      
      if (!isPasswordValid) {
        return reply.code(401).send({ error: 'Current password is incorrect' })
      }
      
      // Hash and update new password
      const hashedPassword = await bcrypt.hash(newPassword, 10)
      
      await prisma.user.update({
        where: { id: requestingUser.userId },
        data: { password: hashedPassword }
      })
      
      return { message: 'Password changed successfully' }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors })
      }
      throw error
    }
  })
}