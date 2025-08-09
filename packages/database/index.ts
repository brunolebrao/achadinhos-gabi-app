export * from '@prisma/client'
export { PrismaClient } from '@prisma/client'

import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

// Configure Prisma with optimized connection pooling
export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  errorFormat: 'minimal'
})

// Set connection pool configuration via connection string
// Add these parameters to your DATABASE_URL:
// ?connection_limit=10&pool_timeout=2&connect_timeout=5&statement_timeout=10000
// Example: postgresql://user:pass@host/db?connection_limit=10&pool_timeout=2

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

// Ensure prisma disconnects on app termination
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})