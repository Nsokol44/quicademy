import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export async function GET() {
  const start = Date.now()
  const checks = {
    database:   'checking',
    gemini_key: !!process.env.GEMINI_API_KEY ? 'ok' : 'missing',
    supabase:   !!process.env.NEXT_PUBLIC_SUPABASE_URL ? 'ok' : 'missing',
    resend:     !!process.env.RESEND_API_KEY ? 'ok' : 'not_configured',
  }
  try {
    const { createServerClient } = await import('@supabase/ssr')
    const { cookies } = await import('next/headers')
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { get(n) { return cookieStore.get(n)?.value }, set(){}, remove(){} } }
    )
    const { error } = await supabase.from('profiles').select('id').limit(1)
    checks.database = error ? 'degraded' : 'ok'
  } catch { checks.database = 'down' }

  const allOk = checks.database === 'ok' && checks.supabase === 'ok'
  return NextResponse.json({
    status: allOk ? 'healthy' : 'degraded',
    latency: `${Date.now() - start}ms`,
    checks,
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
    timestamp: new Date().toISOString(),
  }, { status: allOk ? 200 : 503, headers: { 'Cache-Control': 'no-store' } })
}
