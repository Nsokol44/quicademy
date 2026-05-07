'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Send, Zap, Users, BookOpen, ArrowLeft, Circle, Lock, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const buildSystemPrompt = (room, isPrivate) => `You are an expert AI teaching assistant inside Quicademy, a trades education platform.
${isPrivate
  ? 'This is a PRIVATE 1-on-1 session between a student and their instructor. Tailor responses closely to this individual student\'s question.'
  : 'This is a GROUP classroom session. Multiple students may be present. Keep answers broadly useful.'
}

Your role:
- Answer questions clearly and accurately about trades topics (electrical, HVAC, plumbing, carpentry, welding, etc.)
- Be concise but thorough — students are learning hands-on skills
- Use practical examples and real-world scenarios
- For complex judgment calls, note the instructor can provide further guidance
- Format with short paragraphs; use numbered steps for processes
${room.courses ? `\nCourse context: "${room.courses.title}" (${room.courses.category})` : ''}
Keep responses under ${isPrivate ? '200' : '150'} words unless the question genuinely requires more.`

export default function LiveRoomClient({ room, profile, initialMessages }) {
  const supabase   = createClient()
  const isPrivate  = room.room_type === 'private'
  const isInstructor = profile?.role === 'instructor'

  const [messages, setMessages] = useState(initialMessages)
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
  const [aiTyping, setAiTyping] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(room.ai_enabled !== false) // default on
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Persist AI toggle to DB
  const toggleAI = async () => {
    const newVal = !aiEnabled
    setAiEnabled(newVal)
    await supabase.from('live_rooms').update({ ai_enabled: newVal }).eq('id', room.id)
    toast.success(newVal ? 'AI responses enabled' : 'AI responses paused')
  }

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, aiTyping])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`room:${room.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'room_messages',
        filter: `room_id=eq.${room.id}`,
      }, (payload) => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev
          return [...prev, payload.new]
        })
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [room.id])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)

    try {
      const { error } = await supabase.from('room_messages').insert({
        room_id:     room.id,
        sender_id:   profile.id,
        sender_name: profile.full_name || (isInstructor ? 'Instructor' : 'Student'),
        sender_role: profile.role,
        content:     text,
        is_ai:       false,
      })
      if (error) throw error

      // AI responds only when enabled, and only to student messages
      const shouldAIRespond = aiEnabled && !isInstructor
      if (shouldAIRespond) {
        setAiTyping(true)
        await getAIResponse(text)
      }
    } catch (err) {
      toast.error('Failed to send message')
      setInput(text)
    } finally {
      setSending(false)
    }
  }

  const getAIResponse = async (userMessage) => {
    try {
      const recentContext = messages.slice(-8).map(m =>
        `${m.is_ai ? 'AI Assistant' : `${m.sender_name} (${m.sender_role})`}: ${m.content}`
      ).join('\n')

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:           'chat',
          message:        userMessage,
          context:        recentContext || null,
          roomType:       room.room_type,
          isPrivate:      isPrivate,
          courseTitle:    room.courses?.title,
          courseCategory: room.courses?.category,
        }),
      })

      const data = await response.json()
      if (data.text) {
        await supabase.from('room_messages').insert({
          room_id:     room.id,
          sender_id:   null,
          sender_name: 'Quicademy AI',
          sender_role: 'ai',
          content:     data.text,
          is_ai:       true,
        })
      }
    } catch (err) {
      console.error('AI response error:', err)
    } finally {
      setAiTyping(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  // Derive the "other person's" name for private room header
  const otherName = isPrivate
    ? isInstructor
      ? room.student?.full_name || 'Student'
      : room.instructor?.full_name || 'Instructor'
    : null

  return (
    <div className="h-screen flex flex-col bg-violet-50">

      {/* ── Header ── */}
      <div className={clsx('text-white px-5 py-3 flex items-center gap-4 flex-shrink-0',
        isPrivate ? 'bg-violet-950' : 'bg-violet-900'
      )}>
        <Link href={isInstructor ? '/instructor' : '/dashboard'}
          className="p-1.5 rounded hover:bg-white/10 transition-colors flex-shrink-0">
          <ArrowLeft size={18} />
        </Link>

        {/* Private room: show avatar of other person */}
        {isPrivate && (
          <div className={clsx('w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-sm flex-shrink-0',
            isInstructor ? 'bg-violet-700 text-white' : 'bg-solar text-violet-900'
          )}>
            {(otherName || '?')[0].toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isPrivate
              ? <Lock size={12} className="text-violet-400 flex-shrink-0" />
              : <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
            }
            <h1 className="font-sans font-semibold text-sm truncate">
              {isPrivate ? (isInstructor ? `Session with ${otherName}` : `Session with ${otherName}`) : room.title}
            </h1>
            {isPrivate && (
              <span className="badge bg-violet-800 text-violet-300 border border-violet-700 text-xs flex-shrink-0">Private</span>
            )}
          </div>
          {room.courses && (
            <p className="font-mono text-xs text-violet-400 truncate mt-0.5">{room.courses.title}</p>
          )}
        </div>

        {/* AI toggle — visible to both instructor and student */}
        <button
          onClick={toggleAI}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-all flex-shrink-0',
            aiEnabled
              ? 'bg-solar/20 text-solar-300 border border-solar/30 hover:bg-solar/30'
              : 'bg-white/10 text-violet-400 border border-white/10 hover:bg-white/20'
          )}
          title={aiEnabled ? 'AI responses on — click to pause' : 'AI responses off — click to enable'}
        >
          <Zap size={11} className={aiEnabled ? 'text-solar-400' : 'text-violet-500'}/>
          AI {aiEnabled ? 'on' : 'off'}
        </button>

        {/* Group room indicator */}
        {!isPrivate && (
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full flex-shrink-0">
            <Users size={12} className="text-violet-300" />
            <span className="font-mono text-xs text-violet-200">Group</span>
          </div>
        )}
      </div>

      {/* ── Context bar ── */}
      <div className={clsx('px-5 py-2 text-xs font-mono flex items-center gap-2 flex-shrink-0 border-b',
        isPrivate
          ? 'bg-violet-100 text-violet-700 border-violet-200'
          : isInstructor
            ? 'bg-solar-50 text-solar-700 border-solar-200'
            : 'bg-violet-50 text-violet-600 border-violet-100'
      )}>
        <Circle size={8} className={isPrivate ? 'fill-violet-600 text-violet-600' : isInstructor ? 'fill-solar-500 text-solar-500' : 'fill-violet-500 text-violet-500'} />
        {isPrivate
          ? isInstructor
            ? `Private 1-on-1 · ${aiEnabled ? 'AI is on' : 'AI is off'}`
            : `Private session with your instructor · ${aiEnabled ? 'AI responds to your questions' : 'AI is paused'}`
          : isInstructor
            ? `Group room · You are the Lead Instructor`
            : `Group classroom · ${aiEnabled ? 'AI responds to your questions' : 'AI is paused — ask your instructor directly'}`
        }
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <div className={clsx('w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4',
              isPrivate ? 'bg-violet-200' : 'bg-violet-100'
            )}>
              {isPrivate
                ? <MessageCircle size={24} className="text-violet-600" />
                : <BookOpen size={24} className="text-violet-500" />
              }
            </div>
            <p className="font-display text-lg font-semibold text-violet-900 mb-2">
              {isPrivate ? 'Private session open' : 'Room is open'}
            </p>
            <p className="font-sans text-sm text-muted max-w-xs mx-auto leading-relaxed">
              {isPrivate
                ? isInstructor
                  ? `Waiting for ${otherName} to ask a question. You can also send a message first.`
                  : `Ask your instructor anything. The AI will respond instantly while you wait.`
                : `Ask a question to get started. The AI responds immediately; the instructor adds expert context.`
              }
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} currentUserId={profile.id} />
        ))}

        {aiTyping && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center flex-shrink-0 shadow-violet">
              <Zap size={13} className="text-solar-400" />
            </div>
            <div className="bg-white border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-card">
              <div className="flex gap-1.5 items-center h-5">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
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
                isPrivate
                  ? isInstructor
                    ? `Message ${otherName}…`
                    : `Ask your instructor a question…`
                  : isInstructor
                    ? `Share your expertise with the class…`
                    : `Ask a question — AI responds instantly…`
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
        <p className="font-mono text-xs text-violet-300 text-center mt-2">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}

