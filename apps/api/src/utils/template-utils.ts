import { prisma } from '@repo/database'
import { getAffiliateConfig, generateAffiliateUrl as generateAffiliateUrlService } from '../services/affiliate-service'

// Tipos para template e produto
export interface TemplateVariable {
  [key: string]: string
}

export interface ProductForTemplate {
  id: string
  title: string
  price: number
  originalPrice?: number
  discount?: string
  productUrl: string
  imageUrl?: string
  platform: string
  category?: string
  isNew?: boolean
}

// Mapeamento de plataforma para emoji
const platformEmojis: Record<string, string> = {
  'MERCADO_LIVRE': '🛍️',
  'AMAZON': '📦',
  'SHOPEE': '🛒',
  'ALIEXPRESS': '🏪',
  'DEFAULT': '🛍️'
}

// Mapeamento de desconto para emoji
const discountEmojis = {
  high: '🔥🔥🔥', // >50%
  medium: '⚡⚡',  // 30-50%
  low: '💰'       // <30%
}

/**
 * Gera emoji baseado na plataforma
 */
export function getPlatformEmoji(platform: string): string {
  return platformEmojis[platform] || platformEmojis.DEFAULT
}

/**
 * Gera emoji baseado na porcentagem de desconto
 */
export function getDiscountEmoji(discount: string | undefined): string {
  if (!discount) return '💰'
  
  const discountNum = parseInt(discount.replace('%', ''))
  if (discountNum >= 50) return discountEmojis.high
  if (discountNum >= 30) return discountEmojis.medium
  return discountEmojis.low
}

/**
 * Gera texto de urgência baseado no desconto
 */
export function getUrgencyText(discount: string | undefined): string {
  if (!discount) return 'Aproveite!'
  
  const discountNum = parseInt(discount.replace('%', ''))
  if (discountNum >= 50) return 'ÚLTIMAS PEÇAS! Corre que acaba! 🏃‍♂️'
  if (discountNum >= 30) return 'Oferta por tempo limitado! ⏰'
  return 'Boa oportunidade! 👍'
}

/**
 * Gera emoji baseado na categoria do produto
 */
export function getCategoryEmoji(category: string | undefined): string {
  if (!category) return '🛍️'
  
  const categoryLower = category.toLowerCase()
  
  if (categoryLower.includes('eletronic') || categoryLower.includes('celular') || categoryLower.includes('computador')) {
    return '📱💻'
  }
  if (categoryLower.includes('casa') || categoryLower.includes('decoração')) {
    return '🏠🛋️'
  }
  if (categoryLower.includes('moda') || categoryLower.includes('roupa') || categoryLower.includes('beleza')) {
    return '👕👠'
  }
  if (categoryLower.includes('esporte') || categoryLower.includes('fitness')) {
    return '⚽🏃'
  }
  
  return '🛍️'
}

/**
 * Trunca texto preservando palavras completas
 */
export function truncateText(text: string, maxLength: number = 80): string {
  if (text.length <= maxLength) return text
  
  // Trunca no espaço mais próximo antes do limite
  const truncated = text.substring(0, maxLength)
  const lastSpaceIndex = truncated.lastIndexOf(' ')
  
  if (lastSpaceIndex > 0) {
    return truncated.substring(0, lastSpaceIndex) + '...'
  }
  
  return truncated + '...'
}

/**
 * Formata URL longa para versão curta
 */
export function formatShortUrl(url: string): string {
  // Por enquanto, retorna uma versão simplificada
  // TODO: Implementar encurtador real (bit.ly, etc)
  
  if (url.includes('mercadolivre')) {
    return '🛒 Ver no Mercado Livre'
  } else if (url.includes('shopee')) {
    return '🛒 Ver na Shopee'
  } else if (url.includes('amazon')) {
    return '📦 Ver na Amazon'
  } else if (url.includes('aliexpress')) {
    return '🏪 Ver no AliExpress'
  }
  
  return '🔗 Ver produto'
}

/**
 * Gera link afiliado com tracking
 * Agora busca configuração do banco de dados ao invés do .env
 */
export async function generateAffiliateUrl(produto: ProductForTemplate): Promise<string> {
  const url = produto.productUrl
  const platform = produto.platform.toUpperCase()
  
  // Busca configuração do banco
  const config = await getAffiliateConfig()
  
  if (!config) {
    console.log(`[Affiliate] No affiliate configuration found`)
    return url
  }
  
  // Mapeia os IDs por plataforma
  const affiliateIds: Record<string, string | null | undefined> = {
    MERCADO_LIVRE: config.mercadolivreId,
    MERCADOLIVRE: config.mercadolivreId,
    SHOPEE: config.shopeeId,
    AMAZON: config.amazonTag,
    ALIEXPRESS: config.aliexpressId
  }
  
  const affiliateId = affiliateIds[platform]
  
  // Usa o serviço para gerar a URL
  return generateAffiliateUrlService(url, platform, affiliateId)
}

