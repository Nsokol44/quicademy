import { SITE_URL } from '@/lib/constants'

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/instructor', '/blog/admin', '/settings', '/onboarding'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
