import 'next-auth'
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    email: string
    name: string
    role: string
    accessToken: string
  }

  interface Session extends DefaultSession {
    user: {
      id: string
      email: string
      name: string
      role: string
    } & DefaultSession['user']
    accessToken: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    email: string
    name: string
    role: string
    accessToken: string
  }
} 