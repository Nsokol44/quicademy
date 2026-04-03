import { createClient } from '@/lib/supabase-server'
import { SITE_URL } from '@/lib/constants'

export default async function sitemap() {
  const supabase = createClient()

  const [{ data: courses }, { data: posts }] = await Promise.all([
    supabase.from('courses').select('id,updated_at').eq('published', true).eq('approved', true),
    supabase.from('blog_posts').select('slug,published_at').eq('published', true),
  ])

  const staticRoutes = [
    { url: SITE_URL,                         lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${SITE_URL}/courses`,            lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE_URL}/how-it-works`,       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/for-business`,       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/about`,              lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/blog`,               lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${SITE_URL}/contact`,            lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/auth/register`,      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  ]

  const courseRoutes = (courses || []).map(c => ({
    url: `${SITE_URL}/courses/${c.id}`,
    lastModified: new Date(c.updated_at),
    changeFrequency: 'weekly',
    priority: 0.85,
  }))

  const blogRoutes = (posts || []).map(p => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.published_at),
    changeFrequency: 'monthly',
    priority: 0.75,
  }))

  return [...staticRoutes, ...courseRoutes, ...blogRoutes]
}
