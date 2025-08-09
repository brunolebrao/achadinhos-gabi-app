# ================================
# MULTI-STAGE BUILD FOR PRODUCTION
# ================================

# ================
# BASE STAGE
# ================
FROM node:18-alpine AS base

# Install system dependencies for Puppeteer and Node.js
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dumb-init \
    python3 \
    make \
    g++

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# ================
# DEPENDENCIES STAGE
# ================
FROM base AS deps

# Install pnpm
RUN npm install -g pnpm@8

# Install dependencies
COPY . .
RUN pnpm install --frozen-lockfile --prod=false

# ================
# BUILD STAGE
# ================
FROM base AS builder

# Install pnpm
RUN npm install -g pnpm@8

# Copy source code and dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN pnpm -w run db:generate

# Build the application
RUN pnpm --filter=@achadinhos/api build

# ================
# PRODUCTION STAGE
# ================
FROM base AS runner

# Set environment to production
ENV NODE_ENV=production

# Create necessary directories
RUN mkdir -p /app/sessions && chown -R nodejs:nodejs /app/sessions
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/packages ./packages

# Copy Prisma schema and generated client
COPY --from=builder --chown=nodejs:nodejs /app/packages/database/prisma ./prisma

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { \
    if (res.statusCode === 200) process.exit(0); else process.exit(1); \
  }).on('error', () => process.exit(1))"

# Start the application
CMD ["dumb-init", "node", "dist/server.js"]