#!/bin/bash

echo "================================================"
echo "  Instalação de Dependências Chrome para WSL"
echo "  Ubuntu 20.04 LTS"
echo "================================================"
echo ""
echo "Este script instalará as dependências necessárias"
echo "para rodar o Chrome/Puppeteer no WSL Ubuntu."
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Você precisará da senha sudo para continuar.${NC}"
echo ""

# Atualizar lista de pacotes
echo -e "${BLUE}1. Atualizando lista de pacotes...${NC}"
sudo apt-get update

# Instalar dependências essenciais
echo -e "${BLUE}2. Instalando dependências essenciais do Chrome...${NC}"
sudo apt-get install -y \
  wget \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  xdg-utils \
  libxkbcommon0 \
  libxkbcommon-x11-0 \
  libxcb-dri3-0 \
  libdrm2

# Verificar se a instalação foi bem-sucedida
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependências instaladas com sucesso!${NC}"
    echo ""
    
    # Verificar se a biblioteca crítica está instalada
    if ldconfig -p | grep -q libxkbcommon.so.0; then
        echo -e "${GREEN}✅ libxkbcommon.so.0 encontrada!${NC}"
    else
        echo -e "${RED}❌ Aviso: libxkbcommon.so.0 não foi encontrada${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}Próximos passos:${NC}"
    echo "1. Reinicie a API:"
    echo "   pkill -f 'node.*api'"
    echo "   cd apps/api && pnpm dev"
    echo ""
    echo "2. Teste a criação de sessão WhatsApp:"
    echo "   ./test-whatsapp.sh"
    echo ""
    echo -e "${GREEN}Instalação concluída!${NC}"
else
    echo -e "${RED}❌ Erro durante a instalação das dependências${NC}"
    echo "Por favor, verifique os erros acima e tente novamente."
    exit 1
fi