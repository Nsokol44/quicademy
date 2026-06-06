export default function robots() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://quicademy.com'
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/instructor', '/admin', '/api/', '/learn/', '/live-room/', '/classroom/', '/settings'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
