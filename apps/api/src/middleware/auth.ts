import { FastifyRequest, FastifyReply } from 'fastify'
import { UserRole } from '@repo/database'

export interface AuthUser {
  userId: string
  email: string
  role: UserRole
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch (err) {
    return reply.code(401).send({ error: 'Unauthorized' })
  }
}

export function authorize(...roles: UserRole[]) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify()
      const user = request.user as AuthUser
      
      if (!roles.includes(user.role)) {
        return reply.code(403).send({ error: 'Forbidden: insufficient permissions' })
      }
    } catch (err) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }
  }
}

export function optionalAuth(request: FastifyRequest, reply: FastifyReply, done: Function) {
  const authHeader = request.headers.authorization
  
  if (!authHeader) {
    done()
    return
  }
  
  request.jwtVerify()
    .then(() => done())
    .catch(() => done())
}