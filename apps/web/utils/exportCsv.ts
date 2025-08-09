import { Product } from "../lib/api/types"

export function exportProductsToCsv(products: Product[], filename: string = 'produtos') {
  // Define CSV headers
  const headers = [
    'ID',
    'Título',
    'Categoria',
    'Plataforma',
    'Status',
    'Preço',
    'Preço Original',
    'Desconto',
    'Avaliação',
    'Número de Avaliações',
    'Vendas',
    'URL do Produto',
    'URL de Afiliado',
    'Data de Criação',
    'Data de Atualização'
  ]

  // Convert products to CSV rows
  const rows = products.map(product => {
    const discount = product.originalPrice 
      ? `${Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%`
      : ''

    return [
      product.id,
      `"${product.title.replace(/"/g, '""')}"`, // Escape quotes
      product.category || '',
      product.platform,
      product.status,
      product.price.toFixed(2).replace('.', ','), // Brazilian format
      product.originalPrice ? product.originalPrice.toFixed(2).replace('.', ',') : '',
      discount,
      product.ratings ? product.ratings.toFixed(1).replace('.', ',') : '',
      product.reviewCount || '',
      product.salesCount || '',
      product.productUrl,
      product.affiliateUrl || '',
      new Date(product.createdAt).toLocaleString('pt-BR'),
      new Date(product.updatedAt).toLocaleString('pt-BR')
    ]
  })

  // Combine headers and rows
  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.join(';'))
  ].join('\n')

  // Add BOM for UTF-8 Excel compatibility
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

  // Create download link
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  // Clean up
  URL.revokeObjectURL(url)
}