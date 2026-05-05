import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Clock, BookOpen, Award, Users, ArrowRight, CheckCircle } from 'lucide-react'

export async function generateMetadata({ params }) {
  const supabase = createClient()
  const { data } = await supabase.from('courses').select('title,short_desc').eq('id', params.id).single()
  if (!data) return { title: 'Course not found' }
  return { title: data.title, description: data.short_desc }
}

export default async function CourseDetailPage({ params }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: course }, { data: modules }] = await Promise.all([
    supabase.from('courses').select('*, instructor:instructor_id(id,full_name,bio,credentials)').eq('id', params.id).single(),
    supabase.from('modules').select('*').eq('course_id', params.id).order('sort_order'),
  ])

  if (!course || (!course.published && !course.approved)) notFound()

  let enrolled = false
  if (user) {
    const { data: enroll } = await supabase.from('enrollments').select('id').eq('student_id', user.id).eq('course_id', params.id).single()
    enrolled = !!enroll
  }

  const LEVEL = { beginner:'Beginner', intermediate:'Intermediate', advanced:'Advanced' }

  return (
    <div className="min-h-screen bg-violet-50">
      {/* Hero */}
      <div className="bg-violet-900 text-white py-16 px-5 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage:'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 48px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 48px)' }} />
        <div className="relative max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/courses" className="font-mono text-xs text-violet-400 hover:text-violet-200 transition-colors">Courses</Link>
            <span className="text-violet-600">/</span>
            <span className="font-mono text-xs text-violet-300">{course.category}</span>
          </div>
          <div className="grid md:grid-cols-[1fr_300px] gap-10 items-start">
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="badge bg-white/15 text-white border-0">{course.category}</span>
                <span className="badge bg-white/15 text-white border-0">{LEVEL[course.level] || course.level}</span>
                {course.is_free && <span className="badge-solar">Free</span>}
              </div>
              <h1 className="font-display text-4xl font-bold leading-tight mb-4">{course.title}</h1>
              <p className="font-sans text-violet-200 text-base leading-relaxed max-w-2xl">{course.description || course.short_desc}</p>
              <div className="flex flex-wrap gap-6 mt-6 text-sm">
                <div className="flex items-center gap-2 text-violet-300"><Clock size={14}/><span className="font-sans">{course.duration_hours}h total</span></div>
                <div className="flex items-center gap-2 text-violet-300"><BookOpen size={14}/><span className="font-sans">{modules?.length || 0} modules</span></div>
                {course.instructor?.full_name && <div className="flex items-center gap-2 text-violet-300"><Users size={14}/><span className="font-sans">{course.instructor.full_name}</span></div>}
              </div>
            </div>
            {/* Enroll card */}
            <div className="card p-6">
              <div className="text-center mb-5">
                {course.is_free
                  ? <p className="font-display text-4xl font-bold text-violet-900">Free</p>
                  : <p className="font-display text-4xl font-bold text-violet-900">${course.price}</p>
                }
              </div>
              {enrolled ? (
                <div>
                  <div className="flex items-center gap-2 justify-center mb-4 text-green-600">
                    <CheckCircle size={16}/><span className="font-sans font-semibold text-sm">Enrolled</span>
                  </div>
                  <Link href="/dashboard" className="btn-primary w-full text-center">Go to Dashboard</Link>
                </div>
              ) : (
                <EnrollButton courseId={course.id} userId={user?.id} isFree={course.is_free} price={course.price} />
              )}
              <div className="mt-4 space-y-2">
                {['Full lifetime access','AI-personalized delivery','Live expert sessions','Certificate on completion'].map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <CheckCircle size={12} className="text-violet-500 flex-shrink-0"/>
                    <span className="font-sans text-xs text-muted">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-5 py-12 grid md:grid-cols-[1fr_300px] gap-10">
        {/* Modules */}
        <div>
          <h2 className="font-display text-2xl font-bold text-violet-900 mb-6">Course content</h2>
          {modules?.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="font-sans text-sm text-muted">Modules are being prepared.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {modules?.map((mod, i) => (
                <div key={mod.id} className="card p-4 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold text-violet-600">
                    {String(i+1).padStart(2,'0')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-sm font-semibold text-violet-900">{mod.title}</p>
                    {mod.description && <p className="font-sans text-xs text-muted mt-0.5 truncate">{mod.description}</p>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {mod.content_type && <span className="badge-violet text-xs">{mod.content_type}</span>}
                    {mod.duration_mins && <span className="font-mono text-xs text-muted">{mod.duration_mins}m</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructor */}
        {course.instructor && (
          <div>
            <h2 className="font-display text-lg font-bold text-violet-900 mb-4">Your instructor</h2>
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-violet-700 flex items-center justify-center text-white font-display font-bold text-lg">
                  {(course.instructor.full_name||'?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-display font-semibold text-violet-900">{course.instructor.full_name}</p>
                  {course.instructor.credentials && <p className="font-mono text-xs text-violet-500 mt-0.5">{course.instructor.credentials}</p>}
                </div>
              </div>
              {course.instructor.bio && <p className="font-sans text-sm text-muted leading-relaxed">{course.instructor.bio}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Client enroll button
function EnrollButton({ courseId, userId, isFree, price }) {
  if (!userId) {
    return <Link href="/auth/register" className="btn-primary w-full text-center">Sign up to enroll <ArrowRight size={14}/></Link>
  }
  return <EnrollButtonClient courseId={courseId} isFree={isFree} price={price} />
}

// We need a thin client wrapper for the enroll action
import EnrollButtonClient from './EnrollButtonClient'
