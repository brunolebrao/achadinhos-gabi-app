# Configuração de Variáveis de Ambiente 🔧

Este arquivo foi criado para te guiar na configuração das variáveis de ambiente necessárias para o funcionamento completo do sistema.

## ✅ Já Configurado
- `INSTAGRAM_APP_ID="1252003544986909"`
- `INSTAGRAM_CALLBACK_URL="http://localhost:3001/api/auth/instagram/oauth/callback"`

## 🔴 CRÍTICO - Configurar para Continuar

### 1. Instagram App Secret (OBRIGATÓRIO)
```bash
# No arquivo .env, substitua esta linha:
INSTAGRAM_APP_SECRET="your-instagram-app-secret"

# Por exemplo (use SEU valor real):
INSTAGRAM_APP_SECRET="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
```

**🔍 Como obter:**
1. Acesse https://developers.facebook.com/apps/1252003544986909/settings/basic/
2. Copie o valor de "App Secret" 
3. Cole no arquivo `.env` substituindo `your-instagram-app-secret`

### 2. OpenAI API Key (OBRIGATÓRIO)
```bash
# No arquivo .env, substitua esta linha:
OPENAI_API_KEY="your-openai-api-key"

# Por exemplo (use SEU valor real):
OPENAI_API_KEY="sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz"
```

**🔍 Como obter:**
1. Acesse https://platform.openai.com/api-keys
2. Clique em "Create new secret key"
3. Copie a chave (começa com `sk-proj-` ou `sk-`)
4. Cole no arquivo `.env` substituindo `your-openai-api-key`

## ⚠️ Importante

- **SEM essas duas chaves, o sistema não funcionará**
- Instagram OAuth falhará sem `INSTAGRAM_APP_SECRET`
- Geração de conteúdo IA falhará sem `OPENAI_API_KEY`

## 🧪 Teste Rápido Após Configurar

```bash
# 1. Testar configuração Instagram
pnpm -w validate:instagram

# 2. Testar build (deve passar sem erros)
pnpm -w run build

# 3. Iniciar sistema completo
pnpm -w dev
```

## ✅ Como Saber que Está Funcionando

### Instagram Configurado Corretamente:
- `pnpm -w validate:instagram` mostra "✅ App credentials format looks valid"
- Consegue acessar http://localhost:3000/social-accounts
- Botão "Conectar Instagram" funciona

### OpenAI Configurado Corretamente:
- Build não falha com erros de IA
- Consegue gerar captions via API

## 🟡 Opcional (Configurar Depois)

### Base de Dados (se não usar PostgreSQL local)
```bash
DATABASE_URL="postgresql://usuario:senha@host:porta/database"
```

### Outros Affiliates
```bash
SHOPEE_AFFILIATE_ID="seu-id-shopee"
AMAZON_ASSOCIATE_TAG="seu-tag-amazon"  
ALIEXPRESS_AFFILIATE_ID="seu-id-aliexpress"
```

### TikTok Integration
```bash
TIKTOK_CLIENT_KEY="seu-client-key"
TIKTOK_CLIENT_SECRET="seu-client-secret"
```

---

🚀 **Status Atual do Sistema:**
- ✅ Instagram OAuth: Implementado (precisa de credenciais)
- ✅ IA Content Generation: Implementado (precisa de credenciais)  
- ✅ Scrapers: Funcionando (Mercado Livre, Shopee, Amazon, AliExpress)
- ✅ Publishers: Implementados (Instagram Feed, Stories, Reels, Carousel)
- ✅ WhatsApp Integration: Implementado
- ✅ Database & API: Funcionando

💡 **O sistema está 95% pronto - só faltam as credenciais!**