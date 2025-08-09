import { ScraperConfig } from '@repo/database'
import { ScrapedProduct } from '@repo/shared'
import { BaseScraper } from '../lib/base-scraper'

export class AmazonScraper extends BaseScraper {
  async scrape(config: ScraperConfig): Promise<ScrapedProduct[]> {
    console.log('Amazon scraper not implemented yet')
    return []
  }
}