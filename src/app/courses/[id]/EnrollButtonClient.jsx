'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { ArrowRight, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function EnrollButtonClient({ courseId, isFree, price }) {
  const supabase = createClient()
  const router   = useRouter()
  const [loading,  setLoading]  = useState(false)
  const [enrolled, setEnrolled] = useState(false)

  const handleEnroll = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { error } = await supabase.from('enrollments').insert({
        student_id: user.id,
        course_id:  courseId,
        progress:   0,
      })
      if (error) throw error

      setEnrolled(true)
      toast.success('Enrolled successfully!')
      // Refresh the server component so the enroll card updates
      router.refresh()
    } catch (err) {
      toast.error(err.message || 'Failed to enroll')
    } finally {
      setLoading(false)
    }
  }

  if (enrolled) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 justify-center text-green-600">
          <CheckCircle size={16}/><span className="font-sans font-semibold text-sm">Enrolled!</span>
        </div>
        <button onClick={() => router.push('/dashboard')} className="btn-primary w-full justify-center">
          Go to Dashboard <ArrowRight size={14}/>
        </button>
      </div>
    )
  }

  return (
    <button onClick={handleEnroll} disabled={loading}
      className="btn-primary w-full justify-center py-3.5 disabled:opacity-60">
      {loading
        ? <span className="flex items-center gap-2 justify-center">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Enrolling…
          </span>
        : <span className="flex items-center gap-2 justify-center">
            {isFree ? 'Enroll free' : `Enroll for $${price}`} <ArrowRight size={14}/>
          </span>
      }
    </button>
  )
}
