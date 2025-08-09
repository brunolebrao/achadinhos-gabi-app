import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import { prisma } from '@repo/database'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6)
})

export default async function authRoutes(fastify: FastifyInstance) {
  // Login endpoint
  fastify.post('/login', async (request, reply) => {
    const startTime = Date.now()
    console.log('🔐 Login attempt started at:', new Date().toISOString())
    
    try {
      // Step 1: Parse request body
      console.log('📝 Parsing request body...')
      const { email, password } = loginSchema.parse(request.body)
      console.log('✅ Request parsed, email:', email)

      // Step 2: Database query with timeout
      console.log('🔍 Searching user in database...')
      const dbStart = Date.now()
      
      const user = await Promise.race([
        prisma.user.findUnique({ where: { email } }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), 10000)
        )
      ]) as any

      console.log('✅ Database query completed in:', Date.now() - dbStart, 'ms')

      if (!user || !user.isActive) {
        console.log('❌ User not found or inactive')
        return reply.code(401).send({ 
          error: 'Invalid credentials' 
        })
      }

      console.log('✅ User found:', user.email, 'role:', user.role)

      // Step 3: Password verification with timeout
      console.log('🔒 Verifying password...')
      const bcryptStart = Date.now()
      
      const isPasswordValid = await Promise.race([
        bcrypt.compare(password, user.password),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Bcrypt timeout')), 10000)
        )
      ]) as boolean

      console.log('✅ Password verification completed in:', Date.now() - bcryptStart, 'ms')
      
      if (!isPasswordValid) {
        console.log('❌ Invalid password')
        return reply.code(401).send({ 
          error: 'Invalid credentials' 
        })
      }

      // Step 4: Generate JWT token
      console.log('🎟️ Generating JWT token...')
      const token = fastify.jwt.sign({
        userId: user.id,
        email: user.email,
        role: user.role
      })

      const totalTime = Date.now() - startTime
      console.log('🎉 Login successful in:', totalTime, 'ms')

      // Return user data and token
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        token
      }

    } catch (error) {
      const totalTime = Date.now() - startTime
      console.log('❌ Login failed after:', totalTime, 'ms')
      console.error('Login error:', error)

      if (error instanceof z.ZodError) {
        return reply.code(400).send({ 
          error: 'Invalid input', 
          details: error.errors 
        })
      }

      if (error.message === 'Database query timeout') {
        return reply.code(500).send({ 
          error: 'Database timeout - please try again' 
        })
      }

      if (error.message === 'Bcrypt timeout') {
        return reply.code(500).send({ 
          error: 'Authentication timeout - please try again' 
        })
      }
      
      fastify.log.error(error)
      return reply.code(500).send({ 
        error: 'Internal server error' 
      })
    }
  })

  // Register endpoint
  fastify.post('/register', async (request, reply) => {
    try {
      const { email, name, password } = registerSchema.parse(request.body)

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        return reply.code(409).send({ 
          error: 'User already exists' 
        })
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10)

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: 'USER'
        }
      })

      // Generate JWT token
      const token = fastify.jwt.sign({
        userId: user.id,
        email: user.email,
        role: user.role
      })

      // Return user data and token
      return reply.code(201).send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        token
      })

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ 
          error: 'Invalid input', 
          details: error.errors 
        })
      }
      
      fastify.log.error(error)
      return reply.code(500).send({ 
        error: 'Internal server error' 
      })
    }
  })

  // Get current user endpoint (protected)
  fastify.get('/me', {
    preHandler: async (request, reply) => {
      try {
        await request.jwtVerify()
      } catch (err) {
        reply.send(err)
      }
    }
  }, async (request, reply) => {
    const { userId } = request.user as any

    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    if (!user || !user.isActive) {
      return reply.code(404).send({ error: 'User not found' })
    }

    return { user }
  })

  // Logout endpoint (just for completeness - JWT is stateless)
  fastify.post('/logout', async (request, reply) => {
    return { message: 'Logged out successfully' }
  })
}