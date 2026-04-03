'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CATEGORIES } from '@/lib/constants'
import { Search, Clock, BookOpen, Filter } from 'lucide-react'
import clsx from 'clsx'

const LEVELS = ['all','beginner','intermediate','advanced']
const LEVEL_LABEL = { all:'All Levels', beginner:'Beginner', intermediate:'Intermediate', advanced:'Advanced' }

export default function CoursesClient({ courses, activeCategory, activeLevel }) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filtered = courses.filter(c =>
    (!search || c.title.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase()))
  )

  const setFilter = (cat, lvl) => {
    const params = new URLSearchParams()
    if (cat && cat !== 'all') params.set('category', cat)
    if (lvl && lvl !== 'all') params.set('level', lvl)
    router.push(`/courses?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-violet-50">
      {/* Header */}
      <div className="bg-violet-900 text-white py-16 px-5 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 48px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 48px)' }} />
        <div className="relative max-w-7xl mx-auto">
          <p className="font-mono text-xs text-violet-400 uppercase tracking-widest mb-3">Course Library</p>
          <h1 className="font-display text-4xl font-bold mb-4">Find your next skill</h1>
          <p className="font-sans text-violet-300 text-base mb-8 max-w-lg">
            Every course is built by vetted experts and enhanced with AI-personalized delivery.
          </p>
          {/* Search */}
          <div className="relative max-w-lg">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-400" />
            <input type="text" placeholder="Search courses…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-violet-400 font-sans text-sm focus:outline-none focus:border-solar-400 focus:bg-white/15 transition-all" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 py-10">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="flex items-center gap-2 text-xs font-mono text-muted">
            <Filter size={12} /> Filter:
          </div>
          {/* Category */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilter('all', activeLevel)}
              className={clsx('badge transition-all', activeCategory==='all' ? 'bg-violet-700 text-white' : 'badge-violet hover:bg-violet-200')}>
              All Categories
            </button>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setFilter(cat, activeLevel)}
                className={clsx('badge transition-all', activeCategory===cat ? 'bg-violet-700 text-white' : 'badge-violet hover:bg-violet-200')}>
                {cat}
              </button>
            ))}
          </div>
          {/* Level */}
          <div className="flex gap-2 ml-auto">
            {LEVELS.map(l => (
              <button key={l} onClick={() => setFilter(activeCategory, l)}
                className={clsx('badge transition-all', activeLevel===l ? 'bg-solar text-violet-900 font-bold' : 'badge-solar hover:bg-solar-200')}>
                {LEVEL_LABEL[l]}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="font-mono text-xs text-muted mb-6">
          {filtered.length} course{filtered.length !== 1 ? 's' : ''} found
        </p>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(c => <CourseCard key={c.id} course={c} />)}
          </div>
        ) : (
          <div className="card p-16 text-center">
            <BookOpen size={32} className="text-violet-300 mx-auto mb-4" />
            <h3 className="font-display text-lg font-semibold text-violet-900 mb-2">No courses found</h3>
            <p className="font-sans text-sm text-muted">Try adjusting your filters or search term.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function CourseCard({ course: c }) {
  return (
    <Link href={`/courses/${c.id}`} className="card hover:shadow-card-lg hover:-translate-y-0.5 transition-all flex flex-col group">
      <div className="h-44 bg-gradient-to-br from-violet-700 to-violet-900 rounded-t-lg flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 1px,transparent 12px)' }} />
        <span className="font-display text-5xl font-bold text-white/20 select-none">{c.category?.[0]}</span>
        <div className="absolute bottom-3 left-3 flex gap-2">
          {c.is_free && <span className="badge-solar text-xs">Free</span>}
          <span className="badge bg-white/20 text-white text-xs">{LEVEL_LABEL[c.level] || c.level}</span>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <p className="font-mono text-xs text-violet-400 mb-1">{c.category}</p>
        <h3 className="font-display text-base font-semibold text-violet-900 mb-2 leading-snug group-hover:text-violet-700 transition-colors">{c.title}</h3>
        <p className="font-sans text-xs text-muted leading-relaxed flex-1">{c.short_desc}</p>
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
          <Clock size={12} className="text-muted" />
          <span className="font-mono text-xs text-muted">{c.duration_hours}h</span>
          {c.tags?.slice(0,2).map(t => (
            <span key={t} className="badge-violet ml-auto first:ml-auto">{t}</span>
          ))}
        </div>
      </div>
    </Link>
  )
}


