import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Download, ExternalLink, ArrowLeft, Calendar, Hash, Globe, Layers } from 'lucide-react'

export async function generateMetadata({ params }) {
  const supabase = createClient()
  const { data } = await supabase.from('books').select('title,short_desc,cover_url').eq('slug', params.slug).single()
  if (!data) return { title: 'Book not found' }
  return {
    title: data.title,
    description: data.short_desc,
    openGraph: { title: data.title, description: data.short_desc, images: data.cover_url ? [data.cover_url] : [] },
  }
}

export const revalidate = 60

export default async function BookPage({ params }) {
  const supabase = createClient()

  const { data: book } = await supabase
    .from('books')
    .select('*, author:author_id(id, full_name, credentials, bio)')
    .eq('slug', params.slug)
    .eq('published', true)
    .single()

  if (!book) notFound()

  // Other books by same author
  const { data: moreBooks } = book.author_id
    ? await supabase.from('books').select('id, title, slug, cover_url, categories, short_desc')
        .eq('author_id', book.author_id).eq('published', true).neq('id', book.id).limit(3)
    : { data: [] }

  return (
    <div className="min-h-screen bg-violet-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-border px-5 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-2 font-mono text-xs text-muted">
          <Link href="/press" className="hover:text-violet-700 flex items-center gap-1 transition-colors">
            <ArrowLeft size={12}/> Quicademy Press
          </Link>
          <span>/</span>
          <span className="text-violet-700 truncate">{book.title}</span>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-violet-900 text-white py-16 px-5">
        <div className="max-w-5xl mx-auto grid md:grid-cols-[220px_1fr] gap-10 items-start">
          {/* Cover */}
          <div className="mx-auto md:mx-0">
            <div className="w-48 h-64 rounded-xl shadow-2xl overflow-hidden bg-gradient-to-br from-violet-700 to-violet-950 flex items-center justify-center">
              {book.cover_url ? (
                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover"/>
              ) : (
                <div className="p-6 text-center">
                  <p className="font-display text-lg font-bold text-white/80 leading-tight mb-3">{book.title}</p>
                  <div className="w-8 h-0.5 bg-solar-400/60 rounded-full mx-auto mb-2"/>
                  <p className="font-mono text-xs text-white/40">Quicademy Press</p>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              {(book.categories || []).map(c => (
                <span key={c} className="badge bg-white/15 text-white border-0">{c}</span>
              ))}
            </div>
            <h1 className="font-display text-4xl font-bold mb-2 leading-tight">{book.title}</h1>
            {book.subtitle && <p className="font-sans text-violet-200 text-xl italic mb-3">{book.subtitle}</p>}
            {book.author && (
              <p className="font-sans text-violet-300 mb-2">
                by <span className="text-white font-semibold">{book.author.full_name}</span>
                {book.author.credentials && <span className="text-violet-400"> — {book.author.credentials}</span>}
              </p>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap gap-5 mt-4 text-sm text-violet-300">
              {book.publisher    && <span className="flex items-center gap-1.5"><BookOpen size={13}/>{book.publisher}</span>}
              {book.publish_date && <span className="flex items-center gap-1.5"><Calendar size={13}/>{new Date(book.publish_date).getFullYear()}</span>}
              {book.pages        && <span className="flex items-center gap-1.5"><Layers size={13}/>{book.pages} pages</span>}
              {book.edition      && <span className="flex items-center gap-1.5"><Hash size={13}/>{book.edition}</span>}
              {book.language     && <span className="flex items-center gap-1.5"><Globe size={13}/>{book.language}</span>}
              {book.isbn         && <span className="flex items-center gap-1.5 font-mono text-xs">ISBN {book.isbn}</span>}
            </div>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-3 mt-8">
              {book.purchase_url && (
                <a href={book.purchase_url} target="_blank" rel="noopener noreferrer"
                  className="btn-solar inline-flex items-center gap-2">
                  <ExternalLink size={14}/>
                  {book.is_free ? 'Get this book' : `Buy — ${book.price ? `$${Number(book.price).toFixed(2)}` : 'Get a copy'}`}
                </a>
              )}
              {book.pdf_url && (
                <a href={book.pdf_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/30 text-white hover:bg-white/10 transition-colors font-sans text-sm font-semibold">
                  <Download size={14}/> Download PDF
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-5 py-12 grid md:grid-cols-[1fr_280px] gap-10">
        <div>
          {/* Description */}
          {book.description && (
            <div className="card p-7 mb-6">
              <h2 className="font-display text-xl font-bold text-violet-900 mb-4">About this book</h2>
              <div className="font-sans text-sm text-violet-800 leading-relaxed whitespace-pre-wrap">
                {book.description}
              </div>
            </div>
          )}

          {/* Tags */}
          {book.tags?.length > 0 && (
            <div className="card p-5 mb-6">
              <h3 className="font-mono text-xs text-muted uppercase tracking-wider mb-3">Topics</h3>
              <div className="flex flex-wrap gap-2">
                {book.tags.map(t => <span key={t} className="badge-violet text-xs">{t}</span>)}
              </div>
            </div>
          )}

          {/* About author */}
          {book.author?.bio && (
            <div className="card p-6">
              <h2 className="font-display text-lg font-bold text-violet-900 mb-4">About the author</h2>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-violet-700 flex items-center justify-center text-white font-display font-bold text-lg flex-shrink-0">
                  {book.author.full_name[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-sans font-semibold text-sm text-violet-900">{book.author.full_name}</p>
                  {book.author.credentials && <p className="font-mono text-xs text-violet-500 mb-2">{book.author.credentials}</p>}
                  <p className="font-sans text-sm text-muted leading-relaxed">{book.author.bio}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Buy box */}
          <div className="card p-5 sticky top-20">
            <div className="text-center mb-5">
              {book.is_free ? (
                <p className="font-display text-3xl font-bold text-violet-900">Free</p>
              ) : book.price ? (
                <p className="font-display text-3xl font-bold text-violet-900">${Number(book.price).toFixed(2)}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              {book.purchase_url && (
                <a href={book.purchase_url} target="_blank" rel="noopener noreferrer"
                  className="btn-primary w-full justify-center">
                  <ExternalLink size={14}/> {book.is_free ? 'Get this book' : 'Buy now'}
                </a>
              )}
              {book.pdf_url && (
                <a href={book.pdf_url} target="_blank" rel="noopener noreferrer"
                  className="btn-outline w-full justify-center">
                  <Download size={14}/> Download PDF
                </a>
              )}
              {!book.purchase_url && !book.pdf_url && (
                <p className="font-sans text-xs text-muted text-center">Purchase link coming soon</p>
              )}
            </div>
          </div>

          {/* More by this author */}
          {moreBooks?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-display text-sm font-bold text-violet-900 mb-4">More by this author</h3>
              <div className="space-y-3">
                {moreBooks.map(b => (
                  <Link key={b.id} href={`/press/${b.slug}`}
                    className="flex items-start gap-3 hover:bg-violet-50 rounded-lg p-2 -mx-2 transition-colors">
                    <div className="w-10 h-12 rounded bg-gradient-to-br from-violet-700 to-violet-900 flex items-center justify-center flex-shrink-0">
                      {b.cover_url
                        ? <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover rounded"/>
                        : <BookOpen size={12} className="text-white/60"/>
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="font-sans text-xs font-semibold text-violet-900 line-clamp-2">{b.title}</p>
                      {(b.categories || []).slice(0,1).map(c => (
                        <span key={c} className="font-mono text-xs text-muted">{c}</span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <Link href="/press" className="btn-ghost w-full justify-center text-sm">
            <ArrowLeft size={13}/> All books
          </Link>
        </div>
      </div>
    </div>
  )
}
