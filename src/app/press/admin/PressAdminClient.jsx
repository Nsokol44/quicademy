'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import {
  Plus, Edit3, Trash2, Eye, EyeOff, Star, Upload,
  BookOpen, X, Check, ExternalLink, Download, ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const EMPTY_BOOK = {
  title: '', subtitle: '', slug: '', short_desc: '', description: '',
  cover_url: '', pdf_url: '', purchase_url: '',
  isbn: '', publisher: 'Quicademy Press', publish_date: '',
  pages: '', edition: '1st Edition', language: 'English',
  categories: '', tags: '',
  price: '', is_free: false, published: false, featured: false,
  author_id: '',
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function PressAdminClient({ books: initial, authors, userId }) {
  const supabase = createClient()
  const [books,    setBooks]    = useState(initial)
  const [editing,  setEditing]  = useState(null) // null | 'new' | book.id
  const [form,     setForm]     = useState(EMPTY_BOOK)
  const [saving,   setSaving]   = useState(false)
  const coverRef = useRef(null)
  const pdfRef   = useRef(null)
  const [uploading, setUploading] = useState({ cover: false, pdf: false })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const openNew = () => {
    setForm({ ...EMPTY_BOOK, author_id: userId })
    setEditing('new')
  }

  const openEdit = (book) => {
    setForm({
      ...book,
      categories: (book.categories || []).join(', '),
      tags:       (book.tags || []).join(', '),
      pages:      book.pages || '',
      price:      book.price || '',
      publish_date: book.publish_date || '',
    })
    setEditing(book.id)
  }

  const uploadFile = async (file, folder, type) => {
    setUploading(u => ({ ...u, [type]: true }))
    try {
      const ext  = file.name.split('.').pop()
      const path = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error } = await supabase.storage.from('press-assets').upload(path, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('press-assets').getPublicUrl(path)
      return publicUrl
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`)
      return null
    } finally {
      setUploading(u => ({ ...u, [type]: false }))
    }
  }

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const url = await uploadFile(file, 'covers', 'cover')
    if (url) { set('cover_url', url); toast.success('Cover uploaded!') }
  }

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const url = await uploadFile(file, 'pdfs', 'pdf')
    if (url) { set('pdf_url', url); toast.success('PDF uploaded!') }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return toast.error('Title is required')
    setSaving(true)
    try {
      const payload = {
        ...form,
        slug:       form.slug || slugify(form.title),
        categories: form.categories.split(',').map(s => s.trim()).filter(Boolean),
        tags:       form.tags.split(',').map(s => s.trim()).filter(Boolean),
        pages:      parseInt(form.pages) || null,
        price:      parseFloat(form.price) || null,
        publish_date: form.publish_date || null,
        author_id:  form.author_id || null,
      }
      delete payload.author // remove join field

      if (editing === 'new') {
        const { data, error } = await supabase.from('books').insert(payload).select('*, author:author_id(full_name)').single()
        if (error) throw error
        setBooks(b => [data, ...b])
        toast.success('Book added!')
      } else {
        const { data, error } = await supabase.from('books').update(payload).eq('id', editing).select('*, author:author_id(full_name)').single()
        if (error) throw error
        setBooks(b => b.map(x => x.id === editing ? data : x))
        toast.success('Book saved!')
      }
      setEditing(null)
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const deleteBook = async (id, title) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    const { error } = await supabase.from('books').delete().eq('id', id)
    if (error) return toast.error(error.message)
    setBooks(b => b.filter(x => x.id !== id))
    toast.success('Book deleted')
  }

  const toggle = async (id, field) => {
    const book = books.find(b => b.id === id)
    const newVal = !book[field]
    const { error } = await supabase.from('books').update({ [field]: newVal }).eq('id', id)
    if (error) return toast.error(error.message)
    setBooks(b => b.map(x => x.id === id ? { ...x, [field]: newVal } : x))
  }

  return (
    <div className="min-h-screen bg-violet-50 py-10 px-5">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link href="/admin" className="text-violet-500 hover:text-violet-700 transition-colors">
                <ArrowLeft size={16}/>
              </Link>
              <h1 className="font-display text-3xl font-bold text-violet-900">Press Admin</h1>
            </div>
            <p className="font-sans text-sm text-muted">{books.length} book{books.length !== 1 ? 's' : ''} · <Link href="/press" className="text-violet-600 hover:underline" target="_blank">View public page ↗</Link></p>
          </div>
          <button onClick={openNew} className="btn-primary">
            <Plus size={14}/> Add book
          </button>
        </div>

        {/* Form */}
        {editing && (
          <div className="card p-7 mb-8 border-violet-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold text-violet-900">
                {editing === 'new' ? 'New Book' : 'Edit Book'}
              </h2>
              <button onClick={() => setEditing(null)}><X size={18} className="text-muted hover:text-violet-700"/></button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              {/* Cover + basic info */}
              <div className="grid md:grid-cols-[160px_1fr] gap-6 items-start">
                {/* Cover upload */}
                <div>
                  <label className="field-label">Cover image</label>
                  <div className="relative">
                    <div className="w-full aspect-[2/3] rounded-xl bg-gradient-to-br from-violet-700 to-violet-900 overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => coverRef.current?.click()}>
                      {uploading.cover ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                      ) : form.cover_url ? (
                        <img src={form.cover_url} alt="Cover" className="w-full h-full object-cover"/>
                      ) : (
                        <div className="text-center p-3">
                          <Upload size={18} className="text-white/60 mx-auto mb-2"/>
                          <p className="font-mono text-xs text-white/50">Upload cover</p>
                        </div>
                      )}
                    </div>
                    <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload}/>
                    {form.cover_url && (
                      <button type="button" onClick={() => set('cover_url', '')}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600">
                        <X size={10}/>
                      </button>
                    )}
                  </div>
                </div>

                {/* Core fields */}
                <div className="space-y-4">
                  <div>
                    <label className="field-label">Title *</label>
                    <input className="input" value={form.title}
                      onChange={e => { set('title', e.target.value); if (!form.slug) set('slug', slugify(e.target.value)) }}
                      required/>
                  </div>
                  <div>
                    <label className="field-label">Subtitle</label>
                    <input className="input" placeholder="Optional tagline" value={form.subtitle} onChange={e => set('subtitle', e.target.value)}/>
                  </div>
                  <div>
                    <label className="field-label">Slug (URL)</label>
                    <input className="input font-mono text-sm" placeholder="auto-generated-from-title" value={form.slug}
                      onChange={e => set('slug', slugify(e.target.value))}/>
                  </div>
                  <div>
                    <label className="field-label">Author</label>
                    <select className="input" value={form.author_id} onChange={e => set('author_id', e.target.value)}>
                      <option value="">— Quicademy Press —</option>
                      {authors.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Descriptions */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Short description (card text)</label>
                  <textarea className="input resize-none" rows={3} placeholder="One sentence for the card display"
                    value={form.short_desc} onChange={e => set('short_desc', e.target.value)}/>
                </div>
                <div>
                  <label className="field-label">Full description (book page)</label>
                  <textarea className="input resize-none" rows={3} placeholder="Full back cover / about the book text"
                    value={form.description} onChange={e => set('description', e.target.value)}/>
                </div>
              </div>

              {/* Files */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="field-label">PDF file</label>
                  <input ref={pdfRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload}/>
                  <button type="button" onClick={() => pdfRef.current?.click()} disabled={uploading.pdf}
                    className="btn-ghost w-full border border-dashed border-violet-200 text-xs">
                    {uploading.pdf ? <><div className="w-3.5 h-3.5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin"/>Uploading…</> : <><Upload size={13}/>Upload PDF</>}
                  </button>
                  {form.pdf_url && (
                    <div className="mt-1 flex items-center gap-1.5 p-2 bg-green-50 border border-green-200 rounded text-xs">
                      <Check size={10} className="text-green-600"/>
                      <span className="font-mono text-green-700 truncate flex-1">PDF uploaded</span>
                      <button type="button" onClick={() => set('pdf_url', '')}><X size={10} className="text-muted"/></button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="field-label">Purchase URL</label>
                  <input className="input text-sm" placeholder="https://amazon.com/…" value={form.purchase_url}
                    onChange={e => set('purchase_url', e.target.value)}/>
                </div>
                <div>
                  <label className="field-label">Price</label>
                  <div className="flex items-center gap-2">
                    <input type="number" step="0.01" min="0" className="input flex-1" placeholder="0.00"
                      value={form.price} onChange={e => set('price', e.target.value)} disabled={form.is_free}/>
                    <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                      <input type="checkbox" checked={form.is_free} onChange={e => set('is_free', e.target.checked)} className="accent-violet-600 rounded"/>
                      <span className="font-sans text-xs text-violet-800">Free</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="field-label">ISBN</label>
                  <input className="input font-mono text-sm" placeholder="978-0-000-00000-0" value={form.isbn} onChange={e => set('isbn', e.target.value)}/>
                </div>
                <div>
                  <label className="field-label">Publish date</label>
                  <input type="date" className="input" value={form.publish_date} onChange={e => set('publish_date', e.target.value)}/>
                </div>
                <div>
                  <label className="field-label">Pages</label>
                  <input type="number" className="input" placeholder="250" value={form.pages} onChange={e => set('pages', e.target.value)}/>
                </div>
                <div>
                  <label className="field-label">Edition</label>
                  <input className="input" placeholder="1st Edition" value={form.edition} onChange={e => set('edition', e.target.value)}/>
                </div>
                <div>
                  <label className="field-label">Publisher</label>
                  <input className="input" value={form.publisher} onChange={e => set('publisher', e.target.value)}/>
                </div>
                <div>
                  <label className="field-label">Language</label>
                  <input className="input" value={form.language} onChange={e => set('language', e.target.value)}/>
                </div>
              </div>

              {/* Categories & tags */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Categories (comma-separated)</label>
                  <input className="input" placeholder="GIS, Data Science, Python" value={form.categories}
                    onChange={e => set('categories', e.target.value)}/>
                </div>
                <div>
                  <label className="field-label">Tags (comma-separated)</label>
                  <input className="input" placeholder="qgis, mapping, remote sensing" value={form.tags}
                    onChange={e => set('tags', e.target.value)}/>
                </div>
              </div>

              {/* Visibility */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.published} onChange={e => set('published', e.target.checked)} className="accent-violet-600 rounded"/>
                  <span className="font-sans text-sm text-violet-800">Published (visible to public)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.featured} onChange={e => set('featured', e.target.checked)} className="accent-solar rounded"/>
                  <span className="font-sans text-sm text-violet-800">Featured (shown prominently)</span>
                </label>
              </div>

              <div className="flex gap-3 pt-2 border-t border-border">
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Saving…</> : <><Check size={14}/>Save book</>}
                </button>
                <button type="button" onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Books list */}
        {books.length === 0 ? (
          <div className="card p-16 text-center">
            <BookOpen size={28} className="text-violet-300 mx-auto mb-3"/>
            <p className="font-display text-lg font-semibold text-violet-900 mb-1">No books yet</p>
            <p className="font-sans text-sm text-muted mb-5">Add your first book to get started.</p>
            <button onClick={openNew} className="btn-primary mx-auto"><Plus size={14}/> Add book</button>
          </div>
        ) : (
          <div className="space-y-3">
            {books.map(book => (
              <div key={book.id} className="card p-5 flex items-center gap-4">
                {/* Mini cover */}
                <div className="w-10 h-14 rounded bg-gradient-to-br from-violet-700 to-violet-900 flex-shrink-0 overflow-hidden">
                  {book.cover_url
                    ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover"/>
                    : <div className="w-full h-full flex items-center justify-center"><BookOpen size={12} className="text-white/50"/></div>
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-sans font-semibold text-sm text-violet-900 truncate">{book.title}</p>
                    {book.featured && <span className="badge-solar text-xs flex items-center gap-0.5"><Star size={9}/>Featured</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {book.author?.full_name && <span className="font-mono text-xs text-muted">{book.author.full_name}</span>}
                    {(book.categories || []).slice(0, 2).map(c => <span key={c} className="badge-violet text-xs">{c}</span>)}
                    {book.is_free ? <span className="font-mono text-xs text-green-600">Free</span>
                      : book.price ? <span className="font-mono text-xs text-violet-600">${book.price}</span> : null}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {book.purchase_url && (
                    <a href={book.purchase_url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded hover:bg-violet-100 text-violet-400 hover:text-violet-700 transition-colors"
                      title="View purchase page">
                      <ExternalLink size={13}/>
                    </a>
                  )}
                  {book.pdf_url && (
                    <a href={book.pdf_url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded hover:bg-violet-100 text-violet-400 hover:text-violet-700 transition-colors"
                      title="View PDF">
                      <Download size={13}/>
                    </a>
                  )}
                  <button onClick={() => toggle(book.id, 'featured')}
                    className={clsx('p-1.5 rounded transition-colors', book.featured ? 'text-solar-500 hover:bg-solar-50' : 'text-violet-200 hover:text-solar-500 hover:bg-solar-50')}
                    title={book.featured ? 'Remove featured' : 'Mark as featured'}>
                    <Star size={13}/>
                  </button>
                  <button onClick={() => toggle(book.id, 'published')}
                    className={clsx('p-1.5 rounded transition-colors', book.published ? 'text-green-500 hover:bg-green-50' : 'text-violet-200 hover:text-green-500 hover:bg-green-50')}
                    title={book.published ? 'Unpublish' : 'Publish'}>
                    {book.published ? <Eye size={13}/> : <EyeOff size={13}/>}
                  </button>
                  <button onClick={() => openEdit(book)}
                    className="p-1.5 rounded text-violet-300 hover:text-violet-700 hover:bg-violet-100 transition-colors">
                    <Edit3 size={13}/>
                  </button>
                  <button onClick={() => deleteBook(book.id, book.title)}
                    className="p-1.5 rounded text-violet-200 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
