import { Inter as FontSans } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/components/auth/AuthProvider'
import Navbar from '@/components/layout/Navbar'
import './globals.css'

const fontSans = FontSans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://quicademy.com'),
  title: { default: 'Quicademy — Expert-Led Learning', template: '%s | Quicademy' },
  description: 'Expert-led courses with AI-powered personalized learning. Learn from industry professionals.',
  keywords: ['education', 'online learning', 'courses', 'GIS', 'geography', 'data science'],
  openGraph: {
    title: 'Quicademy — Expert-Led Learning',
    description: 'Expert-led courses with AI-powered personalized learning.',
    siteName: 'Quicademy',
    locale: 'en_US',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'Quicademy', description: 'Expert-led courses with AI.' },
  robots: { index: true, follow: true },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1a1035',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={fontSans.variable} suppressHydrationWarning>
      <body className="bg-violet-50 text-violet-900 antialiased">
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
        </AuthProvider>
        <Toaster
          position="bottom-center"
          toastOptions={{
            duration: 4000,
            style: { fontFamily: 'var(--font-sans)', fontSize: '14px', borderRadius: '10px' },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  )
}
