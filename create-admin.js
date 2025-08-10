const { PrismaClient } = require('./node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    console.log('🔍 Verificando usuários existentes...')
    const existingUsers = await prisma.user.findMany()
    console.log(`📊 Encontrados ${existingUsers.length} usuários no banco`)
    
    if (existingUsers.length > 0) {
      console.log('📝 Usuários existentes:')
      existingUsers.forEach(user => {
        console.log(`  - ${user.email} (${user.role}) - Ativo: ${user.isActive}`)
      })
    }
    
    // Create admin user if none exists
    const adminEmail = 'admin@achadinhos.com'
    const adminPassword = '123456'
    
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    })
    
    if (!existingAdmin) {
      console.log('👤 Criando usuário admin...')
      const hashedPassword = await bcrypt.hash(adminPassword, 10)
      
      const admin = await prisma.user.create({
        data: {
          email: adminEmail,
          name: 'Administrador',
          password: hashedPassword,
          role: 'ADMIN',
          isActive: true
        }
      })
      
      console.log('✅ Usuário admin criado com sucesso!')
      console.log(`📧 Email: ${admin.email}`)
      console.log(`🔑 Senha: ${adminPassword}`)
    } else {
      console.log('⚠️  Usuário admin já existe')
      
      // Check if password is correct
      const isValidPassword = await bcrypt.compare(adminPassword, existingAdmin.password)
      if (!isValidPassword) {
        console.log('🔄 Atualizando senha do admin...')
        const hashedPassword = await bcrypt.hash(adminPassword, 10)
        await prisma.user.update({
          where: { email: adminEmail },
          data: { password: hashedPassword }
        })
        console.log('✅ Senha atualizada!')
      }
      
      console.log(`📧 Email: ${existingAdmin.email}`)
      console.log(`🔑 Senha: ${adminPassword}`)
      console.log(`👤 Role: ${existingAdmin.role}`)
      console.log(`✅ Ativo: ${existingAdmin.isActive}`)
    }
    
  } catch (error) {
    console.error('❌ Erro ao criar admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()