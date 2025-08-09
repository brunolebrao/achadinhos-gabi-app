# 🛍️ Achadinhos da Gabi

Sistema automatizado de affiliate marketing que encontra produtos em ofertas e envia via WhatsApp.

## 🎯 Funcionalidades

- **🤖 Scrapers Automatizados**: Coleta produtos do Mercado Livre, Shopee, Amazon e AliExpress
- **📱 WhatsApp Integration**: Envio automático de mensagens com WhatsApp Web.js
- **📝 Sistema de Templates**: Templates personalizáveis com variáveis dinâmicas
- **👥 Gestão de Contatos**: Organização de contatos e grupos
- **📊 Analytics Completo**: Métricas de performance e conversão
- **🎨 Dashboard Moderno**: Interface React com design responsivo

## 🚀 Quick Start (Desenvolvimento)

### Pré-requisitos
- Node.js 18+
- Docker & Docker Compose
- pnpm (recomendado)

### Setup Automático
```bash
# Clone o repositório
git clone <repo-url>
cd achadinhos-gabi-app

# Execute o setup automático
./scripts/setup-dev.sh
```

### Setup Manual
```bash
# 1. Instalar dependências
pnpm install

# 2. Iniciar infraestrutura
docker-compose -f docker-compose.dev.yml up -d

# 3. Configurar banco de dados
cd apps/api
pnpm db:push
pnpm tsx ../../scripts/setup-database.ts

# 4. Iniciar API
pnpm dev

# 5. Iniciar Frontend (novo terminal)
cd ../web
pnpm dev
```

## 🌐 Acessar o Sistema

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **pgAdmin**: http://localhost:5050 (admin@achadinhos.com / admin123)

### Credenciais Demo
- **Email**: demo@achadinhos.com
- **Senha**: demo123

## 🏗️ Arquitetura

```
achadinhos-gabi-app/
├── apps/
│   ├── api/              # Backend Fastify + TypeScript
│   └── web/              # Frontend Next.js 15 + React 19
├── packages/
│   ├── database/         # Prisma ORM + PostgreSQL
│   ├── whatsapp/         # WhatsApp Web.js integration
│   ├── shared/           # Tipos e utilitários compartilhados
│   └── ui/               # Componentes UI reutilizáveis
└── scripts/              # Scripts de automação
```

## 🐳 Deploy com Docker

### Produção Completa
```bash
# Setup completo com dados demo
./scripts/setup-prod.sh --seed

# Ou configuração limpa
./scripts/setup-prod.sh
```

### Serviços Opcionais
```bash
# Painel administrativo
docker-compose --profile admin up -d

# Monitoramento (Prometheus + Grafana)
docker-compose --profile monitoring up -d
```

## ⚙️ Configuração

### Variáveis de Ambiente Principais
```bash
# Banco de dados
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/achadinhos_gabi"

# JWT e CORS
JWT_SECRET="sua-chave-secreta-super-forte"
CORS_ORIGIN="http://localhost:3000"

# WhatsApp
WHATSAPP_SESSION_PATH="./sessions"

# IDs de Afiliados
MERCADOLIVRE_AFFILIATE_ID="seu-id-ml"
SHOPEE_AFFILIATE_ID="seu-id-shopee"
AMAZON_ASSOCIATE_TAG="seu-tag-amazon"
```

## 📋 Scripts Disponíveis

### Desenvolvimento
```bash
# Raiz do projeto
pnpm dev                    # Inicia todos os serviços
pnpm build                  # Build de produção
pnpm lint                   # Linting
pnpm check-types           # Verificação de tipos

# API específica
cd apps/api
pnpm dev                   # API em modo desenvolvimento
pnpm db:push              # Aplicar schema no banco
pnpm db:generate          # Gerar cliente Prisma

# Frontend específico
cd apps/web
pnpm dev                  # Frontend em modo desenvolvimento
pnpm build                # Build otimizado
```

### Infraestrutura
```bash
# Desenvolvimento
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml down

# Produção
docker-compose up -d
docker-compose down

# Logs
docker-compose logs -f
docker-compose logs -f api
```

## 🧪 Como Funciona

### 1. Coleta de Produtos (Scrapers)
- Scrapers rodam automaticamente baseados em cron schedules
- Coletam produtos com desconto das principais plataformas
- Filtram por categoria, preço, desconto mínimo, etc.

### 2. Processamento e Aprovação
- Produtos coletados ficam com status `PENDING`
- Interface permite aprovar/rejeitar produtos
- Produtos aprovados ficam disponíveis para envio

### 3. Envio via WhatsApp
- Templates personalizáveis com variáveis dinâmicas
- Envio para contatos individuais ou grupos
- Controle de rate limiting e sessões múltiplas
- QR Code para conectar contas WhatsApp

### 4. Tracking e Analytics
- Rastreamento de cliques em links de afiliados
- Métricas de conversão por plataforma/categoria
- Dashboard com insights de performance

## 🔧 Desenvolvimento

### Estrutura de Pacotes
- **@achadinhos/api**: Backend API
- **@repo/database**: Schema Prisma e migrations
- **@repo/whatsapp**: Integração WhatsApp Web.js
- **@repo/shared**: Tipos TypeScript compartilhados
- **@repo/ui**: Componentes UI base
- **web**: Frontend Next.js

### Comandos Úteis
```bash
# Adicionar dependência em pacote específico
pnpm add axios --filter=@achadinhos/api

# Rodar comando em todos os pacotes
pnpm -r run build

# Limpar tudo
pnpm -r run clean
rm -rf node_modules
pnpm install
```

## 🎨 Frontend

### Stack
- **Next.js 15** (App Router)
- **React 19** com TypeScript
- **Tailwind CSS** para styling
- **Zustand** para gerenciamento de estado
- **Axios** para requisições HTTP
- **Lucide React** para ícones

### Páginas Principais
- `/` - Dashboard com métricas
- `/products` - Gestão de produtos
- `/whatsapp` - Sessões WhatsApp
- `/templates` - Templates de mensagem
- `/contacts` - Contatos e grupos
- `/scrapers` - Configuração de scrapers
- `/analytics` - Relatórios e insights

## 🔐 Segurança

- Autenticação JWT
- Rate limiting
- Helmet para headers de segurança
- CORS configurável
- Validação com Zod
- Containerização para isolamento

## 📊 Monitoramento

### Logs
```bash
# Logs da API
docker-compose logs -f api

# Logs do PostgreSQL
docker-compose logs -f postgres

# Todos os logs
docker-compose logs -f
```

### Health Checks
- API: `GET /health`
- Containers têm health checks automáticos
- Prometheus metrics (em desenvolvimento)

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit suas mudanças: `git commit -m 'Adiciona nova funcionalidade'`
4. Push para a branch: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 🆘 Troubleshooting

### Docker não inicia
```bash
# Verificar se Docker está rodando
docker info

# Reiniciar Docker
sudo systemctl restart docker  # Linux
# ou restart Docker Desktop
```

### Banco não conecta
```bash
# Verificar se PostgreSQL está rodando
docker-compose -f docker-compose.dev.yml ps

# Recriar containers
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

### WhatsApp não conecta
- Verifique se não há outra instância rodando
- Delete arquivos em `./sessions` e reconecte
- Use QR code válido dentro do tempo limite

### Build falha
```bash
# Limpar tudo e reinstalar
rm -rf node_modules packages/*/node_modules apps/*/node_modules
pnpm install
pnpm -w run db:generate
```

---

**Desenvolvido com ❤️ para automatizar e otimizar o marketing de afiliados**