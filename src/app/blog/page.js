import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { ArrowRight, Clock } from 'lucide-react'

export const metadata = {
  title: 'Blog — Quicademy',
  description: 'Insights on learning science, AI in education, expert instruction, and skill development from the Quicademy team.',
}

export const revalidate = 60

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })
}

export default async function BlogPage() {
  const supabase = createClient()
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('id,title,slug,excerpt,category,published_at,read_time_mins,cover_image_url')
    .eq('published', true)
    .order('published_at', { ascending: false })

  const featured = posts?.[0]
  const rest = posts?.slice(1) || []

  return (
    <div className="min-h-screen bg-violet-50">
      <div className="bg-violet-900 text-white py-16 px-5">
        <div className="max-w-5xl mx-auto">
          <p className="font-mono text-xs text-violet-400 uppercase tracking-widest mb-3">The Quicademy Blog</p>
          <h1 className="font-display text-4xl font-bold mb-3">Learning, science, and the future of education</h1>
          <p className="font-sans text-violet-300 text-base max-w-xl">Practical insights from instructors, researchers, and the team building Quicademy.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-14">
        {(!posts || posts.length === 0) ? (
          <div className="card p-16 text-center">
            <p className="font-display text-xl font-semibold text-violet-900 mb-2">Coming soon</p>
            <p className="font-sans text-sm text-muted">We're writing our first articles. Check back soon.</p>
          </div>
        ) : (
          <>
            {/* Featured */}
            {featured && (
              <Link href={`/blog/${featured.slug}`} className="card hover:shadow-card-lg transition-all mb-10 flex flex-col md:flex-row overflow-hidden group">
                <div className="md:w-2/5 h-52 md:h-auto bg-gradient-to-br from-violet-700 to-violet-900 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                  <span className="font-display text-7xl font-bold text-white/10 select-none">{featured.title[0]}</span>
                  {featured.cover_image_url && (
                    <img src={featured.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  )}
                </div>
                <div className="p-8 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="badge-violet">{featured.category}</span>
                      <span className="font-mono text-xs text-muted">{formatDate(featured.published_at)}</span>
                    </div>
                    <h2 className="font-display text-2xl font-bold text-violet-900 mb-3 group-hover:text-violet-700 transition-colors">{featured.title}</h2>
                    <p className="font-sans text-sm text-muted leading-relaxed">{featured.excerpt}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-5 text-violet-600 font-sans text-sm font-medium">
                    Read article <ArrowRight size={14} />
                    {featured.read_time_mins && <span className="ml-auto flex items-center gap-1 text-muted font-normal"><Clock size={12}/>{featured.read_time_mins} min read</span>}
                  </div>
                </div>
              </Link>
            )}

            {/* Grid */}
            {rest.length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map(post => (
                  <Link key={post.id} href={`/blog/${post.slug}`} className="card hover:shadow-card-lg hover:-translate-y-0.5 transition-all flex flex-col group">
                    <div className="h-36 bg-gradient-to-br from-violet-700 to-violet-900 rounded-t-lg flex items-center justify-center relative overflow-hidden">
                      <span className="font-display text-5xl font-bold text-white/15 select-none">{post.title[0]}</span>
                      {post.cover_image_url && <img src={post.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="badge-violet text-xs">{post.category}</span>
                        {post.read_time_mins && <span className="font-mono text-xs text-muted ml-auto flex items-center gap-1"><Clock size={10}/>{post.read_time_mins}m</span>}
                      </div>
                      <h3 className="font-display text-base font-semibold text-violet-900 mb-2 leading-snug group-hover:text-violet-700 transition-colors">{post.title}</h3>
                      <p className="font-sans text-xs text-muted leading-relaxed flex-1">{post.excerpt}</p>
                      <p className="font-mono text-xs text-violet-400 mt-4">{formatDate(post.published_at)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
