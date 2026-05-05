import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BarChart2 } from 'lucide-react'
export const metadata = { title: 'Analytics' }

export default async function AnalyticsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'instructor') redirect('/dashboard')

  const { data: courses } = await supabase.from('courses').select('id,title').eq('instructor_id', user.id)
  const courseIds = courses?.map(c => c.id) || []

  let enrollmentData = []
  if (courseIds.length > 0) {
    const { data } = await supabase.from('enrollments')
      .select('course_id, progress, enrolled_at, courses(title)')
      .in('course_id', courseIds)
    enrollmentData = data || []
  }

  const totalEnrolled = enrollmentData.length
  const completed = enrollmentData.filter(e => e.progress === 100).length
  const avgProgress = totalEnrolled > 0
    ? Math.round(enrollmentData.reduce((sum, e) => sum + (e.progress || 0), 0) / totalEnrolled)
    : 0

  return (
    <div className="min-h-screen bg-violet-50 py-10 px-5">
      <div className="max-w-5xl mx-auto">
        <Link href="/instructor" className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-800 font-sans text-sm mb-6 transition-colors">
          <ArrowLeft size={14}/> Back to portal
        </Link>
        <h1 className="font-display text-3xl font-bold text-violet-900 mb-8">Course Analytics</h1>

        <div className="grid grid-cols-3 gap-5 mb-10">
          {[
            { label:'Total enrollments', value: totalEnrolled },
            { label:'Completions', value: completed },
            { label:'Avg. progress', value: `${avgProgress}%` },
          ].map(s => (
            <div key={s.label} className="card p-5">
              <p className="font-display text-4xl font-bold text-violet-900">{s.value}</p>
              <p className="font-sans text-xs text-muted mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {courses?.map(course => {
          const courseEnrollments = enrollmentData.filter(e => e.course_id === course.id)
          const comp = courseEnrollments.filter(e => e.progress === 100).length
          return (
            <div key={course.id} className="card p-6 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-lg font-semibold text-violet-900">{course.title}</h3>
                <span className="font-mono text-xs text-muted">{courseEnrollments.length} enrolled</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-violet-100 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-600 rounded-full"
                    style={{ width: courseEnrollments.length > 0 ? `${(comp/courseEnrollments.length)*100}%` : '0%' }} />
                </div>
                <span className="font-mono text-xs text-muted">{comp} completed</span>
              </div>
            </div>
          )
        })}

        {courses?.length === 0 && (
          <div className="card p-12 text-center">
            <BarChart2 size={28} className="text-violet-300 mx-auto mb-3" />
            <p className="font-sans text-sm text-muted">Create courses to see analytics here.</p>
          </div>
        )}
      </div>
    </div>
  )
}
