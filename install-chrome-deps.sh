#!/bin/bash

# Chrome Dependencies Installation Script with OS Detection
# Supports Ubuntu/Debian, CentOS/RHEL/Fedora, and Arch Linux

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}🔧 $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}" >&2
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            if [[ "$ID" == "ubuntu" ]] || [[ "$ID" == "debian" ]] || [[ "$ID_LIKE" == *"debian"* ]]; then
                DISTRO="debian"
            elif [[ "$ID" == "centos" ]] || [[ "$ID" == "rhel" ]] || [[ "$ID" == "fedora" ]] || [[ "$ID_LIKE" == *"rhel"* ]]; then
                DISTRO="redhat"
            elif [[ "$ID" == "arch" ]] || [[ "$ID_LIKE" == *"arch"* ]]; then
                DISTRO="arch"
            else
                DISTRO="unknown"
            fi
        else
            DISTRO="unknown"
        fi
    elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        OS="windows"
    else
        OS="unknown"
    fi
}

check_chrome_installed() {
    log "Checking for existing Chrome/Chromium installation..."
    
    case $OS in
        "macos")
            if [ -f "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]; then
                success "Found Google Chrome"
                return 0
            elif [ -f "/Applications/Chromium.app/Contents/MacOS/Chromium" ]; then
                success "Found Chromium"
                return 0
            elif command -v google-chrome-stable &> /dev/null || command -v chromium &> /dev/null; then
                success "Found Chrome via Homebrew"
                return 0
            fi
            ;;
        "linux")
            if command -v google-chrome-stable &> /dev/null || 
               command -v google-chrome &> /dev/null || 
               command -v chromium-browser &> /dev/null || 
               command -v chromium &> /dev/null; then
                success "Found Chrome/Chromium"
                return 0
            fi
            ;;
        "windows")
            # Check common Chrome paths on Windows
            if [ -f "/c/Program Files/Google/Chrome/Application/chrome.exe" ] || 
               [ -f "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" ]; then
                success "Found Google Chrome"
                return 0
            fi
            ;;
    esac
    
    return 1
}

install_chrome_deps_debian() {
    log "Installing Chrome dependencies on Debian/Ubuntu..."
    
    sudo apt-get update
    
    sudo apt-get install -y \
        wget \
        gnupg \
        ca-certificates \
        libxkbcommon0 \
        libxkbcommon-x11-0 \
        libnss3 \
        libatk-bridge2.0-0 \
        libx11-xcb1 \
        libxcb-dri3-0 \
        libxcomposite1 \
        libxcursor1 \
        libxdamage1 \
        libxi6 \
        libxtst6 \
        libappindicator3-1 \
        libasound2 \
        libatk1.0-0 \
        libcups2 \
        libdbus-1-3 \
        libdrm2 \
        libgbm1 \
        libgtk-3-0 \
        libnspr4 \
        libxrandr2 \
        libxss1 \
        fonts-liberation \
        libu2f-udev \
        libvulkan1 \
        xdg-utils
    
    success "Dependencies installed successfully!"
}

install_chrome_deps_redhat() {
    log "Installing Chrome dependencies on Red Hat/CentOS/Fedora..."
    
    if command -v dnf &> /dev/null; then
        PKG_MGR="dnf"
    elif command -v yum &> /dev/null; then
        PKG_MGR="yum"
    else
        error "No package manager found (dnf/yum)"
        return 1
    fi
    
    sudo $PKG_MGR install -y \
        wget \
        gnupg2 \
        ca-certificates \
        libXcomposite \
        libXcursor \
        libXdamage \
        libXext \
        libXi \
        libXtst \
        cups-libs \
        libXScrnSaver \
        libXrandr \
        GConf2 \
        alsa-lib \
        atk \
        gtk3 \
        ipa-gothic-fonts \
        xorg-x11-fonts-100dpi \
        xorg-x11-fonts-75dpi \
        xorg-x11-utils \
        xorg-x11-fonts-cyrillic \
        xorg-x11-fonts-Type1 \
        xorg-x11-fonts-misc \
        libdrm \
        libxkbcommon \
        libxkbcommon-x11
    
    success "Dependencies installed successfully!"
}

install_chrome_deps_arch() {
    log "Installing Chrome dependencies on Arch Linux..."
    
    sudo pacman -S --noconfirm \
        wget \
        gnupg \
        ca-certificates \
        libxkbcommon \
        libxkbcommon-x11 \
        nss \
        at-spi2-atk \
        libxss \
        libgconf \
        libxtst \
        libxrandr \
        alsa-lib \
        gtk3 \
        libxcomposite \
        libxdamage \
        libxcursor \
        libxi \
        cups \
        dbus \
        libdrm \
        libgbm \
        nspr
    
    success "Dependencies installed successfully!"
}

install_chrome_deps_macos() {
    log "Chrome dependencies on macOS are handled by the Chrome installer."
    log "Please run: node scripts/setup-chrome.js"
    log "This will install Chrome via Homebrew if needed."
}

install_chrome_deps_windows() {
    log "Chrome dependencies on Windows are handled by the Chrome installer."
    log "Please manually install Chrome from: https://www.google.com/chrome/"
}

show_next_steps() {
    echo ""
    success "🎉 Chrome dependencies installation completed!"
    echo ""
    log "Next steps:"
    log "1. Run: node scripts/setup-chrome.js (for automated Chrome installation)"
    log "2. Or manually install Chrome from: https://www.google.com/chrome/"
    log "3. Then restart the API with: pnpm dev --filter=api"
    echo ""
    log "If you still encounter issues, try:"
    log "- pnpm setup:chrome (automated setup)"
    log "- Check CLAUDE.md for troubleshooting tips"
}

main() {
    echo "============================================="
    echo "  🚀 Chrome Dependencies Installation Script"
    echo "============================================="
    echo ""
    
    detect_os
    log "Detected OS: $OS"
    if [ "$OS" == "linux" ]; then
        log "Detected Linux distribution: $DISTRO"
    fi
    echo ""
    
    # Check if Chrome is already installed
    if check_chrome_installed; then
        success "Chrome/Chromium is already installed!"
        log "If you're still having issues, try: node scripts/setup-chrome.js"
        exit 0
    fi
    
    warning "Chrome/Chromium not found. Installing dependencies..."
    echo ""
    
    # Install dependencies based on OS
    case $OS in
        "macos")
            install_chrome_deps_macos
            ;;
        "linux")
            case $DISTRO in
                "debian")
                    install_chrome_deps_debian
                    ;;
                "redhat")
                    install_chrome_deps_redhat
                    ;;
                "arch")
                    install_chrome_deps_arch
                    ;;
                *)
                    error "Unsupported Linux distribution: $DISTRO"
                    error "Please install Chrome manually from: https://www.google.com/chrome/"
                    exit 1
                    ;;
            esac
            ;;
        "windows")
            install_chrome_deps_windows
            ;;
        *)
            error "Unsupported operating system: $OS"
            error "Please install Chrome manually from: https://www.google.com/chrome/"
            exit 1
            ;;
    esac
    
    show_next_steps
}

# Only run if executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi