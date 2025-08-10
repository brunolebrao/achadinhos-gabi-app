import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'

export interface ChromeExecutablePath {
  path: string
  source: 'system' | 'puppeteer' | 'homebrew' | 'snap' | 'flatpak'
  version?: string
}

export class ChromeDetector {
  private static cachedPath: ChromeExecutablePath | null = null

  static async detectChromeExecutable(): Promise<ChromeExecutablePath | null> {
    if (this.cachedPath) {
      return this.cachedPath
    }

    const platform = os.platform()
    let detected: ChromeExecutablePath | null = null

    try {
      switch (platform) {
        case 'darwin':
          detected = await this.detectMacOSChrome()
          break
        case 'linux':
          detected = await this.detectLinuxChrome()
          break
        case 'win32':
          detected = await this.detectWindowsChrome()
          break
        default:
          console.warn(`Unsupported platform: ${platform}`)
          return null
      }

      if (detected) {
        this.cachedPath = detected
        console.log(`Chrome detected: ${detected.path} (${detected.source})`)
      }

      return detected
    } catch (error) {
      console.error('Chrome detection failed:', error)
      return null
    }
  }

  private static async detectMacOSChrome(): Promise<ChromeExecutablePath | null> {
    const possiblePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/usr/local/bin/chromium',
      '/usr/local/bin/google-chrome',
      '/opt/homebrew/bin/chromium',
      '/opt/homebrew/bin/google-chrome'
    ]

    // Check system installations
    for (const chromePath of possiblePaths) {
      if (await this.fileExists(chromePath)) {
        const version = await this.getChromeVersion(chromePath)
        return {
          path: chromePath,
          source: chromePath.includes('homebrew') ? 'homebrew' : 'system',
          version
        }
      }
    }

    // Check for Homebrew installation
    try {
      const homebrewChrome = execSync('which google-chrome-stable || which chromium', { encoding: 'utf8' }).trim()
      if (homebrewChrome && await this.fileExists(homebrewChrome)) {
        const version = await this.getChromeVersion(homebrewChrome)
        return {
          path: homebrewChrome,
          source: 'homebrew',
          version
        }
      }
    } catch {}

    return null
  }

  private static async detectLinuxChrome(): Promise<ChromeExecutablePath | null> {
    const possiblePaths = [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/snap/bin/chromium',
      '/var/lib/flatpak/app/com.google.Chrome/current/active/export/bin/com.google.Chrome',
      '/usr/local/bin/google-chrome',
      '/usr/local/bin/chromium'
    ]

    // Check system installations
    for (const chromePath of possiblePaths) {
      if (await this.fileExists(chromePath)) {
        const version = await this.getChromeVersion(chromePath)
        let source: ChromeExecutablePath['source'] = 'system'
        
        if (chromePath.includes('snap')) source = 'snap'
        else if (chromePath.includes('flatpak')) source = 'flatpak'

        return {
          path: chromePath,
          source,
          version
        }
      }
    }

    // Check with which command
    try {
      const whichResult = execSync('which google-chrome-stable || which google-chrome || which chromium-browser || which chromium', { encoding: 'utf8' }).trim()
      if (whichResult && await this.fileExists(whichResult)) {
        const version = await this.getChromeVersion(whichResult)
        return {
          path: whichResult,
          source: 'system',
          version
        }
      }
    } catch {}

    return null
  }

  private static async detectWindowsChrome(): Promise<ChromeExecutablePath | null> {
    const possiblePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Users\\' + os.userInfo().username + '\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Chromium\\Application\\chromium.exe',
      'C:\\Program Files (x86)\\Chromium\\Application\\chromium.exe'
    ]

    for (const chromePath of possiblePaths) {
      if (await this.fileExists(chromePath)) {
        const version = await this.getChromeVersion(chromePath)
        return {
          path: chromePath,
          source: 'system',
          version
        }
      }
    }

    return null
  }

  static async getPuppeteerChromePath(): Promise<string | null> {
    try {
      // Check common Puppeteer cache locations
      const homeDir = os.homedir()
      const possiblePuppeteerPaths = [
        path.join(homeDir, '.cache', 'puppeteer'),
        path.join(homeDir, '.local-chromium'),
        path.join(process.cwd(), 'node_modules', 'puppeteer', '.local-chromium'),
        path.join(process.cwd(), '..', '..', 'node_modules', 'puppeteer', '.local-chromium'), // For monorepo
      ]

      for (const basePath of possiblePuppeteerPaths) {
        if (await this.fileExists(basePath)) {
          const chromeDirs = await this.findChromeInDirectory(basePath)
          if (chromeDirs.length > 0) {
            // Return the most recent version
            return chromeDirs.sort().reverse()[0]
          }
        }
      }

      return null
    } catch (error) {
      console.error('Failed to find Puppeteer Chrome:', error)
      return null
    }
  }

  private static async findChromeInDirectory(basePath: string): Promise<string[]> {
    const chromePaths: string[] = []
    
    try {
      const entries = fs.readdirSync(basePath)
      
      for (const entry of entries) {
        const entryPath = path.join(basePath, entry)
        const stat = fs.statSync(entryPath)
        
        if (stat.isDirectory()) {
          // Look for chrome-* directories
          if (entry.startsWith('chrome')) {
            const platform = os.platform()
            let executable = ''
            
            if (platform === 'win32') {
              executable = path.join(entryPath, 'chrome-win', 'chrome.exe')
            } else if (platform === 'darwin') {
              executable = path.join(entryPath, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium')
            } else {
              executable = path.join(entryPath, 'chrome-linux64', 'chrome')
              // Also check chrome-linux for older versions
              if (!await this.fileExists(executable)) {
                executable = path.join(entryPath, 'chrome-linux', 'chrome')
              }
            }
            
            if (await this.fileExists(executable)) {
              chromePaths.push(executable)
            }
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    
    return chromePaths
  }

  private static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK | fs.constants.X_OK)
      return true
    } catch {
      return false
    }
  }

  private static async getChromeVersion(chromePath: string): Promise<string | undefined> {
    try {
      const output = execSync(`"${chromePath}" --version`, { encoding: 'utf8', timeout: 5000 })
      const match = output.match(/(\d+\.\d+\.\d+\.\d+)/)
      return match ? match[1] : undefined
    } catch {
      return undefined
    }
  }

  static clearCache(): void {
    this.cachedPath = null
  }

  static async getRecommendedPuppeteerOptions(): Promise<any> {
    const detected = await this.detectChromeExecutable()
    
    if (detected) {
      return {
        executablePath: detected.path,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      }
    }

    // Fallback to Puppeteer's bundled Chrome
    const puppeteerPath = await this.getPuppeteerChromePath()
    if (puppeteerPath) {
      return {
        executablePath: puppeteerPath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      }
    }

    // Let Puppeteer handle Chrome installation automatically
    console.warn('No Chrome installation detected. Puppeteer will download Chrome automatically.')
    return {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    }
  }
}