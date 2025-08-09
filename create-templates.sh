#!/bin/bash

# Script para criar templates específicos
API_URL="http://localhost:3001/api"

# Get token (using demo credentials)
TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@achadinhos.com","password":"demo123"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")

echo "🔄 Criando templates específicos..."

# 1. Template Super Oferta (>50% OFF)
curl -s -X POST "$API_URL/templates" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Super Oferta",
    "category": "super-oferta",
    "isActive": true,
    "isDefault": false,
    "content": "🔥🔥🔥 *SUPER OFERTA IMPERDÍVEL* 🔥🔥🔥\n\n{{discount_emoji}} {{product_name}}\n💰 De ~~R$ {{original_price}}~~ por *R$ {{price}}*\n⚡ *{{discount}}% OFF* - Desconto GIGANTE!\n\n{{platform_emoji}} {{platform}}\n\n{{urgency_text}}\n\n🛒 {{affiliate_url}}\n\n*Corre que vai acabar!* 🏃‍♂️💨",
    "variables": {
      "product_name": "Nome do produto",
      "price": "Preço com desconto", 
      "original_price": "Preço original",
      "discount": "Porcentagem de desconto",
      "affiliate_url": "Link afiliado",
      "platform_emoji": "Emoji da plataforma",
      "discount_emoji": "Emoji do desconto",
      "urgency_text": "Texto de urgência",
      "platform": "Nome da plataforma"
    }
  }' | python3 -c "import sys, json; print('✅ Super Oferta:', json.load(sys.stdin)['id'][:20] + '...')"

# 2. Template Oportunidade (<30% OFF)
curl -s -X POST "$API_URL/templates" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Boa Oportunidade",
    "category": "oportunidade", 
    "isActive": true,
    "isDefault": false,
    "content": "💰 *BOA OPORTUNIDADE* 💰\n\n{{product_name}}\n🏷️ R$ {{price}}\n{{#if original_price}}💸 Antes: R$ {{original_price}} ({{discount}}% OFF){{/if}}\n\n{{platform_emoji}} Disponível na {{platform}}\n\n{{urgency_text}}\n\n🔗 {{affiliate_url}}\n\n_Aproveite enquanto tem!_ ✨",
    "variables": {
      "product_name": "Nome do produto",
      "price": "Preço atual",
      "original_price": "Preço original", 
      "discount": "Porcentagem de desconto",
      "affiliate_url": "Link afiliado",
      "platform_emoji": "Emoji da plataforma",
      "urgency_text": "Texto de urgência",
      "platform": "Nome da plataforma"
    }
  }' | python3 -c "import sys, json; print('✅ Oportunidade:', json.load(sys.stdin)['id'][:20] + '...')"

# 3. Template Eletrônicos
curl -s -X POST "$API_URL/templates" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Eletrônicos Premium",
    "category": "eletronicos",
    "isActive": true,
    "isDefault": false,
    "content": "📱💻 *TECH DEAL* ⌚🎧\n\n*{{product_name}}*\n\n💰 *R$ {{price}}*{{#if discount}}\n🔥 {{discount}}% OFF (era R$ {{original_price}}){{/if}}\n\n{{platform_emoji}} {{platform}}\n{{category_emoji}} Categoria Premium\n\n✨ {{urgency_text}}\n\n🛒 Compre agora: {{affiliate_url}}\n\n_Tecnologia de qualidade!_ 🚀",
    "variables": {
      "product_name": "Nome do produto",
      "price": "Preço atual",
      "original_price": "Preço original",
      "discount": "Porcentagem de desconto", 
      "affiliate_url": "Link afiliado",
      "platform_emoji": "Emoji da plataforma",
      "category_emoji": "Emoji da categoria",
      "urgency_text": "Texto de urgência",
      "platform": "Nome da plataforma"
    }
  }' | python3 -c "import sys, json; print('✅ Eletrônicos:', json.load(sys.stdin)['id'][:20] + '...')"

# 4. Template Casa & Decoração  
curl -s -X POST "$API_URL/templates" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Casa & Decoração",
    "category": "casa",
    "isActive": true,
    "isDefault": false,
    "content": "🏠🛋️ *PARA SUA CASA* ✨🪴\n\n{{product_name}}\n\n💰 Por apenas *R$ {{price}}*{{#if discount}}\n🏷️ {{discount}}% OFF - Era R$ {{original_price}}{{/if}}\n\n{{platform_emoji}} Encontre na {{platform}}\n\n{{urgency_text}}\n\n🛒 {{affiliate_url}}\n\n_Deixe sua casa mais bonita!_ 🏡💕",
    "variables": {
      "product_name": "Nome do produto",
      "price": "Preço atual",
      "original_price": "Preço original",
      "discount": "Porcentagem de desconto",
      "affiliate_url": "Link afiliado", 
      "platform_emoji": "Emoji da plataforma",
      "urgency_text": "Texto de urgência",
      "platform": "Nome da plataforma"
    }
  }' | python3 -c "import sys, json; print('✅ Casa & Decoração:', json.load(sys.stdin)['id'][:20] + '...')"

# 5. Template Moda & Estilo
curl -s -X POST "$API_URL/templates" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Moda & Estilo",
    "category": "moda",
    "isActive": true,
    "isDefault": false,
    "content": "👕👠 *MODA EM ALTA* 💄✨\n\n{{product_name}}\n\n💸 *R$ {{price}}*{{#if discount}}\n🏷️ DESCONTO: {{discount}}% OFF\n~~R$ {{original_price}}~~{{/if}}\n\n{{platform_emoji}} Disponível: {{platform}}\n\n{{urgency_text}}\n\n🛍️ {{affiliate_url}}\n\n_Arrase no visual!_ 😍✨",
    "variables": {
      "product_name": "Nome do produto",
      "price": "Preço atual",
      "original_price": "Preço original",
      "discount": "Porcentagem de desconto",
      "affiliate_url": "Link afiliado",
      "platform_emoji": "Emoji da plataforma", 
      "urgency_text": "Texto de urgência",
      "platform": "Nome da plataforma"
    }
  }' | python3 -c "import sys, json; print('✅ Moda & Estilo:', json.load(sys.stdin)['id'][:20] + '...')"

echo ""
echo "✅ Todos os templates específicos foram criados!"
echo ""
echo "📋 Templates disponíveis agora:"
echo "  1. Promoção Flash (padrão)"
echo "  2. Produto Novo" 
echo "  3. Super Oferta (>50% OFF)"
echo "  4. Boa Oportunidade (<30% OFF)"
echo "  5. Eletrônicos Premium"
echo "  6. Casa & Decoração"
echo "  7. Moda & Estilo"
echo ""
echo "🧪 Para testar, use:"
echo "  curl GET /api/templates/suggest/:productId"
echo "  curl POST /api/templates/apply-to-product/:productId/:templateId"