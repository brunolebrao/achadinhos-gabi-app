import winston from 'winston'
import path from 'path'
import fs from 'fs'

// Create logs directory
const logsDir = path.join(process.cwd(), 'apps/scraper/logs')

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

// Custom format for console output with colors
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let output = `[${timestamp}] ${level}: ${message}`
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      // Format specific fields for better readability
      if (meta.scraper) output += ` | 🤖 ${meta.scraper}`
      if (meta.platform) output += ` | 📱 ${meta.platform}`
      if (meta.keyword) output += ` | 🔍 "${meta.keyword}"`
      if (meta.category) output += ` | 📂 ${meta.category}`
      if (meta.products) output += ` | 📦 ${meta.products} produtos`
      if (meta.progress) output += ` | ${meta.progress}`
      if (meta.duration) output += ` | ⏱️ ${meta.duration}`
      if (meta.error) output += ` | ❌ ${meta.error}`
      
      // Add any remaining metadata
      const displayedKeys = ['scraper', 'platform', 'keyword', 'category', 'products', 'progress', 'duration', 'error']
      const remainingMeta = Object.keys(meta)
        .filter(key => !displayedKeys.includes(key))
        .reduce((obj, key) => ({ ...obj, [key]: meta[key] }), {})
      
      if (Object.keys(remainingMeta).length > 0) {
        output += ` | ${JSON.stringify(remainingMeta)}`
      }
    }
    
    return output
  })
)

// JSON format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
  winston.format.prettyPrint()
)

// Configure logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: consoleFormat
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'scraper.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Separate file for errors
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
})

// Helper functions for common log scenarios
export const logScraperStart = (scraperName: string, platform: string) => {
  logger.info('🚀 Iniciando scraper', { 
    scraper: scraperName, 
    platform,
    timestamp: new Date().toISOString()
  })
}

export const logScraperProgress = (scraperName: string, current: number, total: number, message?: string) => {
  const percentage = Math.round((current / total) * 100)
  logger.info(message || 'Progresso do scraper', {
    scraper: scraperName,
    progress: `${current}/${total} (${percentage}%)`,
    percentage
  })
}

export const logProductFound = (scraperName: string, product: any) => {
  logger.debug('✅ Produto encontrado', {
    scraper: scraperName,
    title: product.title?.substring(0, 50) + '...',
    price: product.price,
    discount: product.discount
  })
}

export const logScraperComplete = (scraperName: string, stats: any) => {
  const duration = stats.duration ? `${(stats.duration / 1000).toFixed(2)}s` : 'N/A'
  logger.info('✨ Scraper concluído', {
    scraper: scraperName,
    products: stats.productsFound,
    added: stats.productsAdded,
    duration,
    success: true
  })
}

export const logScraperError = (scraperName: string, error: any, context?: any) => {
  logger.error('❌ Erro no scraper', {
    scraper: scraperName,
    error: error.message || error,
    stack: error.stack,
    context
  })
}

export const logKeywordSearch = (scraperName: string, keyword: string, resultCount: number) => {
  logger.info('🔍 Busca por palavra-chave', {
    scraper: scraperName,
    keyword,
    products: resultCount
  })
}

export const logCategorySearch = (scraperName: string, category: string, resultCount: number) => {
  logger.info('📂 Busca por categoria', {
    scraper: scraperName,
    category,
    products: resultCount
  })
}

export const logRateLimit = (scraperName: string, delay: number) => {
  logger.warn('⏸️ Rate limit - aguardando', {
    scraper: scraperName,
    delay: `${delay}ms`
  })
}

export default logger