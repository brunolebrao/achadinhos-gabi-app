#!/bin/bash

echo "======================================"
echo "  Instalando Dependências do Chrome"
echo "======================================"
echo ""

# Instalar as dependências
sudo apt-get install -y \
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
  libgbm-dev \
  libxshmfence1

echo ""
echo "✅ Dependências instaladas!"
echo ""

# Verificar se libxkbcommon foi instalada
echo "Verificando libxkbcommon..."
if ldconfig -p | grep -q libxkbcommon.so.0; then
    echo "✅ libxkbcommon.so.0 instalada com sucesso!"
else
    echo "❌ libxkbcommon.so.0 não encontrada"
fi

echo ""
echo "======================================"
echo "  Próximos Passos:"
echo "======================================"
echo ""
echo "1. Reinicie a API:"
echo "   cd apps/api && pnpm dev"
echo ""
echo "2. Teste o WhatsApp:"
echo "   ./test-whatsapp.sh"
echo ""