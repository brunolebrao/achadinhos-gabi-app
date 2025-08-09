#!/usr/bin/env tsx

import { writeFileSync } from 'fs'
import axios from 'axios'
import * as cheerio from 'cheerio'

async function debugScraper() {
  console.log('🔍 Debugging Mercado Livre HTML structure...\n')

  try {
    // Test simple search without filters first
    const searchUrl = 'https://lista.mercadolivre.com.br/iphone'
    console.log(`Fetching: ${searchUrl}\n`)
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    })

    const html = response.data
    const $ = cheerio.load(html)
    
    // Save HTML for inspection
    writeFileSync('/tmp/mercadolivre-debug.html', html)
    console.log('📄 HTML saved to /tmp/mercadolivre-debug.html\n')

    // Try to find product containers
    const selectors = [
      '.ui-search-layout__item',
      '.ui-search-result__wrapper',
      'li.ui-search-layout__item',
      '.ui-search-result',
      '[class*="search-result"]',
      '[class*="search-item"]',
      'article',
      '.andes-card',
      '[data-testid*="item"]',
      '[data-testid*="product"]'
    ]

    console.log('🔎 Testing selectors:\n')
    for (const selector of selectors) {
      const count = $(selector).length
      if (count > 0) {
        console.log(`✅ ${selector}: ${count} items found`)
        
        // Show first item structure
        if (count > 0) {
          const firstItem = $(selector).first()
          console.log('\n  First item HTML preview:')
          const itemHtml = firstItem.html()
          if (itemHtml) {
            console.log('  ' + itemHtml.substring(0, 500) + '...\n')
          }
        }
      } else {
        console.log(`❌ ${selector}: 0 items`)
      }
    }

    // Try to extract data from first product
    console.log('\n📦 Attempting to extract first product data:\n')
    
    // Find any element that looks like a product
    const productElements = $('*').filter((i, el) => {
      const text = $(el).text()
      const classes = $(el).attr('class') || ''
      return classes.includes('search') && classes.includes('item') && text.includes('R$')
    })

    console.log(`Found ${productElements.length} potential product elements\n`)

    if (productElements.length > 0) {
      const firstProduct = productElements.first()
      
      // Try to extract title
      const titleSelectors = ['h2', 'h3', '.title', '[class*="title"]', 'a']
      for (const selector of titleSelectors) {
        const title = firstProduct.find(selector).first().text().trim()
        if (title && title.length > 10) {
          console.log(`📝 Title (${selector}): ${title.substring(0, 80)}...`)
          break
        }
      }

      // Try to extract price
      const priceSelectors = ['[class*="price"]', '[class*="amount"]', 'span']
      for (const selector of priceSelectors) {
        const priceElement = firstProduct.find(selector).filter((i, el) => {
          return $(el).text().includes('R$')
        }).first()
        
        if (priceElement.length) {
          console.log(`💰 Price (${selector}): ${priceElement.text().trim()}`)
          break
        }
      }

      // Try to extract link
      const link = firstProduct.find('a').first().attr('href')
      if (link) {
        console.log(`🔗 Link: ${link.substring(0, 80)}...`)
      }
    }

    // Check page structure
    console.log('\n📋 Page structure analysis:\n')
    console.log(`Total elements: ${$('*').length}`)
    console.log(`Links: ${$('a').length}`)
    console.log(`Images: ${$('img').length}`)
    console.log(`Elements with "search": ${$('[class*="search"]').length}`)
    console.log(`Elements with "item": ${$('[class*="item"]').length}`)
    console.log(`Elements with "product": ${$('[class*="product"]').length}`)
    console.log(`Elements with "result": ${$('[class*="result"]').length}`)

  } catch (error) {
    console.error('❌ Debug failed:', error)
    if (axios.isAxiosError(error)) {
      console.error('Response status:', error.response?.status)
      console.error('Response headers:', error.response?.headers)
    }
  }
}

// Run debug
debugScraper()
  .then(() => {
    console.log('\n✨ Debug completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })