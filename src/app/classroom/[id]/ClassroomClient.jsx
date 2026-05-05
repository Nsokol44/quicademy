'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Send, Zap, Users, ArrowLeft, Shield, GraduationCap, User, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const AI_SYSTEM = (room) =>
  `You are a helpful AI teaching assistant in a live classroom session on Quicademy.
Course: ${room.courses?.title || 'General'} (${room.courses?.category || ''})
This is a class-wide chat. Multiple students are present. Be clear, accurate, and educational.
Keep responses under 180 words. Use numbered steps for processes. Flag complex judgment calls for the instructor.`

export default function ClassroomClient({ room, profile, membership, isStaff, initialMessages }) {
  const supabase = createClient()

  const [messages, setMessages]     = useState(initialMessages)
  const [input, setInput]           = useState('')
  const [sending, setSending]       = useState(false)
  const [aiTyping, setAiTyping]     = useState(false)
  const [showReal, setShowReal]     = useState(false) // staff toggle: show real vs anon names
  const [blocked, setBlocked]       = useState(null)  // moderation rejection message
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // My display name: anon for students, real for staff
  const myDisplayName = isStaff
    ? (profile?.full_name || 'Instructor')
    : (membership?.anon_name || 'Anonymous')

  const myRole = membership?.role || profile?.role || 'student'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, aiTyping])

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`classroom:${room.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'room_messages', filter: `room_id=eq.${room.id}`,
      }, (payload) => {
        setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [room.id])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    setBlocked(null)

    try {
      // ── Content moderation ──
      const modRes = await fetch('/api/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      const mod = await modRes.json()

      if (!mod.allowed) {
        setBlocked(mod.reason || 'This message was flagged by our content filter.')
        setInput(text) // return text to input
        setSending(false)
        return
      }

      // ── Insert message ──
      // display_name is what everyone sees
      // sender_name is the real name (only shown to staff)
      const { error } = await supabase.from('room_messages').insert({
        room_id:      room.id,
        sender_id:    profile.id,
        sender_name:  profile.full_name || 'User',   // real name, staff-only visible
        sender_role:  myRole,
        display_name: myDisplayName,                  // anon name for students
        content:      text,
        is_ai:        false,
      })
      if (error) throw error

      // ── Notify instructor/TAs when student asks a question ──
      if (!isStaff && room.class_id) {
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_question',
            roomId: room.id,
            classId: room.class_id,
            senderName: myDisplayName,
            messagePreview: text,
          }),
        }).catch(() => {}) // fire and forget
      }

      // ── AI response for student messages ──
      if (!isStaff) {
        setAiTyping(true)
        await getAIResponse(text)
      }
    } catch (err) {
      toast.error('Failed to send')
      setInput(text)
    } finally {
      setSending(false)
    }
  }

  const getAIResponse = async (userMessage) => {
    try {
      const context = messages.slice(-6).map(m =>
        `${m.is_ai ? 'AI' : m.display_name} (${m.sender_role}): ${m.content}`
      ).join('\n')

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          system: AI_SYSTEM(room),
          messages: [{
            role: 'user',
            content: context ? `Context:\n${context}\n\nNew question: ${userMessage}` : userMessage,
          }],
        }),
      })
      const data = await res.json()
      const aiText = data.content?.[0]?.text
      if (aiText) {
        await supabase.from('room_messages').insert({
          room_id:      room.id,
          sender_id:    null,
          sender_name:  'Quicademy AI',
          sender_role:  'ai',
          display_name: 'Quicademy AI',
          content:      aiText,
          is_ai:        true,
        })
      }
    } catch (err) {
      console.error('AI error:', err)
    } finally {
      setAiTyping(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  // What name to display for a message — staff can toggle real names
  const getDisplayedName = (msg) => {
    if (msg.is_ai) return 'Quicademy AI'
    if (isStaff && showReal && msg.sender_name) return msg.sender_name
    return msg.display_name || msg.sender_name || 'Student'
  }

  const isInstructor = msg => ['instructor','ta'].includes(msg.sender_role)

  return (
    <div className="h-screen flex flex-col bg-violet-50">
      {/* Header */}
      <div className="bg-violet-900 text-white px-5 py-3 flex items-center gap-3 flex-shrink-0">
        <Link href={isStaff ? '/instructor' : '/dashboard'}
          className="p-1.5 rounded hover:bg-white/10 transition-colors flex-shrink-0">
          <ArrowLeft size={17} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <h1 className="font-sans font-semibold text-sm truncate">
              {room.classes?.name || room.title}
            </h1>
            <span className="badge bg-white/10 text-white/70 text-xs border-0">Class Chat</span>
          </div>
          {room.courses && <p className="font-mono text-xs text-violet-400 mt-0.5">{room.courses.title}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Staff: toggle real vs anon names */}
          {isStaff && (
            <button
              onClick={() => setShowReal(!showReal)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors',
                showReal ? 'bg-solar text-violet-900' : 'bg-white/10 text-violet-300 hover:bg-white/20'
              )}
              title={showReal ? 'Showing real names' : 'Showing anonymous names'}
            >
              {showReal ? <Eye size={12}/> : <EyeOff size={12}/>}
              {showReal ? 'Real names' : 'Anon names'}
            </button>
          )}
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
            <Users size={11} className="text-violet-300" />
            <span className="font-mono text-xs text-violet-200">Class</span>
          </div>
        </div>
      </div>

      {/* Role bar */}
      <div className={clsx(
        'px-5 py-1.5 text-xs font-mono flex items-center gap-2 flex-shrink-0 border-b',
        isStaff ? 'bg-solar-50 text-solar-700 border-solar-200' : 'bg-violet-100 text-violet-600 border-violet-200'
      )}>
        <Shield size={10} />
        {isStaff
          ? `You are ${myRole === 'ta' ? 'a Teaching Assistant' : 'the Instructor'} · Student identities are ${showReal ? 'revealed' : 'anonymous to you unless toggled'}`
          : `You appear as "${myDisplayName}" · Your identity is anonymous to other students`
        }
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <Users size={28} className="text-violet-300 mx-auto mb-3" />
            <p className="font-display text-lg font-semibold text-violet-900 mb-1">Class chat is open</p>
            <p className="font-sans text-sm text-muted max-w-xs mx-auto">
              {isStaff
                ? 'Students can ask questions anonymously. AI will respond instantly and you can add context.'
                : `You're showing as "${myDisplayName}". Ask a question — AI answers instantly and your instructor can add context.`
              }
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <ClassMessageBubble
            key={msg.id}
            msg={msg}
            currentUserId={profile.id}
            displayedName={getDisplayedName(msg)}
            isStaff={isStaff}
          />
        ))}

        {aiTyping && <TypingBubble />}
        <div ref={bottomRef} />
      </div>

      {/* Moderation warning */}
      {blocked && (
        <div className="flex-shrink-0 mx-5 mb-2 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-sans text-xs text-red-700 font-medium">Message not sent</p>
            <p className="font-sans text-xs text-red-600 mt-0.5">{blocked}</p>
          </div>
          <button onClick={() => setBlocked(null)} className="text-red-300 hover:text-red-500 transition-colors text-xs">✕</button>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border bg-white px-5 py-4">
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isStaff
                  ? 'Add context or answer as instructor…'
                  : `Ask as ${myDisplayName}…`
              }
              className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-ink text-sm font-sans
                         placeholder:text-violet-300 focus:outline-none focus:border-violet-500 focus:ring-2
                         focus:ring-violet-500/20 resize-none transition-all"
              style={{ maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="w-11 h-11 rounded-xl bg-violet-700 flex items-center justify-center text-white
                       hover:bg-violet-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-violet flex-shrink-0"
          >
            {sending
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Send size={16} />
            }
          </button>
        </div>
        <p className="font-mono text-xs text-violet-300 text-center mt-1.5">
          Enter to send · Shift+Enter for new line · Messages are moderated
        </p>
      </div>
    </div>
  )
}

function ClassMessageBubble({ msg, currentUserId, displayedName, isStaff }) {
  const isOwn      = msg.sender_id === currentUserId
  const isAI       = msg.is_ai
  const isStaffMsg = ['instructor','ta'].includes(msg.sender_role)

  if (isAI) {
    return (
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center flex-shrink-0 shadow-violet">
          <Zap size={13} className="text-solar-400" />
        </div>
        <div className="max-w-[78%]">
          <p className="font-mono text-xs text-violet-400 mb-1.5 ml-1">Quicademy AI</p>
          <div className="bg-white border border-violet-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-card">
            <p className="font-sans text-sm text-violet-900 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          </div>
        </div>
      </div>
    )
  }

  if (isOwn) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[72%]">
          <div className={clsx(
            'rounded-2xl rounded-tr-sm px-4 py-3 shadow-card',
            isStaffMsg ? 'bg-solar text-violet-900' : 'bg-violet-700 text-white shadow-violet'
          )}>
            <p className="font-sans text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          </div>
          <p className="font-mono text-xs text-violet-300 mt-1 text-right">
            {isStaffMsg ? `⭐ You (${msg.sender_role === 'ta' ? 'TA' : 'Instructor'})` : `You (${displayedName})`}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3">
      <div className={clsx(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold',
        isStaffMsg ? 'bg-solar text-violet-900 shadow-solar' : 'bg-violet-200 text-violet-700'
      )}>
        {isStaffMsg
          ? <GraduationCap size={14} />
          : (displayedName || '?')[0].toUpperCase()
        }
      </div>
      <div className="max-w-[72%]">
        <div className="flex items-center gap-2 mb-1.5 ml-1">
          <span className={clsx('font-mono text-xs font-semibold',
            isStaffMsg ? 'text-solar-600' : 'text-violet-400'
          )}>{displayedName}</span>
          {msg.sender_role === 'ta'         && <span className="badge bg-solar-100 text-solar-700 border border-solar-200 text-xs">TA</span>}
          {msg.sender_role === 'instructor' && <span className="badge bg-solar-100 text-solar-700 border border-solar-200 text-xs">Instructor</span>}
        </div>
        <div className={clsx(
          'rounded-2xl rounded-tl-sm px-4 py-3 shadow-card',
          isStaffMsg ? 'bg-solar-50 border border-solar-200 text-violet-900' : 'bg-white border border-border text-violet-900'
        )}>
          <p className="font-sans text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        </div>
      </div>
    </div>
  )
}

function TypingBubble() {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center flex-shrink-0 shadow-violet">
        <Zap size={13} className="text-solar-400" />
      </div>
      <div className="bg-white border border-violet-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-card">
        <div className="flex gap-1.5 items-center h-5">
          {[0,150,300].map(d => (
            <div key={d} className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{animationDelay:`${d}ms`}} />
          ))}
        </div>
      </div>
    </div>
  )
}