/**
 * Mapeia produto para variáveis de template
 */
export async function mapProductToVariables(produto: ProductForTemplate): Promise<TemplateVariable> {
  // Formatar preços em reais
  const formatPrice = (price: number) => `R$ ${price.toFixed(2).replace('.', ',')}`
  
  // Gerar URL de afiliado (agora é assíncrono)
  const affiliateUrl = await generateAffiliateUrl(produto)
  
  return {
    // Variáveis básicas
    product_name: produto.title,
    product_name_short: truncateText(produto.title, 60), // Versão curta do título
    price: formatPrice(produto.price),
    original_price: produto.originalPrice ? formatPrice(produto.originalPrice) : formatPrice(produto.price),
    discount: produto.discount || '0%',
    product_link: affiliateUrl, // Link com afiliado
    
    // Variáveis de link
    affiliate_url: affiliateUrl, // Link com afiliado
    short_link: formatShortUrl(produto.productUrl), // Link formatado curto
    full_link: affiliateUrl, // Link completo com afiliado
    
    // Imagem do produto
    product_image: produto.imageUrl || '',
    has_image: produto.imageUrl ? 'true' : 'false',
    
    // Emojis e elementos visuais
    platform_emoji: getPlatformEmoji(produto.platform),
    discount_emoji: getDiscountEmoji(produto.discount),
    category_emoji: getCategoryEmoji(produto.category),
    
    // Textos dinâmicos
    urgency_text: getUrgencyText(produto.discount),
    
    // Metadados
    platform: produto.platform,
    category: produto.category || 'Geral',
    
    // Elementos de formatação
    line_break: '\n',
    double_line_break: '\n\n',
    separator: '━━━━━━━━━━━━━━━',
    dots: '• • • • •'
  }
}

/**
 * Renderiza template com variáveis
 */
export function renderTemplate(content: string, variables: TemplateVariable): string {
  let renderedContent = content
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g')
    renderedContent = renderedContent.replace(regex, value)
  })
  
  return renderedContent
}

/**
 * Renderiza template com produto específico
 */
export async function renderTemplateWithProduct(templateContent: string, produto: ProductForTemplate): Promise<string> {
  const variables = await mapProductToVariables(produto)
  return renderTemplate(templateContent, variables)
}

/**
 * Sugere melhor template baseado no produto
 */
export async function suggestTemplate(produto: ProductForTemplate): Promise<string> {
  const discount = produto.discount ? parseInt(produto.discount.replace('%', '')) : 0
  
  // Lógica de sugestão
  if (discount >= 50) {
    // Busca template para super ofertas
    const template = await prisma.template.findFirst({
      where: { 
        category: 'super-oferta',
        isActive: true 
      }
    })
    if (template) return template.id
  }
  
  if (discount >= 30) {
    // Busca template de promoção flash
    const template = await prisma.template.findFirst({
      where: { 
        category: 'promocao',
        isActive: true 
      }
    })
    if (template) return template.id
  }
  
  if (produto.isNew) {
    // Busca template de produto novo
    const template = await prisma.template.findFirst({
      where: { 
        category: 'produto',
        isActive: true 
      }
    })
    if (template) return template.id
  }
  
  // Template padrão
  const defaultTemplate = await prisma.template.findFirst({
    where: { 
      isDefault: true,
      isActive: true 
    }
  })
  
  return defaultTemplate?.id || ''
}

/**
 * Valida se template tem todas as variáveis necessárias
 */
export function validateTemplate(templateContent: string, availableVariables: TemplateVariable): {
  valid: boolean
  missingVariables: string[]
  unusedVariables: string[]
} {
  // Encontra todas as variáveis no template
  const templateVariableMatches = templateContent.match(/{{(\w+)}}/g) || []
  const templateVariables = templateVariableMatches.map(match => 
    match.replace('{{', '').replace('}}', '')
  )
  
  // Variáveis únicas no template
  const uniqueTemplateVars = [...new Set(templateVariables)]
  
  // Verifica variáveis faltando
  const missingVariables = uniqueTemplateVars.filter(
    templateVar => !availableVariables[templateVar]
  )
  
  // Verifica variáveis não utilizadas
  const unusedVariables = Object.keys(availableVariables).filter(
    availableVar => !uniqueTemplateVars.includes(availableVar)
  )
  
  return {
    valid: missingVariables.length === 0,
    missingVariables,
    unusedVariables
  }
}

/**
 * Retorna todas as variáveis disponíveis para um produto
 */
export async function getAvailableVariables(produto: ProductForTemplate): Promise<TemplateVariable> {
  return mapProductToVariables(produto)
}