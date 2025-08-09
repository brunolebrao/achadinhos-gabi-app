# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Achadinhos da Gabi is an affiliate marketing system for sharing promotions and deals via WhatsApp. It's built as a Turborepo monorepo with TypeScript throughout.

## Essential Commands

### Development
```bash
# Install all dependencies (use pnpm)
pnpm install

# Generate Prisma client (run after schema changes)
cd packages/database && pnpm prisma generate

# Run all applications
pnpm dev

# Run specific application
pnpm dev --filter=api      # API on port 3001
pnpm dev --filter=scraper  # Scraper service
pnpm dev --filter=web      # Web dashboard on port 3000

# Database operations
pnpm db:push      # Sync schema with database
pnpm db:generate  # Generate Prisma client
pnpm db:migrate   # Run migrations
```

### Code Quality
```bash
pnpm lint         # Run ESLint on all packages
pnpm check-types  # TypeScript type checking
pnpm format       # Format with Prettier
```

### Building
```bash
pnpm build        # Build all applications
pnpm build --filter=api  # Build specific app
```

## Architecture Overview

### Monorepo Structure
The project uses Turborepo with workspace packages. Key architectural decisions:

1. **Shared Dependencies**: All apps import from workspace packages using `@repo/*` aliases
2. **Database Access**: All database operations go through `@repo/database` which exports the Prisma client singleton
3. **Type Safety**: Shared types are in `@repo/shared` to ensure consistency across apps

### API Architecture (apps/api)
- **Framework**: Fastify with modular route registration
- **Routes Pattern**: Each route file exports a default async function that receives the Fastify instance
- **Validation**: Zod schemas for request/response validation
- **Database**: Direct Prisma client usage, no ORM abstractions
- **Authentication**: JWT ready but not implemented (see `server.ts:27-29`)

### Scraper Architecture (apps/scraper)
- **Pattern**: Strategy pattern with `BaseScraper` abstract class
- **Scheduling**: Cron-based with database-stored configurations
- **Execution Flow**:
  1. ScraperManager checks database for pending runs
  2. Creates execution record before starting
  3. Runs scraper with retry logic
  4. Updates product prices and creates history records
  5. Generates affiliate URLs based on environment variables

### Database Design
Key relationships to understand:
- **Product**: Central entity with price history tracking
- **ScraperConfig**: Stores scraping rules and schedules (cron expressions)
- **ScheduledMessage**: Queue for WhatsApp messages with status tracking
- **Template**: Message templates with variable substitution (`{{variable}}` format)
- **Contact/Group**: WhatsApp recipients with many-to-many relationship

### Integration Points

1. **Affiliate URL Generation**: 
   - Handled in `ScraperManager.generateAffiliateUrl()`
   - Each platform has specific URL parameter format
   - Requires environment variables for affiliate IDs

2. **Price Tracking**:
   - Scrapers check for existing products by `productUrl`
   - Price changes create `PriceHistory` records
   - Only new products increment the `productsAdded` counter

3. **Message Queue**:
   - Messages scheduled via API are stored with `PENDING` status
   - External service should poll `/api/messages/queue` endpoint
   - Status updates track delivery

## Environment Configuration

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: For API authentication (not yet implemented)
- Platform affiliate IDs: `MERCADOLIVRE_AFFILIATE_ID`, `SHOPEE_AFFILIATE_ID`, etc.

## Development Patterns

### API Route Structure
```typescript
// Standard route file pattern
export default async function routeName(fastify: FastifyInstance) {
  // GET /resource
  fastify.get('/', async (request, reply) => {
    const filters = schema.parse(request.query)
    // Direct Prisma usage
  })
  
  // POST /resource
  fastify.post('/', async (request, reply) => {
    const data = schema.parse(request.body)
    // Validation then creation
  })
}
```

### Scraper Implementation
New scrapers must:
1. Extend `BaseScraper`
2. Implement `scrape(config: ScraperConfig): Promise<ScrapedProduct[]>`
3. Handle pagination and rate limiting
4. Use provided utility methods (`fetchHTML`, `parseHTML`, `extractPrice`)

## Current Implementation Status

### Completed
- Full API with all CRUD operations
- Database schema and relationships  
- Mercado Livre scraper
- Scraper scheduling system
- Basic project structure

### Not Implemented
- Authentication/authorization
- WhatsApp integration (`@repo/whatsapp` package)
- Web dashboard (`apps/web` has only boilerplate)
- Scrapers for Shopee, Amazon, AliExpress
- Actual message sending
- Affiliate link click tracking endpoint