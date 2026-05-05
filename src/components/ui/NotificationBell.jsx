'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Bell, MessageCircle, Video, Lock, X } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'

const TYPE_ICON = {
  new_question:   MessageCircle,
  private_request: Lock,
  room_started:   Video,
  ta_assigned:    MessageCircle,
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationBell({ userId }) {
  const supabase = createClient()
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const unread = notifications.filter(n => !n.read).length

  useEffect(() => {
    if (!userId) return
    // Initial fetch
    fetchNotifications()

    // Realtime subscription
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev])
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [userId])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications(data || [])
  }

  const markAllRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const markRead = async (id) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const dismiss = async (e, id) => {
    e.preventDefault()
    e.stopPropagation()
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-violet-700 hover:bg-violet-100 transition-colors"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center font-mono">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-border shadow-card-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="font-sans font-semibold text-sm text-violet-900">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="font-mono text-xs text-violet-500 hover:text-violet-700 transition-colors">
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell size={20} className="text-violet-200 mx-auto mb-2" />
                <p className="font-sans text-sm text-muted">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => {
                const Icon = TYPE_ICON[n.type] || Bell
                return (
                  <Link key={n.id} href={n.link || '#'}
                    onClick={() => { markRead(n.id); setOpen(false) }}
                    className={clsx(
                      'flex items-start gap-3 px-4 py-3 hover:bg-violet-50 transition-colors relative group',
                      !n.read && 'bg-violet-50/60'
                    )}
                  >
                    <div className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                      !n.read ? 'bg-violet-700' : 'bg-violet-100'
                    )}>
                      <Icon size={14} className={!n.read ? 'text-white' : 'text-violet-500'} />
                    </div>
                    <div className="flex-1 min-w-0 pr-5">
                      <p className={clsx('font-sans text-sm leading-snug', !n.read ? 'font-semibold text-violet-900' : 'text-violet-700')}>
                        {n.title}
                      </p>
                      {n.body && <p className="font-sans text-xs text-muted mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>}
                      <p className="font-mono text-xs text-violet-300 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-violet-600 flex-shrink-0 mt-2" />
                    )}
                    <button
                      onClick={(e) => dismiss(e, n.id)}
                      className="absolute top-2 right-2 p-0.5 rounded text-violet-200 hover:text-violet-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X size={12} />
                    </button>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
