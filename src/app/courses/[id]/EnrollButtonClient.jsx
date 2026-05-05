'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function EnrollButtonClient({ courseId, isFree, price }) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleEnroll = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { error } = await supabase.from('enrollments').insert({
        student_id: user.id,
        course_id: courseId,
        progress: 0,
      })
      if (error) throw error
      toast.success('Enrolled successfully!')
      router.push('/dashboard')
    } catch (err) {
      toast.error(err.message || 'Failed to enroll')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={handleEnroll} disabled={loading}
      className="btn-primary w-full justify-center py-3.5 disabled:opacity-60">
      {loading
        ? <span className="flex items-center gap-2 justify-center"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Enrolling…</span>
        : <span className="flex items-center gap-2 justify-center">{isFree ? 'Enroll free' : `Enroll for $${price}`} <ArrowRight size={14}/></span>
      }
    </button>
  )
}