function MessageBubble({ msg, currentUserId }) {
  const isOwn  = msg.sender_id === currentUserId
  const isAI   = msg.is_ai
  const isInst = msg.sender_role === 'instructor'

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
          <div className={clsx('rounded-2xl rounded-tr-sm px-4 py-3 shadow-card',
            isInst ? 'bg-solar text-violet-900' : 'bg-violet-700 text-white shadow-violet'
          )}>
            <p className="font-sans text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          </div>
          <p className="font-mono text-xs text-violet-300 mt-1 text-right">
            {isInst ? '⭐ You (Instructor)' : 'You'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3">
      <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold font-display',
        isInst ? 'bg-solar text-violet-900 shadow-solar' : 'bg-violet-200 text-violet-700'
      )}>
        {(msg.sender_name || '?')[0].toUpperCase()}
      </div>
      <div className="max-w-[72%]">
        <p className="font-mono text-xs mb-1.5 ml-1">
          <span className={isInst ? 'text-solar-600 font-semibold' : 'text-violet-400'}>{msg.sender_name}</span>
          {isInst && <span className="ml-2 badge-solar text-xs">Instructor</span>}
        </p>
        <div className="bg-white border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-card">
          <p className="font-sans text-sm text-violet-900 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        </div>
      </div>
    </div>
  )
}
