import { FastifyRequest, FastifyReply } from 'fastify'

export function createTimeoutHandler(timeoutMs: number = 5000) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Set a timeout for the request
    const timeoutId = setTimeout(() => {
      if (!reply.sent) {
        reply.code(504).send({
          error: 'Request timeout',
          message: `Request took longer than ${timeoutMs}ms to complete`,
          timestamp: new Date().toISOString()
        })
      }
    }, timeoutMs)

    // Clear timeout when response is sent
    reply.raw.on('finish', () => {
      clearTimeout(timeoutId)
    })
  }
}

// Specific timeout for health endpoints (shorter)
export const healthTimeout = createTimeoutHandler(3000)

// General API timeout (longer)
export const apiTimeout = createTimeoutHandler(30000)