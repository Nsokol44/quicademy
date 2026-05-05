'use client'
import { useState, useEffect, useRef } from 'react'
import { Zap, GraduationCap, User } from 'lucide-react'
import clsx from 'clsx'

const CONVERSATION = [
  {
    role: 'student',
    name: 'Alex',
    text: "I'm confused — why does increasing voltage reduce current loss over long distances?",
  },
  {
    role: 'ai',
    name: 'Quicademy AI',
    text: "Power loss in a wire equals I²R — current squared times resistance. By transmitting at higher voltage, the same power travels at lower current. Since loss scales with I², even a small drop in current dramatically reduces heat loss. That's why power grids use high-voltage lines.",
  },
  {
    role: 'instructor',
    name: 'Prof. Martinez',
    text: "Exactly right. To put it in real terms — I've seen substations where upgrading from 11kV to 33kV cut line losses by over 80%. That heat is wasted energy, and it degrades insulation fast. The math is clean, but nothing drives it home like watching a conductor overheat on the job.",
  },
  {
    role: 'student',
    name: 'Alex',
    text: "So the transformer at the end steps it back down for safe use in buildings?",
  },
  {
    role: 'ai',
    name: 'Quicademy AI',
    text: "Exactly. Distribution transformers step voltage down in stages — typically from the grid to 11kV, then down to 415V at the substation, and finally to 120/240V at your service panel.",
  },
  {
    role: 'instructor',
    name: 'Prof. Martinez',
    text: "And that transformer outside your house is oil-cooled for a reason. I've replaced plenty after surge events. Understanding why the system is designed this way makes troubleshooting far more intuitive than memorizing diagrams ever will.",
  },
]

// ms between each message appearing
const MESSAGE_GAPS = [800, 1400, 1600, 900, 1400, 1600]
const TYPING_DURATION = 900  // how long typing dots show before message appears
const LOOP_PAUSE = 3500      // pause at end before restarting

