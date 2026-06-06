'use client'
import { useState } from 'react'
import Link from 'next/link'
import { BookOpen, Star, ExternalLink, Download, Search, Filter } from 'lucide-react'
import clsx from 'clsx'

export default function PressClient({ books, authors }) {
  const [search,   setSearch]   = useState('')
  const [category, setCategory] = useState('All')

  // Collect all unique categories
  const allCategories = ['All', ...new Set(books.flatMap(b => b.categories || []).filter(Boolean))]

  const filtered = books.filter(b => {
    const matchSearch = !search ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.description?.toLowerCase().includes(search.toLowerCase()) ||
      b.author?.full_name?.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'All' || (b.categories || []).includes(category)
    return matchSearch && matchCat
  })

  const featured = filtered.filter(b => b.featured)
  const rest      = filtered.filter(b => !b.featured)

  return (
    <div className="min-h-screen bg-violet-50">
      {/* Hero */}
      <div className="bg-violet-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 1px,transparent 24px)' }}/>
        <div className="relative max-w-6xl mx-auto px-5 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
            <BookOpen size={13} className="text-solar-400"/>
            <span className="font-mono text-xs text-solar-300 tracking-wider uppercase">Quicademy Press</span>
          </div>
          <h1 className="font-display text-5xl font-bold mb-4 leading-tight">
            Expert knowledge.<br/>
            <span className="text-solar">Now in print.</span>
          </h1>
          <p className="font-sans text-violet-200 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            Books authored by our instructors — the same depth and rigor as our courses,
            formatted for deep reading, reference, and self-publishing.
          </p>
          {/* Search */}
          <div className="max-w-lg mx-auto">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur border border-white/20 rounded-xl px-4 py-3">
              <Search size={16} className="text-violet-400 flex-shrink-0"/>
              <input
                className="flex-1 bg-transparent text-white placeholder:text-violet-400 font-sans text-sm focus:outline-none"
                placeholder="Search books, topics, authors…"
                value={search} onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-12">
        {/* Category filters */}
        {allCategories.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-10">
            {allCategories.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={clsx('px-4 py-1.5 rounded-full font-mono text-xs transition-all',
                  category === cat
                    ? 'bg-violet-700 text-white shadow-violet'
                    : 'bg-white border border-border text-muted hover:border-violet-300 hover:text-violet-700'
                )}>
                {cat}
              </button>
            ))}
          </div>
        )}

        {books.length === 0 ? (
          // Empty state
          <div className="card p-20 text-center">
            <BookOpen size={36} className="text-violet-300 mx-auto mb-4"/>
            <h2 className="font-display text-2xl font-bold text-violet-900 mb-2">Coming soon</h2>
            <p className="font-sans text-sm text-muted max-w-sm mx-auto">
              Our first publications are in preparation. Check back soon.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="font-sans text-sm text-muted">No books match your search.</p>
            <button onClick={() => { setSearch(''); setCategory('All') }} className="btn-ghost mt-4 mx-auto text-sm">
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {/* Featured books — large hero cards */}
            {featured.length > 0 && (
              <div className="mb-12">
                <h2 className="font-display text-2xl font-bold text-violet-900 mb-6 flex items-center gap-2">
                  <Star size={18} className="text-solar-500"/> Featured
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {featured.map(book => <BookCardLarge key={book.id} book={book}/>)}
                </div>
              </div>
            )}

            {/* All other books */}
            {rest.length > 0 && (
              <div>
                {featured.length > 0 && (
                  <h2 className="font-display text-2xl font-bold text-violet-900 mb-6">All Books</h2>
                )}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {rest.map(book => <BookCard key={book.id} book={book}/>)}
                </div>
              </div>
            )}
          </>
        )}

        {/* About Quicademy Press */}
        <div className="mt-20 card p-10 bg-violet-900 text-white text-center">
          <BookOpen size={28} className="text-solar-400 mx-auto mb-4"/>
          <h2 className="font-display text-2xl font-bold mb-3">About Quicademy Press</h2>
          <p className="font-sans text-violet-200 text-sm leading-relaxed max-w-2xl mx-auto mb-6">
            Quicademy Press publishes practical, expert-authored books in geographic information systems,
            data science, and applied technology. Our books are written by the same instructors who teach
            our courses — deep expertise, clear writing, real-world examples.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/courses" className="btn-solar">Browse our courses</Link>
            <Link href="/about" className="btn-ghost border-white/20 text-white hover:bg-white/10">About us</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Large featured book card ── */
