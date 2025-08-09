import NextAuth from 'next-auth'
import authConfig from '@/auth.config'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isOnLoginPage = req.nextUrl.pathname.startsWith('/login')
  
  // If not logged in and not on login page, redirect to login
  if (!isLoggedIn && !isOnLoginPage) {
    return Response.redirect(new URL('/login', req.nextUrl))
  }
  
  // If logged in and on login page, redirect to home
  if (isLoggedIn && isOnLoginPage) {
    return Response.redirect(new URL('/', req.nextUrl))
  }
  
  // Allow the request to continue
  return null
})

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|register).*)',
  ],
}