export interface WhatsAppTemplate {
  id: string
  name: string
  description: string
  template: string
  variables: string[]
  category: 'product' | 'offer' | 'alert' | 'custom'
}

export const defaultTemplates: WhatsAppTemplate[] = [
  {
    id: 'single-product',
    name: 'Produto Individual',
    description: 'Template para enviar um único produto',
    category: 'product',
    variables: ['title', 'price', 'originalPrice', 'discount', 'url'],
    template: `🛍️ *{{title}}*

💰 De: ~R$ {{originalPrice}}~
✨ Por: *R$ {{price}}*
🎯 Economia: {{discount}}

🔗 {{url}}

_Aproveite essa oferta imperdível!_`
  },
  
  {
    id: 'flash-sale',
    name: 'Oferta Relâmpago',
    description: 'Template para ofertas com tempo limitado',
    category: 'offer',
    variables: ['title', 'price', 'discount', 'url', 'platform'],
    template: `⚡ *OFERTA RELÂMPAGO* ⚡

🔥 *{{title}}*

💥 *{{discount}} DE DESCONTO!*
💵 Apenas *R$ {{price}}*

📍 Plataforma: {{platform}}
🔗 {{url}}

⏰ *Corre que é por tempo limitado!*`
  },
  
  {
    id: 'daily-deals',
    name: 'Ofertas do Dia',
    description: 'Lista de ofertas diárias',
    category: 'offer',
    variables: ['products', 'date'],
    template: `🌟 *OFERTAS DO DIA {{date}}* 🌟

{{products}}

📲 *Não perca essas oportunidades!*
_Compartilhe com seus amigos_`
  },
  
  {
    id: 'price-drop',
    name: 'Alerta de Preço',
    description: 'Notificação de queda de preço',
    category: 'alert',
    variables: ['title', 'oldPrice', 'newPrice', 'difference', 'url'],
    template: `🚨 *ALERTA DE PREÇO!* 🚨

📉 O produto que você acompanha baixou de preço!

📦 *{{title}}*

❌ Preço anterior: R$ {{oldPrice}}
✅ Preço atual: *R$ {{newPrice}}*
💰 Economia: R$ {{difference}}

🔗 {{url}}

_Aproveite antes que acabe!_`
  },
  
  {
    id: 'weekend-special',
    name: 'Especial de Final de Semana',
    description: 'Ofertas especiais para o fim de semana',
    category: 'offer',
    variables: ['products', 'validUntil'],
    template: `🎉 *ESPECIAL DE FIM DE SEMANA* 🎉

🛒 Selecionamos as melhores ofertas para você:

{{products}}

⏳ *Válido até: {{validUntil}}*

💡 Dica: Use o cupom *FIMDESEMANA* para desconto extra!`
  },
  
  {
    id: 'cupom-alert',
    name: 'Alerta de Cupom',
    description: 'Notificação de cupom disponível',
    category: 'alert',
    variables: ['store', 'cupomCode', 'discount', 'description', 'validUntil'],
    template: `🎫 *CUPOM DISPONÍVEL!* 🎫

🏪 Loja: *{{store}}*
🏷️ Código: *{{cupomCode}}*
💸 Desconto: *{{discount}}*

📝 {{description}}

⏰ Válido até: {{validUntil}}

_Copie o código e aproveite!_`
  },
  
  {
    id: 'black-friday',
    name: 'Black Friday',
    description: 'Template especial para Black Friday',
    category: 'offer',
    variables: ['title', 'price', 'discount', 'url'],
    template: `⚫ *BLACK FRIDAY CHEGOU!* ⚫

🔥🔥🔥 *MEGA OFERTA* 🔥🔥🔥

📦 *{{title}}*

💣 *{{discount}} OFF*
💰 Por apenas: *R$ {{price}}*

🛒 {{url}}

🏃‍♂️ *CORRE! Estoque limitado!*`
  },
  
  {
    id: 'comparison',
    name: 'Comparação de Preços',
    description: 'Compara preços entre plataformas',
    category: 'product',
    variables: ['title', 'mlPrice', 'shopeePrice', 'amazonPrice', 'bestPrice', 'bestPlatform', 'url'],
    template: `📊 *COMPARAÇÃO DE PREÇOS*

📦 *{{title}}*

💰 Preços por plataforma:
• Mercado Livre: R$ {{mlPrice}}
• Shopee: R$ {{shopeePrice}}
• Amazon: R$ {{amazonPrice}}

✅ *Melhor preço: R$ {{bestPrice}} ({{bestPlatform}})*

🔗 {{url}}

_Economize comprando no lugar certo!_`
  },
  
  {
    id: 'minimal',
    name: 'Minimalista',
    description: 'Template simples e direto',
    category: 'product',
    variables: ['title', 'price', 'url'],
    template: `{{title}}
R$ {{price}}
{{url}}`
  },
  
  {
    id: 'premium',
    name: 'Premium Detalhado',
    description: 'Template com todas as informações',
    category: 'product',
    variables: ['title', 'description', 'price', 'originalPrice', 'discount', 'platform', 'category', 'rating', 'reviews', 'url'],
    template: `🏆 *OFERTA PREMIUM* 🏆

📦 *{{title}}*

📝 {{description}}

💰 Preço Original: ~R$ {{originalPrice}}~
✨ Preço Especial: *R$ {{price}}*
🎯 Desconto: *{{discount}}*

📊 Detalhes:
• Plataforma: {{platform}}
• Categoria: {{category}}
• Avaliação: ⭐ {{rating}}/5 ({{reviews}} avaliações)

🔗 {{url}}

💎 _Qualidade garantida!_`
  }
]

export class TemplateEngine {
  private templates: Map<string, WhatsAppTemplate> = new Map()
  
  constructor() {
    // Load default templates
    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template)
    })
  }
  
  getTemplate(id: string): WhatsAppTemplate | undefined {
    return this.templates.get(id)
  }
  
  getAllTemplates(): WhatsAppTemplate[] {
    return Array.from(this.templates.values())
  }
  
  getTemplatesByCategory(category: string): WhatsAppTemplate[] {
    return this.getAllTemplates().filter(t => t.category === category)
  }
  
  addTemplate(template: WhatsAppTemplate): void {
    this.templates.set(template.id, template)
  }
  
  removeTemplate(id: string): boolean {
    return this.templates.delete(id)
  }
  
  renderTemplate(templateId: string, data: Record<string, any>): string {
    const template = this.getTemplate(templateId)
    if (!template) {
      throw new Error(`Template ${templateId} not found`)
    }
    
    let rendered = template.template
    
    // Replace all variables
    for (const variable of template.variables) {
      const value = data[variable] || ''
      const regex = new RegExp(`{{${variable}}}`, 'g')
      rendered = rendered.replace(regex, String(value))
    }
    
    return rendered
  }
  
  renderProductList(products: Array<{title: string, price: number, discount?: string, url: string}>): string {
    const items = products.map((product, index) => {
      return `${index + 1}. *${product.title}*
   💰 R$ ${product.price.toFixed(2)} ${product.discount ? `(${product.discount})` : ''}
   🔗 ${product.url}`
    }).join('\n\n')
    
    return items
  }
  
  formatPrice(price: number): string {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }
  
  shortenUrl(url: string): string {
    // This will be replaced with actual URL shortener
    return url.length > 50 ? url.substring(0, 47) + '...' : url
  }
}