import { ScraperConfig } from '@repo/database'
import { ScrapedProduct } from '@repo/shared'
import { BaseScraper } from '../lib/base-scraper'

export class AliExpressScraper extends BaseScraper {
  async scrape(config: ScraperConfig): Promise<ScrapedProduct[]> {
    console.log('AliExpress scraper not implemented yet')
    return []
  }
}