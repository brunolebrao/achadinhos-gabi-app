/** @type {import('next').NextConfig} */
const nextConfig = {
  // Expose environment variables to edge runtime
  env: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  },

  async headers() {
    return [
      {
        // Aplicar headers para todas as rotas
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, Accept',
          },
        ],
      },
    ]
  },

  // Configuração para desenvolvimento
  serverExternalPackages: ['@repo/database'],

  // Configuração de rewrites para API
  async rewrites() {
    return [
      {
        // Redirecionar apenas rotas de API que não sejam do NextAuth
        source: '/api/:path((?!auth).*)',
        destination: 'http://localhost:3001/api/:path*',
      },
    ]
  },
};

export default nextConfig;
