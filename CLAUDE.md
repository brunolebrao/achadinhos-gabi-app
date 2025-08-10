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

# Setup Chrome/Puppeteer (required for WhatsApp integration)
pnpm setup:chrome

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

### Chrome/Puppeteer Setup
```bash
# Complete setup (dependencies + Prisma + Chrome)
pnpm setup

# Chrome setup only
pnpm setup:chrome

# Chrome dependencies only (Linux/macOS)
pnpm setup:deps
# or
./install-chrome-deps.sh
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

## Troubleshooting

### Instagram Connection Issues

If Instagram integration is not working:

1. **Validate Setup (Automated)**:
   ```bash
   pnpm validate:instagram
   ```

2. **Manual Checklist**:
   - ✅ Environment variables configured (`INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `INSTAGRAM_CALLBACK_URL`)
   - ✅ Facebook App created at https://developers.facebook.com/
   - ✅ Instagram Basic Display product added to Facebook App  
   - ✅ Valid OAuth Redirect URI configured: `http://localhost:3001/api/auth/instagram/oauth/callback`
   - ✅ Instagram account connected to a Facebook Page (Business/Creator account required)

3. **Common Issues & Solutions**:
   - **"No Instagram Business Account found"**: Connect your Instagram to a Facebook Page and switch to Business/Creator account
   - **"Invalid redirect URI"**: Ensure callback URL matches exactly in Facebook App settings
   - **"App not configured"**: Verify App ID and Secret are correct in environment variables
   - **CORS errors**: Check `CORS_ORIGIN` is set to `http://localhost:3000`

4. **Development vs Production**:
   - Development: Use test users and sandbox mode
   - Production: Submit app for review to get permissions approved

### Chrome/Puppeteer Issues

If you encounter "Chrome dependencies not installed" or "Failed to launch browser" errors:

1. **Quick Fix (Automatic)**:
   ```bash
   pnpm setup:chrome
   ```

2. **Manual Fix (Step by Step)**:
   ```bash
   # Install Chrome dependencies
   ./install-chrome-deps.sh
   
   # Or install Chrome manually:
   # macOS: brew install --cask google-chrome
   # Ubuntu/Debian: wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
   # CentOS/RHEL: sudo dnf install https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm
   ```

3. **System-specific Solutions**:
   - **macOS**: Chrome auto-detected at `/Applications/Google Chrome.app`
   - **Linux**: Uses system Chrome or falls back to Puppeteer bundled Chrome
   - **Windows**: Manual installation required from https://www.google.com/chrome/

4. **Configuration Details**:
   - Chrome detection is handled automatically by `ChromeDetector` class
   - Configuration is dynamic based on detected system and Chrome installation
   - No more hardcoded Chrome paths - fully cross-platform compatible

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