function BookCardLarge({ book }) {
  return (
    <Link href={`/press/${book.slug}`}
      className="card hover:shadow-card-lg hover:-translate-y-1 transition-all overflow-hidden flex flex-col md:flex-row group">
      {/* Cover */}
      <div className="md:w-48 h-56 md:h-auto flex-shrink-0 bg-gradient-to-br from-violet-800 to-violet-950 flex items-center justify-center relative overflow-hidden">
        {book.cover_url ? (
          <img src={book.cover_url} alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
        ) : (
          <BookCoverPlaceholder title={book.title} large/>
        )}
        {book.featured && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-solar text-violet-900 px-2 py-0.5 rounded-full">
            <Star size={10} className="fill-violet-900"/> <span className="font-mono text-xs font-bold">Featured</span>
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-6 flex flex-col justify-between flex-1">
        <div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(book.categories || []).slice(0, 3).map(c => (
              <span key={c} className="badge-violet text-xs">{c}</span>
            ))}
          </div>
          <h3 className="font-display text-xl font-bold text-violet-900 mb-1 leading-snug">{book.title}</h3>
          {book.subtitle && <p className="font-sans text-sm text-violet-600 mb-2 italic">{book.subtitle}</p>}
          {book.author && <p className="font-mono text-xs text-muted mb-3">{book.author.full_name}</p>}
          <p className="font-sans text-sm text-muted leading-relaxed line-clamp-3">{book.short_desc || book.description}</p>
        </div>
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
          <PriceTag book={book}/>
          <BookActions book={book} small/>
        </div>
      </div>
    </Link>
  )
}

/* ── Standard book card ── */
function BookCard({ book }) {
  return (
    <Link href={`/press/${book.slug}`}
      className="card hover:shadow-card-lg hover:-translate-y-1 transition-all overflow-hidden flex flex-col group">
      {/* Cover */}
      <div className="h-56 bg-gradient-to-br from-violet-800 to-violet-950 flex-shrink-0 flex items-center justify-center relative overflow-hidden">
        {book.cover_url ? (
          <img src={book.cover_url} alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
        ) : (
          <BookCoverPlaceholder title={book.title}/>
        )}
      </div>
      {/* Info */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {(book.categories || []).slice(0, 2).map(c => (
            <span key={c} className="badge-violet text-xs">{c}</span>
          ))}
        </div>
        <h3 className="font-display text-base font-bold text-violet-900 mb-0.5 leading-snug">{book.title}</h3>
        {book.author && <p className="font-mono text-xs text-muted mb-2">{book.author.full_name}</p>}
        <p className="font-sans text-xs text-muted leading-relaxed line-clamp-2 flex-1">
          {book.short_desc || book.description}
        </p>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <PriceTag book={book}/>
          <BookActions book={book} small/>
        </div>
      </div>
    </Link>
  )
}

function PriceTag({ book }) {
  if (book.is_free) return <span className="badge-solar text-xs font-bold">Free</span>
  if (book.price)   return <span className="font-display text-lg font-bold text-violet-900">${Number(book.price).toFixed(2)}</span>
  return null
}

function BookActions({ book, small }) {
  return (
    <div className="flex items-center gap-2" onClick={e => e.preventDefault()}>
      {book.pdf_url && (
        <a href={book.pdf_url} target="_blank" rel="noopener noreferrer"
          className="p-1.5 rounded-lg hover:bg-violet-100 text-violet-400 hover:text-violet-700 transition-colors"
          title="Download PDF">
          <Download size={small ? 14 : 16}/>
        </a>
      )}
      {book.purchase_url && (
        <a href={book.purchase_url} target="_blank" rel="noopener noreferrer"
          className="p-1.5 rounded-lg hover:bg-violet-100 text-violet-400 hover:text-violet-700 transition-colors"
          title="Buy this book">
          <ExternalLink size={small ? 14 : 16}/>
        </a>
      )}
    </div>
  )
}

function BookCoverPlaceholder({ title, large }) {
  const words = title.split(' ').slice(0, 4)
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
      <div className={clsx('font-display font-bold text-white/80 leading-tight',
        large ? 'text-2xl' : 'text-lg')}>
        {words.map((w, i) => <div key={i}>{w}</div>)}
      </div>
      <div className="mt-3 w-8 h-0.5 bg-solar-400/60 rounded-full"/>
      <p className="font-mono text-xs text-white/40 mt-2">Quicademy Press</p>
    </div>
  )
}
