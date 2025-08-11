import cliProgress from 'cli-progress'
import chalk from 'chalk'
import ora from 'ora'

// Progress bar for scraping operations
export class ScraperProgress {
  private bar: cliProgress.SingleBar | null = null
  private spinner: any = null
  private startTime: number = 0
  private currentScraper: string = ''
  
  constructor() {
    // Create a fancy progress bar
    this.bar = new cliProgress.SingleBar({
      format: chalk.cyan('{bar}') + ' | {percentage}% | {value}/{total} produtos | {duration}s | {status}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
      clearOnComplete: false,
      stopOnComplete: true
    }, cliProgress.Presets.shades_classic)
  }
  
  startScraper(scraperName: string, total: number) {
    this.currentScraper = scraperName
    this.startTime = Date.now()
    
    console.log(chalk.bold.blue(`\n🤖 ${scraperName}`))
    console.log(chalk.gray('━'.repeat(60)))
    
    if (this.bar && total > 0) {
      this.bar.start(total, 0, {
        status: 'Iniciando...',
        duration: 0
      })
    }
  }
  
  updateProgress(current: number, status?: string) {
    if (this.bar) {
      const duration = Math.round((Date.now() - this.startTime) / 1000)
      this.bar.update(current, {
        status: status || 'Processando...',
        duration
      })
    }
  }
  
  incrementProgress(status?: string) {
    if (this.bar) {
      const duration = Math.round((Date.now() - this.startTime) / 1000)
      this.bar.increment({
        status: status || 'Processando...',
        duration
      })
    }
  }
  
  stopScraper(success: boolean = true, message?: string) {
    if (this.bar) {
      this.bar.stop()
    }
    
    const duration = Math.round((Date.now() - this.startTime) / 1000)
    
    if (success) {
      console.log(chalk.green(`✅ ${message || 'Concluído'} (${duration}s)`))
    } else {
      console.log(chalk.red(`❌ ${message || 'Falhou'} (${duration}s)`))
    }
    
    console.log(chalk.gray('━'.repeat(60)) + '\n')
  }
  
  showSpinner(text: string) {
    this.hideSpinner()
    this.spinner = ora({
      text,
      spinner: 'dots'
    }).start()
  }
  
  updateSpinner(text: string, color?: string) {
    if (this.spinner) {
      this.spinner.text = text
      if (color) {
        this.spinner.color = color as any
      }
    }
  }
  
  hideSpinner(success?: boolean, text?: string) {
    if (this.spinner) {
      if (success === true) {
        this.spinner.succeed(text)
      } else if (success === false) {
        this.spinner.fail(text)
      } else {
        this.spinner.stop()
      }
      this.spinner = null
    }
  }
  
  // Display statistics
  showStats(stats: {
    totalProducts: number
    newProducts: number
    updatedProducts: number
    errors: number
    duration: number
  }) {
    console.log(chalk.bold.yellow('\n📊 Estatísticas da Execução'))
    console.log(chalk.gray('━'.repeat(60)))
    
    const table = [
      ['Total de Produtos', chalk.cyan(stats.totalProducts)],
      ['Novos Produtos', chalk.green(stats.newProducts)],
      ['Produtos Atualizados', chalk.blue(stats.updatedProducts)],
      ['Erros', stats.errors > 0 ? chalk.red(stats.errors) : chalk.gray(0)],
      ['Tempo Total', chalk.magenta(`${stats.duration}s`)]
    ]
    
    table.forEach(([label, value]) => {
      console.log(`  ${chalk.gray('▸')} ${label?.padEnd(20)} ${value}`)
    })
    
    console.log(chalk.gray('━'.repeat(60)) + '\n')
  }
  
  // Show detailed product info
  showProduct(product: {
    title: string
    price: number
    discount?: string
    platform: string
  }) {
    const priceFormatted = `R$ ${product.price.toFixed(2)}`
    const discountText = product.discount ? chalk.red(` (${product.discount})`) : ''
    
    console.log(
      chalk.gray('  ▸ ') + 
      chalk.white(product.title.substring(0, 50) + '...') +
      chalk.gray(' | ') +
      chalk.green(priceFormatted) +
      discountText
    )
  }
  
  // Show error with context
  showError(error: string, context?: any) {
    console.log(chalk.red.bold('\n⚠️ Erro'))
    console.log(chalk.red(`  ${error}`))
    if (context) {
      console.log(chalk.gray(`  Contexto: ${JSON.stringify(context, null, 2)}`))
    }
  }
  
  // Show warning
  showWarning(message: string) {
    console.log(chalk.yellow(`⚠️ ${message}`))
  }
  
  // Show info message
  showInfo(message: string) {
    console.log(chalk.blue(`ℹ️ ${message}`))
  }
  
  // Show success message
  showSuccess(message: string) {
    console.log(chalk.green(`✅ ${message}`))
  }
  
  // Create section header
  showSection(title: string, emoji?: string) {
    console.log('\n' + chalk.bold.cyan(`${emoji || '📌'} ${title}`))
    console.log(chalk.gray('─'.repeat(50)))
  }
  
  // Show key-value pairs
  showDetails(details: Record<string, any>) {
    Object.entries(details).forEach(([key, value]) => {
      const formattedKey = key.replace(/([A-Z])/g, ' $1').trim()
      console.log(`  ${chalk.gray('▸')} ${chalk.white(formattedKey)}: ${chalk.cyan(value)}`)
    })
  }
}

// Singleton instance
export const progress = new ScraperProgress()

// Export utility functions for quick access
export const showProgress = (text: string) => progress.showSpinner(text)
export const hideProgress = (success?: boolean, text?: string) => progress.hideSpinner(success, text)
export const showStats = (stats: any) => progress.showStats(stats)
export const showError = (error: string, context?: any) => progress.showError(error, context)
export const showWarning = (message: string) => progress.showWarning(message)
export const showInfo = (message: string) => progress.showInfo(message)
export const showSuccess = (message: string) => progress.showSuccess(message)

export default progress