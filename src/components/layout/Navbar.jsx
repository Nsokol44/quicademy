'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { BookOpen, Menu, X, ChevronDown, LayoutDashboard, LogOut, Settings, GraduationCap } from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { href: '/courses',      label: 'Courses' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/for-business', label: 'For Business' },
]

function MenuLink({ href, icon: Icon, label, onClick }) {
  return (
    <Link href={href} onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2 text-sm text-violet-800 hover:bg-violet-50 transition-colors">
      <Icon size={14} className="text-violet-400" />{label}
    </Link>
  )
}

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()
  const [open, setOpen]   = useState(false)
  const [ddOpen, setDd]   = useState(false)
  const ddRef = useRef(null)

  useEffect(() => {
    const h = (e) => { if (ddRef.current && !ddRef.current.contains(e.target)) setDd(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const initial = (profile?.full_name || user?.email || 'Q')[0].toUpperCase()

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">

        <Link href="/" className="flex items-center gap-2.5 group" onClick={() => setOpen(false)}>
          <div className="w-8 h-8 rounded-lg bg-violet-700 flex items-center justify-center shadow-violet group-hover:bg-violet-800 transition-colors">
            <BookOpen size={15} className="text-white" />
          </div>
          <span className="font-display font-bold text-lg text-violet-900">
            Quica<span className="text-solar-600">demy</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href}
              className={clsx('px-4 py-2 rounded text-sm font-sans font-medium transition-colors',
                pathname === href ? 'text-violet-700 bg-violet-100' : 'text-violet-800 hover:text-violet-700 hover:bg-violet-50'
              )}>{label}</Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="relative" ref={ddRef}>
              <button onClick={() => setDd(!ddOpen)}
                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-border hover:border-violet-300 hover:bg-violet-50 transition-all">
                <div className="w-7 h-7 rounded-full bg-violet-700 flex items-center justify-center text-white text-xs font-bold">{initial}</div>
                <span className="text-sm font-medium text-violet-800">{profile?.full_name?.split(' ')[0] || 'Account'}</span>
                <ChevronDown size={13} className={clsx('text-violet-400 transition-transform', ddOpen && 'rotate-180')} />
              </button>
              {ddOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-border shadow-card-lg py-2 z-50">
                  <div className="px-4 py-2.5 border-b border-border mb-1">
                    <p className="text-xs font-mono text-muted truncate">{user.email}</p>
                    <p className="text-xs font-mono text-violet-500 capitalize mt-0.5">{profile?.role || 'student'}</p>
                  </div>
                  <MenuLink href="/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={() => setDd(false)} />
                  {profile?.role === 'instructor' && (
                    <MenuLink href="/instructor" icon={GraduationCap} label="Instructor Portal" onClick={() => setDd(false)} />
                  )}
                  <MenuLink href="/settings" icon={Settings} label="Settings" onClick={() => setDd(false)} />
                  <div className="border-t border-border mt-1 pt-1">
                    <button onClick={async () => { await signOut(); router.push('/'); setDd(false) }}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
                      <LogOut size={14} />Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/auth/login" className="btn-ghost">Sign in</Link>
              <Link href="/auth/register" className="btn-primary">Get started free</Link>
            </>
          )}
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden p-2 rounded text-violet-700 hover:bg-violet-100">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-white px-5 py-4 space-y-1">
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className="block py-2.5 text-sm font-medium text-violet-800 border-b border-border/60">{label}</Link>
          ))}
          <div className="pt-3 flex flex-col gap-2">
            {user ? (
              <>
                <Link href="/dashboard" onClick={() => setOpen(false)} className="btn-outline w-full">Dashboard</Link>
                <button onClick={async () => { await signOut(); router.push('/'); setOpen(false) }} className="btn-ghost text-red-500 w-full">Sign out</button>
              </>
            ) : (
              <>
                <Link href="/auth/login" onClick={() => setOpen(false)} className="btn-outline w-full">Sign in</Link>
                <Link href="/auth/register" onClick={() => setOpen(false)} className="btn-primary w-full">Get started free</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