export default function LiveDemoChat() {
  const [visibleMessages, setVisibleMessages] = useState([])
  const [typingRole, setTypingRole] = useState(null)
  const containerRef = useRef(null)
  const chatRef = useRef(null)
  const runningRef = useRef(false)
  const timeoutsRef = useRef([])

  const clearAll = () => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }

  const after = (ms, fn) => {
    const t = setTimeout(fn, ms)
    timeoutsRef.current.push(t)
    return t
  }

  const runSequence = () => {
    if (runningRef.current) return
    runningRef.current = true
    clearAll()
    setVisibleMessages([])
    setTypingRole(null)

    let cursor = 400 // initial delay

    CONVERSATION.forEach((msg, i) => {
      const gap = i === 0 ? 0 : (MESSAGE_GAPS[i] || 1200)
      cursor += gap

      // Show typing indicator
      after(cursor, () => setTypingRole(msg.role))

      // Show message after typing duration
      after(cursor + TYPING_DURATION, () => {
        setTypingRole(null)
        setVisibleMessages(prev => [...prev, msg])
      })
    })

    // After last message, pause then restart
    const lastAt = cursor + TYPING_DURATION + LOOP_PAUSE
    after(lastAt, () => {
      runningRef.current = false
      setVisibleMessages([])
      setTypingRole(null)
      // Small gap then run again
      after(600, runSequence)
    })
  }

  // Start when scrolled into view
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !runningRef.current) {
          runSequence()
        }
      },
      { threshold: 0.2 }
    )
    observer.observe(el)

    return () => {
      observer.disconnect()
      clearAll()
      runningRef.current = false
    }
  }, []) // eslint-disable-line

  // Auto-scroll chat window
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [visibleMessages, typingRole])

  return (
    <div ref={containerRef}>
      {/* Header */}
      <div className="bg-violet-900 rounded-t-2xl px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <span className="font-mono text-xs text-violet-300">Live Session — Electrical Engineering 101</span>
        </div>
        <div className="flex items-center gap-3">
          {[
            { icon: User,          bg: 'bg-violet-700', label: 'Student',    iconCls: 'text-white' },
            { icon: Zap,           bg: 'bg-violet-800', label: 'AI',         iconCls: 'text-solar-400' },
            { icon: GraduationCap, bg: 'bg-solar',      label: 'Instructor', iconCls: 'text-violet-900' },
          ].map(({ icon: Icon, bg, label, iconCls }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-5 h-5 rounded-full ${bg} flex items-center justify-center`}>
                <Icon size={10} className={iconCls} />
              </div>
              <span className="font-mono text-xs text-violet-400 hidden sm:block">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatRef}
        className="bg-violet-50 px-4 py-4 space-y-4 overflow-y-auto"
        style={{ height: '380px' }}
      >
        {visibleMessages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}
        {typingRole && <TypingIndicator role={typingRole} />}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-border rounded-b-2xl px-4 py-3 flex items-center gap-3">
        <div className="flex-1 h-9 rounded-lg bg-violet-50 border border-border flex items-center px-4">
          <span className="font-sans text-xs text-violet-300">Ask a question…</span>
        </div>
        <div className="w-9 h-9 rounded-lg bg-violet-200 flex items-center justify-center opacity-50">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5b3fa8" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </div>
      </div>
    </div>
  )
}

const ROLE_STYLES = {
  student: {
    bubble:    'bg-violet-700 text-white rounded-2xl rounded-br-sm',
    avatar:    'bg-violet-700',
    avatarIcon:'text-white',
    label:     'text-violet-400',
    align:     'items-end',
    row:       'justify-end',
  },
  ai: {
    bubble:    'bg-white border border-violet-200 text-violet-900 rounded-2xl rounded-tl-sm shadow-card',
    avatar:    'bg-violet-700',
    avatarIcon:'text-solar-400',
    label:     'text-violet-400',
    align:     'items-start',
    row:       'justify-start',
  },
  instructor: {
    bubble:    'bg-solar-50 border border-solar-200 text-violet-900 rounded-2xl rounded-tl-sm shadow-card',
    avatar:    'bg-solar',
    avatarIcon:'text-violet-900',
    label:     'text-solar-600',
    align:     'items-start',
    row:       'justify-start',
  },
}

function MessageBubble({ msg }) {
  const s = ROLE_STYLES[msg.role]
  const isStudent = msg.role === 'student'
  const Icon = msg.role === 'ai' ? Zap : msg.role === 'instructor' ? GraduationCap : User

  return (
    <div className={clsx('flex flex-col gap-1', s.align, 'animate-[fadeUp_0.3s_ease_both]')}>
      {!isStudent && (
        <div className="flex items-center gap-2 ml-9">
          <span className={clsx('font-mono text-xs font-semibold', s.label)}>{msg.name}</span>
          {msg.role === 'instructor' && <span className="badge bg-solar-100 text-solar-700 border border-solar-200 text-xs">Instructor</span>}
          {msg.role === 'ai'         && <span className="badge bg-violet-100 text-violet-600 text-xs">AI</span>}
        </div>
      )}
      <div className={clsx('flex items-end gap-2', s.row)}>
        {!isStudent && (
          <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0', s.avatar)}>
            <Icon size={13} className={s.avatarIcon} />
          </div>
        )}
        <div className={clsx('max-w-[84%] px-4 py-3 text-sm font-sans leading-relaxed', s.bubble)}>
          {msg.text}
        </div>
      </div>
      {isStudent && <p className="font-mono text-xs text-violet-400 text-right">{msg.name}</p>}
    </div>
  )
}

function TypingIndicator({ role }) {
  const s = ROLE_STYLES[role]
  const isStudent = role === 'student'
  const Icon = role === 'ai' ? Zap : role === 'instructor' ? GraduationCap : User
  const dotCls = role === 'student' ? 'bg-white/70' : role === 'instructor' ? 'bg-solar-500' : 'bg-violet-400'

  return (
    <div className={clsx('flex flex-col gap-1', s.align)}>
      <div className={clsx('flex items-end gap-2', s.row)}>
        {!isStudent && (
          <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0', s.avatar)}>
            <Icon size={13} className={s.avatarIcon} />
          </div>
        )}
        <div className={clsx('px-4 py-3', s.bubble)}>
          <div className="flex gap-1.5 items-center h-4">
            {[0, 150, 300].map(d => (
              <div key={d} className={clsx('w-1.5 h-1.5 rounded-full animate-bounce', dotCls)}
                style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
