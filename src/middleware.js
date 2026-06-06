import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Routes that require authentication
const PROTECTED = ['/dashboard', '/instructor', '/learn', '/classroom', '/live-room', '/classes', '/settings', '/onboarding', '/admin']
// Routes only accessible when NOT logged in
const AUTH_ONLY  = ['/auth/login', '/auth/register']

export async function middleware(request) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request: { headers: request.headers } })

  // Create Supabase client with cookie passthrough
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return request.cookies.get(name)?.value },
        set(name, value, options) { response.cookies.set({ name, value, ...options }) },
        remove(name, options) { response.cookies.set({ name, value: '', ...options }) },
      },
    }
  )

  // Refresh session if expired — critical for SSR
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users away from protected pages
  const isProtected = PROTECTED.some(p => pathname.startsWith(p))
  if (isProtected && !user) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from login/register
  const isAuthOnly = AUTH_ONLY.some(p => pathname.startsWith(p))
  if (isAuthOnly && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Match all except static files, _next internals, and api routes
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
