'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Plus, Edit3, Trash2, Eye, EyeOff, X, Save, Globe } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const CATEGORIES = ['Learning Science','AI & Education','Platform Updates','Instructor Spotlight','Skills & Careers','Industry News']

const EMPTY_FORM = {
  title: '', slug: '', excerpt: '', category: CATEGORIES[0],
  content_html: '', author_name: '', author_role: '',
  cover_image_url: '', read_time_mins: '', published: false,
}

function toSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function BlogAdminClient({ posts: initialPosts }) {
  const supabase = createClient()
  const [posts, setPosts]       = useState(initialPosts)
  const [editing, setEditing]   = useState(null) // null | 'new' | post object
  const [form, setForm]         = useState(EMPTY_FORM)
  const [loading, setLoading]   = useState(false)
  const [preview, setPreview]   = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const openNew = () => {
    setForm(EMPTY_FORM)
    setEditing('new')
    setPreview(false)
  }

  const openEdit = (post) => {
    setForm({
      title: post.title || '',
      slug: post.slug || '',
      excerpt: post.excerpt || '',
      category: post.category || CATEGORIES[0],
      content_html: post.content_html || '',
      author_name: post.author_name || '',
      author_role: post.author_role || '',
      cover_image_url: post.cover_image_url || '',
      read_time_mins: post.read_time_mins || '',
      published: post.published || false,
    })
    setEditing(post)
    setPreview(false)
  }

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error('Title is required')
    if (!form.excerpt.trim()) return toast.error('Excerpt is required')
    setLoading(true)
    try {
      const slug = form.slug.trim() || toSlug(form.title)
      const payload = {
        ...form,
        slug,
        read_time_mins: form.read_time_mins ? parseInt(form.read_time_mins) : null,
        published_at: form.published ? (editing?.published_at || new Date().toISOString()) : null,
      }

      if (editing === 'new') {
        const { data, error } = await supabase.from('blog_posts').insert(payload).select().single()
        if (error) throw error
        setPosts(p => [data, ...p])
        toast.success('Post created!')
      } else {
        const { data, error } = await supabase.from('blog_posts').update(payload).eq('id', editing.id).select().single()
        if (error) throw error
        setPosts(p => p.map(post => post.id === data.id ? data : post))
        toast.success('Post updated!')
      }
      setEditing(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this post permanently?')) return
    const { error } = await supabase.from('blog_posts').delete().eq('id', id)
    if (error) return toast.error(error.message)
    setPosts(p => p.filter(post => post.id !== id))
    toast.success('Post deleted')
    if (editing?.id === id) setEditing(null)
  }

  const togglePublish = async (post) => {
    const newVal = !post.published
    const { data, error } = await supabase.from('blog_posts')
      .update({ published: newVal, published_at: newVal ? new Date().toISOString() : null })
      .eq('id', post.id).select().single()
    if (error) return toast.error(error.message)
    setPosts(p => p.map(pp => pp.id === data.id ? data : pp))
    toast.success(newVal ? 'Post published!' : 'Post unpublished')
  }

  return (
    <div className="min-h-screen bg-violet-50 flex">
      {/* Sidebar: post list */}
      <div className="w-80 bg-white border-r border-border flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h1 className="font-display text-lg font-bold text-violet-900">Blog Admin</h1>
          <button onClick={openNew} className="btn-primary btn-sm"><Plus size={14}/> New post</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {posts.length === 0 ? (
            <div className="p-6 text-center">
              <p className="font-sans text-sm text-muted">No posts yet.</p>
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id}
                onClick={() => openEdit(post)}
                className={clsx('px-4 py-3 border-b border-border/60 cursor-pointer hover:bg-violet-50 transition-colors',
                  editing?.id === post.id && 'bg-violet-50 border-l-2 border-l-violet-600'
                )}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-sm font-semibold text-violet-900 truncate">{post.title}</p>
                    <p className="font-mono text-xs text-muted mt-0.5 truncate">{post.category}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={e => { e.stopPropagation(); togglePublish(post) }}
                      className={clsx('p-1 rounded transition-colors', post.published ? 'text-green-600 hover:bg-green-50' : 'text-muted hover:bg-violet-100')}>
                      {post.published ? <Globe size={13}/> : <EyeOff size={13}/>}
                    </button>
                    <button onClick={e => { e.stopPropagation(); handleDelete(post.id) }}
                      className="p-1 rounded text-red-400 hover:bg-red-50 transition-colors">
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={clsx('badge text-xs', post.published ? 'badge-green' : 'badge-violet')}>
                    {post.published ? 'Published' : 'Draft'}
                  </span>
                  {post.published_at && (
                    <span className="font-mono text-xs text-muted">
                      {new Date(post.published_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {editing ? (
          <>
            {/* Editor toolbar */}
            <div className="bg-white border-b border-border px-5 py-3 flex items-center gap-3">
              <span className="font-mono text-xs text-muted">{editing === 'new' ? 'New post' : `Editing: ${editing.title}`}</span>
              <div className="ml-auto flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.published} onChange={e => set('published', e.target.checked)} className="rounded accent-violet-600" />
                  <span className="font-sans text-sm text-violet-800">Publish</span>
                </label>
                <button onClick={() => setPreview(!preview)} className="btn-ghost btn-sm">
                  {preview ? <><Edit3 size={13}/> Edit</> : <><Eye size={13}/> Preview</>}
                </button>
                <button onClick={handleSave} disabled={loading} className="btn-primary btn-sm">
                  {loading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><Save size={13}/> Save</>}
                </button>
                <button onClick={() => setEditing(null)} className="btn-ghost btn-sm"><X size={14}/></button>
              </div>
            </div>

            {preview ? (
              <div className="flex-1 overflow-y-auto p-8 bg-violet-50">
                <div className="max-w-3xl mx-auto card p-10">
                  <p className="font-mono text-xs text-violet-500 mb-2">{form.category}</p>
                  <h1 className="font-display text-4xl font-bold text-violet-900 mb-4">{form.title || 'Untitled'}</h1>
                  <p className="font-sans text-lg text-muted italic mb-8">{form.excerpt}</p>
                  <div className="prose prose-violet max-w-none font-sans"
                    dangerouslySetInnerHTML={{ __html: form.content_html || '<p><em>No content yet.</em></p>' }} />
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto space-y-5">
                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="field-label">Title *</label>
                      <input className="input" placeholder="Post title" value={form.title}
                        onChange={e => { set('title', e.target.value); if (!form.slug) set('slug', toSlug(e.target.value)) }} />
                    </div>
                    <div>
                      <label className="field-label">URL slug</label>
                      <input className="input font-mono text-sm" placeholder="auto-generated-from-title" value={form.slug}
                        onChange={e => set('slug', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-5">
                    <div>
                      <label className="field-label">Category</label>
                      <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="field-label">Read time (mins)</label>
                      <input type="number" className="input" placeholder="5" value={form.read_time_mins} onChange={e => set('read_time_mins', e.target.value)} />
                    </div>
                    <div>
                      <label className="field-label">Cover image URL</label>
                      <input className="input" placeholder="https://..." value={form.cover_image_url} onChange={e => set('cover_image_url', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="field-label">Author name</label>
                      <input className="input" placeholder="Jane Smith" value={form.author_name} onChange={e => set('author_name', e.target.value)} />
                    </div>
                    <div>
                      <label className="field-label">Author role</label>
                      <input className="input" placeholder="Lead Instructor, Quicademy" value={form.author_role} onChange={e => set('author_role', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="field-label">Excerpt *</label>
                    <textarea className="input resize-none" rows={3} placeholder="Brief summary shown on the blog index page and in meta description (160 chars ideal)…"
                      value={form.excerpt} onChange={e => set('excerpt', e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">Content (HTML)</label>
                    <p className="font-mono text-xs text-muted mb-2">Paste HTML or write raw HTML. A rich text editor integration (Tiptap/Quill) can be added in the next iteration.</p>
                    <textarea className="input resize-none font-mono text-xs leading-relaxed" rows={20}
                      placeholder="<h2>Introduction</h2><p>Your content here...</p>"
                      value={form.content_html} onChange={e => set('content_html', e.target.value)} />
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-10">
            <div>
              <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-4">
                <Edit3 size={24} className="text-violet-400" />
              </div>
              <p className="font-display text-lg font-semibold text-violet-900 mb-2">Select a post to edit</p>
              <p className="font-sans text-sm text-muted mb-5">Or create a new one to get started.</p>
              <button onClick={openNew} className="btn-primary"><Plus size={14}/> New post</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
