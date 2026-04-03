import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Calendar } from 'lucide-react'

export const revalidate = 60

export async function generateMetadata({ params }) {
  const supabase = createClient()
  const { data: post } = await supabase.from('blog_posts').select('title,excerpt,cover_image_url').eq('slug', params.slug).single()
  if (!post) return { title: 'Post not found' }
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt, images: post.cover_image_url ? [post.cover_image_url] : [] },
    twitter: { card: 'summary_large_image', title: post.title, description: post.excerpt },
  }
}

export default async function BlogPostPage({ params }) {
  const supabase = createClient()
  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', params.slug)
    .eq('published', true)
    .single()

  if (!post) notFound()

  return (
    <div className="min-h-screen bg-violet-50">
      {/* Cover */}
      <div className="bg-gradient-to-br from-violet-900 to-violet-800 text-white py-16 px-5 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 48px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 48px)' }} />
        <div className="relative max-w-3xl mx-auto">
          <Link href="/blog" className="inline-flex items-center gap-2 font-mono text-xs text-violet-400 hover:text-violet-200 mb-6 transition-colors">
            <ArrowLeft size={13} /> Back to blog
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <span className="badge bg-violet-700 text-violet-200 border border-violet-600">{post.category}</span>
            <span className="font-mono text-xs text-violet-400 flex items-center gap-1"><Calendar size={11}/>{new Date(post.published_at).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</span>
            {post.read_time_mins && <span className="font-mono text-xs text-violet-400 flex items-center gap-1"><Clock size={11}/>{post.read_time_mins} min read</span>}
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-5">{post.title}</h1>
          <p className="font-sans text-lg text-violet-200 leading-relaxed">{post.excerpt}</p>
          {post.author_name && (
            <div className="flex items-center gap-3 mt-7 pt-7 border-t border-violet-800">
              <div className="w-9 h-9 rounded-full bg-solar flex items-center justify-center font-display font-bold text-violet-900">
                {post.author_name[0]}
              </div>
              <div>
                <p className="font-sans font-semibold text-sm text-white">{post.author_name}</p>
                {post.author_role && <p className="font-mono text-xs text-violet-400">{post.author_role}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-5 py-14">
        <div className="card p-8 md:p-12 prose prose-violet max-w-none
          prose-headings:font-display prose-headings:text-violet-900
          prose-p:font-sans prose-p:text-violet-800 prose-p:leading-relaxed
          prose-a:text-violet-600 prose-a:no-underline hover:prose-a:underline
          prose-strong:text-violet-900 prose-li:font-sans prose-li:text-violet-800">
          <div dangerouslySetInnerHTML={{ __html: post.content_html || '<p>Content coming soon.</p>' }} />
        </div>

        <div className="mt-10 pt-10 border-t border-border flex items-center justify-between">
          <Link href="/blog" className="btn-ghost">← All articles</Link>
          <Link href="/auth/register" className="btn-primary">Start learning free</Link>
        </div>
      </div>
    </div>
  )
}
