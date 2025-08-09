import { prisma } from '@repo/database'

// Cache simples para evitar múltiplas queries ao banco
const configCache = new Map<string, { config: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

export async function getAffiliateConfig(userId?: string) {
  // Se não tiver userId, tenta pegar a configuração padrão (primeiro admin)
  if (!userId) {
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })
    if (adminUser) {
      userId = adminUser.id
    } else {
      return null
    }
  }

  // Verifica cache
  const cached = configCache.get(userId)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.config
  }

  // Busca no banco
  const config = await prisma.affiliateConfig.findUnique({
    where: { userId }
  })

  // Atualiza cache
  if (config) {
    configCache.set(userId, { config, timestamp: Date.now() })
  }

  return config
}

export function clearAffiliateConfigCache(userId?: string) {
  if (userId) {
    configCache.delete(userId)
  } else {
    configCache.clear()
  }
}

export function generateAffiliateUrl(
  url: string,
  platform: string,
  affiliateId?: string | null
): string {
  if (!affiliateId) {
    console.log(`[Affiliate] No affiliate ID configured for ${platform}`)
    return url
  }

  try {
    // Separa a URL do fragmento (#)
    const [baseUrl, fragment] = url.split('#')
    const urlObj = new URL(baseUrl)
    
    // Remove tracking_id existente se houver
    urlObj.searchParams.delete('tracking_id')
    // Remove source existente se houver
    urlObj.searchParams.delete('source')
    
    switch (platform.toUpperCase()) {
      case 'MERCADO_LIVRE':
      case 'MERCADOLIVRE':
        // Define nosso tracking_id (substitui qualquer existente)
        urlObj.searchParams.set('tracking_id', affiliateId)
        urlObj.searchParams.set('source', 'affiliate-profile')
        break
        
      case 'SHOPEE':
        urlObj.searchParams.delete('af_id')
        urlObj.searchParams.set('af_id', affiliateId)
        urlObj.searchParams.set('af_type', 'cashback')
        break
        
      case 'AMAZON':
        urlObj.searchParams.delete('tag')
        urlObj.searchParams.set('tag', affiliateId)
        break
        
      case 'ALIEXPRESS':
        urlObj.searchParams.delete('aff_fcid')
        urlObj.searchParams.set('aff_fcid', affiliateId)
        urlObj.searchParams.set('aff_platform', 'promotion')
        break
    }
    
    // Reconstrói a URL com o fragmento se existir
    let finalUrl = urlObj.toString()
    if (fragment) {
      finalUrl += '#' + fragment
    }
    
    console.log(`[Affiliate] Generated URL for ${platform}: ${finalUrl}`)
    return finalUrl
    
  } catch (error) {
    console.error(`[Affiliate] Error generating affiliate URL:`, error)
    return url
  }
}