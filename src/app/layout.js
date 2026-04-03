import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/components/auth/AuthProvider'
import Navbar from '@/components/layout/Navbar'
import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quicademy.com'

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Quicademy — Expert-Led Education',
    template: '%s | Quicademy',
  },
  description: 'AI-powered education combining expert human instruction with personalized learning. Proven to improve retention by up to 72%.',
  keywords: ['online learning', 'AI education', 'expert instructors', 'personalized learning', 'skills training', 'professional development'],
  authors: [{ name: 'Quicademy' }],
  creator: 'Quicademy',
  publisher: 'Quicademy',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    type: 'website',
    siteName: 'Quicademy',
    title: 'Quicademy — Expert-Led Education',
    description: 'AI meets human expertise for measurably better learning outcomes.',
    url: siteUrl,
    images: [{ url: `${siteUrl}/og-default.png`, width: 1200, height: 630, alt: 'Quicademy' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Quicademy — Expert-Led Education',
    description: 'AI meets human expertise for measurably better learning outcomes.',
    images: [`${siteUrl}/og-default.png`],
  },
  alternates: { canonical: siteUrl },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'Quicademy',
  url: siteUrl,
  description: 'AI-powered education platform combining expert human instruction with personalized learning.',
  sameAs: [],
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-surface text-ink font-sans">
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
          <Toaster position="bottom-center" toastOptions={{
            style: {
              background: '#1a1035',
              color: '#faf7ff',
              borderRadius: '10px',
              padding: '12px 20px',
              fontSize: '0.875rem',
              fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
              border: '1px solid rgba(196,174,232,0.2)',
            },
            success: { iconTheme: { primary: '#f5c842', secondary: '#1a1035' } },
          }} />
        </AuthProvider>
      </body>
    </html>
  )
}
