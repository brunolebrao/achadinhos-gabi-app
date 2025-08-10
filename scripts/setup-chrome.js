#!/usr/bin/env node

const { execSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

class ChromeSetup {
  constructor() {
    this.platform = os.platform()
    this.distro = null
    
    if (this.platform === 'linux') {
      this.detectLinuxDistro()
    }
  }

  detectLinuxDistro() {
    try {
      if (fs.existsSync('/etc/os-release')) {
        const release = fs.readFileSync('/etc/os-release', 'utf8')
        if (release.includes('Ubuntu') || release.includes('Debian')) {
          this.distro = 'debian'
        } else if (release.includes('CentOS') || release.includes('Red Hat') || release.includes('Fedora')) {
          this.distro = 'redhat'
        } else if (release.includes('Arch')) {
          this.distro = 'arch'
        }
      }
    } catch (error) {
      console.warn('Could not detect Linux distribution:', error.message)
    }
  }

  log(message) {
    console.log(`🔧 ${message}`)
  }

  error(message) {
    console.error(`❌ ${message}`)
  }

  success(message) {
    console.log(`✅ ${message}`)
  }

  warning(message) {
    console.warn(`⚠️  ${message}`)
  }

  async checkChromeInstalled() {
    this.log('Checking for existing Chrome/Chromium installation...')
    
    try {
      switch (this.platform) {
        case 'darwin':
          return this.checkMacOSChrome()
        case 'linux':
          return this.checkLinuxChrome()
        case 'win32':
          return this.checkWindowsChrome()
        default:
          this.warning(`Unsupported platform: ${this.platform}`)
          return false
      }
    } catch (error) {
      this.error(`Error checking Chrome installation: ${error.message}`)
      return false
    }
  }

  checkMacOSChrome() {
    const chromePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    ]

    for (const chromePath of chromePaths) {
      if (fs.existsSync(chromePath)) {
        this.success(`Found Chrome at: ${chromePath}`)
        return true
      }
    }

    // Check Homebrew
    try {
      const homebrewChrome = execSync('which google-chrome-stable || which chromium 2>/dev/null || true', { encoding: 'utf8' }).trim()
      if (homebrewChrome) {
        this.success(`Found Homebrew Chrome at: ${homebrewChrome}`)
        return true
      }
    } catch {}

    return false
  }

  checkLinuxChrome() {
    const chromePaths = [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/snap/bin/chromium'
    ]

    for (const chromePath of chromePaths) {
      if (fs.existsSync(chromePath)) {
        this.success(`Found Chrome at: ${chromePath}`)
        return true
      }
    }

    try {
      const whichResult = execSync('which google-chrome-stable || which google-chrome || which chromium-browser || which chromium 2>/dev/null || true', { encoding: 'utf8' }).trim()
      if (whichResult) {
        this.success(`Found Chrome at: ${whichResult}`)
        return true
      }
    } catch {}

    return false
  }

  checkWindowsChrome() {
    const chromePaths = [
      'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
      'C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
      `C:\\\\Users\\\\${os.userInfo().username}\\\\AppData\\\\Local\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe`
    ]

    for (const chromePath of chromePaths) {
      if (fs.existsSync(chromePath)) {
        this.success(`Found Chrome at: ${chromePath}`)
        return true
      }
    }

    return false
  }

  async installChrome() {
    this.log(`Installing Chrome for ${this.platform}...`)

    try {
      switch (this.platform) {
        case 'darwin':
          return await this.installMacOSChrome()
        case 'linux':
          return await this.installLinuxChrome()
        case 'win32':
          return await this.installWindowsChrome()
        default:
          this.error(`Chrome installation not supported for ${this.platform}`)
          return false
      }
    } catch (error) {
      this.error(`Failed to install Chrome: ${error.message}`)
      return false
    }
  }

  async installMacOSChrome() {
    this.log('Attempting to install Chrome via Homebrew...')
    
    try {
      // Check if Homebrew is installed
      execSync('which brew', { stdio: 'ignore' })
      this.log('Homebrew detected')
    } catch {
      this.error('Homebrew not found. Please install Homebrew first:')
      this.error('/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"')
      return false
    }

    try {
      this.log('Installing Google Chrome...')
      execSync('brew install --cask google-chrome', { stdio: 'inherit' })
      this.success('Google Chrome installed successfully!')
      return true
    } catch (error) {
      this.warning('Failed to install Google Chrome, trying Chromium...')
      try {
        execSync('brew install --cask chromium', { stdio: 'inherit' })
        this.success('Chromium installed successfully!')
        return true
      } catch {
        this.error('Failed to install Chromium as well')
        return false
      }
    }
  }

  async installLinuxChrome() {
    if (!this.distro) {
      this.error('Could not detect Linux distribution')
      return false
    }

    switch (this.distro) {
      case 'debian':
        return await this.installDebianChrome()
      case 'redhat':
        return await this.installRedHatChrome()
      case 'arch':
        return await this.installArchChrome()
      default:
        this.error(`Chrome installation not implemented for ${this.distro}`)
        return false
    }
  }

  async installDebianChrome() {
    this.log('Installing Chrome on Debian/Ubuntu...')
    
    try {
      // Update package list
      this.log('Updating package list...')
      execSync('sudo apt-get update', { stdio: 'inherit' })

      // Install dependencies first
      this.log('Installing Chrome dependencies...')
      execSync(`sudo apt-get install -y \\
        wget \\
        gnupg \\
        ca-certificates \\
        libxkbcommon0 \\
        libxkbcommon-x11-0 \\
        libnss3 \\
        libatk-bridge2.0-0 \\
        libx11-xcb1 \\
        libxcb-dri3-0 \\
        libxcomposite1 \\
        libxcursor1 \\
        libxdamage1 \\
        libxi6 \\
        libxtst6 \\
        libappindicator3-1 \\
        libasound2 \\
        libatk1.0-0 \\
        libcups2 \\
        libdbus-1-3 \\
        libdrm2 \\
        libgbm1 \\
        libgtk-3-0 \\
        libnspr4 \\
        libxrandr2 \\
        libxss1`, { stdio: 'inherit' })

      // Try to install Google Chrome
      try {
        this.log('Adding Google Chrome repository...')
        execSync('wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -', { stdio: 'inherit' })
        execSync('echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list', { stdio: 'inherit' })
        
        this.log('Updating package list...')
        execSync('sudo apt-get update', { stdio: 'inherit' })
        
        this.log('Installing Google Chrome...')
        execSync('sudo apt-get install -y google-chrome-stable', { stdio: 'inherit' })
        this.success('Google Chrome installed successfully!')
        return true
      } catch {
        this.warning('Failed to install Google Chrome, trying Chromium...')
        execSync('sudo apt-get install -y chromium-browser', { stdio: 'inherit' })
        this.success('Chromium installed successfully!')
        return true
      }
    } catch (error) {
      this.error('Failed to install Chrome/Chromium')
      return false
    }
  }

  async installRedHatChrome() {
    this.log('Installing Chrome on Red Hat/CentOS/Fedora...')
    
    try {
      // Try Google Chrome first
      try {
        this.log('Installing Google Chrome...')
        execSync('sudo dnf install -y https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm', { stdio: 'inherit' })
        this.success('Google Chrome installed successfully!')
        return true
      } catch {
        this.warning('Failed to install Google Chrome, trying Chromium...')
        execSync('sudo dnf install -y chromium', { stdio: 'inherit' })
        this.success('Chromium installed successfully!')
        return true
      }
    } catch (error) {
      this.error('Failed to install Chrome/Chromium')
      return false
    }
  }

  async installArchChrome() {
    this.log('Installing Chrome on Arch Linux...')
    
    try {
      // Try Google Chrome from AUR
      try {
        this.log('Installing Google Chrome...')
        execSync('yay -S --noconfirm google-chrome', { stdio: 'inherit' })
        this.success('Google Chrome installed successfully!')
        return true
      } catch {
        this.warning('Failed to install Google Chrome, trying Chromium...')
        execSync('sudo pacman -S --noconfirm chromium', { stdio: 'inherit' })
        this.success('Chromium installed successfully!')
        return true
      }
    } catch (error) {
      this.error('Failed to install Chrome/Chromium')
      return false
    }
  }

  async installWindowsChrome() {
    this.error('Automated Chrome installation on Windows is not supported.')
    this.log('Please manually download and install Chrome from:')
    this.log('https://www.google.com/chrome/')
    return false
  }

  async installPuppeteerChrome() {
    this.log('Installing Puppeteer with bundled Chrome...')
    
    try {
      const puppeteerPath = path.join(process.cwd(), 'packages', 'whatsapp')
      
      this.log('Installing Puppeteer in WhatsApp package...')
      execSync('pnpm install puppeteer', { 
        cwd: puppeteerPath,
        stdio: 'inherit' 
      })
      
      this.success('Puppeteer with bundled Chrome installed successfully!')
      return true
    } catch (error) {
      this.error('Failed to install Puppeteer')
      return false
    }
  }

  async setup() {
    console.log('============================================')
    console.log('  🚀 Achadinhos Chrome Setup Wizard')
    console.log('============================================')
    console.log('')
    
    this.log(`Detected platform: ${this.platform}`)
    if (this.distro) {
      this.log(`Detected Linux distribution: ${this.distro}`)
    }
    console.log('')

    // Check if Chrome is already installed
    const chromeInstalled = await this.checkChromeInstalled()
    
    if (chromeInstalled) {
      this.success('Chrome/Chromium is already installed!')
      this.log('Testing Puppeteer configuration...')
      
      // Test Puppeteer
      try {
        const { ChromeDetector } = require('../packages/whatsapp/src/utils/chrome-detector')
        const options = await ChromeDetector.getRecommendedPuppeteerOptions()
        this.success('Puppeteer configuration looks good!')
        console.log('Chrome path:', options.executablePath || 'Using Puppeteer bundled Chrome')
      } catch (error) {
        this.warning('Could not test Chrome configuration:', error.message)
      }
      
      return true
    }

    // Ask user what they want to do
    console.log('Chrome/Chromium not found. What would you like to do?')
    console.log('1. Install system Chrome/Chromium (recommended)')
    console.log('2. Use Puppeteer bundled Chrome (fallback)')
    console.log('3. Exit and install manually')
    
    const choice = await this.askUser('Enter your choice (1-3): ')
    
    switch (choice.trim()) {
      case '1':
        const systemInstallSuccess = await this.installChrome()
        if (systemInstallSuccess) {
          this.success('Chrome installation completed!')
          return true
        } else {
          this.warning('System Chrome installation failed, falling back to Puppeteer Chrome...')
          return await this.installPuppeteerChrome()
        }
        
      case '2':
        return await this.installPuppeteerChrome()
        
      case '3':
        this.log('Please install Chrome manually and run this script again.')
        this.log('Chrome download: https://www.google.com/chrome/')
        this.log('Chromium download: https://www.chromium.org/')
        return false
        
      default:
        this.error('Invalid choice. Exiting.')
        return false
    }
  }

  askUser(question) {
    return new Promise((resolve) => {
      const { stdin, stdout } = process
      stdout.write(question)
      
      stdin.resume()
      stdin.setEncoding('utf8')
      
      stdin.once('data', (data) => {
        stdin.pause()
        resolve(data)
      })
    })
  }
}

// Main execution
async function main() {
  const setup = new ChromeSetup()
  
  try {
    const success = await setup.setup()
    
    if (success) {
      console.log('')
      setup.success('🎉 Chrome setup completed successfully!')
      setup.log('You can now start the WhatsApp service with: pnpm dev --filter=api')
    } else {
      console.log('')
      setup.error('Chrome setup failed. Please check the logs above.')
      process.exit(1)
    }
  } catch (error) {
    setup.error('Unexpected error during setup:', error.message)
    process.exit(1)
  }
}

// Only run if called directly
if (require.main === module) {
  main()
}

module.exports = { ChromeSetup }