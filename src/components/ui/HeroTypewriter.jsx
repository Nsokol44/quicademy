'use client'
import { useState, useEffect, useRef } from 'react'

// The static prefix lines and the rotating typewriter phrases
const LINE_ONE = 'Where Human Expertise'
const PHRASES  = [
  'Meets AI Precision.',
  'Powers Every Lesson.',
  'Shapes Every Learner.',
  'Drives Real Outcomes.',
]

const TYPE_SPEED   = 55   // ms per character
const DELETE_SPEED = 30
const PAUSE_AFTER  = 2200 // ms to hold the completed phrase
const PAUSE_BEFORE = 400  // ms pause before typing next

export default function HeroTypewriter() {
  const [displayed, setDisplayed]     = useState('')
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [phase, setPhase]             = useState('typing') // 'typing' | 'pausing' | 'deleting' | 'waiting'
  const [charIndex, setCharIndex]     = useState(0)
  const [ready, setReady]             = useState(false)
  const timerRef = useRef(null)

  // Small delay so it doesn't flash on first paint
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 300)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!ready) return
    const current = PHRASES[phraseIndex]

    if (phase === 'typing') {
      if (charIndex < current.length) {
        timerRef.current = setTimeout(() => {
          setDisplayed(current.slice(0, charIndex + 1))
          setCharIndex(i => i + 1)
        }, TYPE_SPEED)
      } else {
        timerRef.current = setTimeout(() => setPhase('pausing'), PAUSE_AFTER)
      }
    }

    if (phase === 'pausing') {
      timerRef.current = setTimeout(() => setPhase('deleting'), 0)
    }

    if (phase === 'deleting') {
      if (charIndex > 0) {
        timerRef.current = setTimeout(() => {
          setDisplayed(current.slice(0, charIndex - 1))
          setCharIndex(i => i - 1)
        }, DELETE_SPEED)
      } else {
        timerRef.current = setTimeout(() => {
          setPhraseIndex(i => (i + 1) % PHRASES.length)
          setPhase('waiting')
        }, PAUSE_BEFORE)
      }
    }

    if (phase === 'waiting') {
      timerRef.current = setTimeout(() => setPhase('typing'), 0)
    }

    return () => clearTimeout(timerRef.current)
  }, [ready, phase, charIndex, phraseIndex])

  return (
    <h1 className="au font-display text-5xl md:text-[4.5rem] font-bold leading-[1.1] mb-7">
      {LINE_ONE}
      <br />
      {/* Rotating typewriter line */}
      <span className="inline-flex items-baseline gap-0">
        <span className="italic" style={{ color: '#f5c842' }}>
          {displayed}
        </span>
        {/* Blinking cursor */}
        <span
          className="inline-block w-[3px] ml-1 rounded-sm self-stretch"
          style={{
            background: '#f5c842',
            animation: 'blink 1s step-end infinite',
            height: '0.85em',
            verticalAlign: 'baseline',
          }}
        />
      </span>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </h1>
  )
}
