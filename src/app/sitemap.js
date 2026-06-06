import { createClient } from '@/lib/supabase-server'

export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://quicademy.com'
  const now = new Date().toISOString()

  // Static pages
  const staticPages = [
    { url: base,                  lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/courses`,     lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/how-it-works`,lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/for-business`,lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/about`,       lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/blog`,        lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
  ]

  try {
    const supabase = createClient()
    // Published courses
    const { data: courses } = await supabase
      .from('courses').select('id, updated_at').eq('published', true).eq('approved', true)
    const coursePages = (courses || []).map(c => ({
      url: `${base}/courses/${c.id}`,
      lastModified: c.updated_at || now,
      changeFrequency: 'weekly',
      priority: 0.8,
    }))
    // Blog posts
    const { data: posts } = await supabase
      .from('blog_posts').select('slug, updated_at').eq('published', true)
    const blogPages = (posts || []).map(p => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: p.updated_at || now,
      changeFrequency: 'monthly',
      priority: 0.6,
    }))
    return [...staticPages, ...coursePages, ...blogPages]
  } catch {
    return staticPages
  }
}
