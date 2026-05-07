import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Clock, BookOpen, Users, CheckCircle, ArrowRight, Lock } from 'lucide-react'
import EnrollButtonClient from './EnrollButtonClient'

export async function generateMetadata({ params }) {
  const supabase = createClient()
  const { data } = await supabase.from('courses').select('title,short_desc').eq('id', params.id).single()
  if (!data) return { title: 'Course not found' }
  return { title: data.title, description: data.short_desc }
}

export default async function CourseDetailPage({ params }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: course }, { data: sections }, { data: modules }] = await Promise.all([
    supabase.from('courses').select('*, instructor:instructor_id(id,full_name,bio,credentials)').eq('id', params.id).single(),
    supabase.from('sections').select('*').eq('course_id', params.id).order('sort_order'),
    supabase.from('modules').select('id,title,content_type,duration_mins,section_id,sort_order').eq('course_id', params.id).order('sort_order'),
  ])

  if (!course) notFound()

  // Allow instructor to preview their own draft
  const isInstructor = user?.id === course.instructor_id
  if (!course.published && !isInstructor) notFound()

  let enrolled = false
  if (user) {
    const { data: enroll } = await supabase.from('enrollments').select('id').eq('student_id', user.id).eq('course_id', params.id).single()
    enrolled = !!enroll
  }

  const LEVEL = { beginner:'Beginner', intermediate:'Intermediate', advanced:'Advanced' }
  const TYPE_LABEL = { text:'Lesson', video:'Video', interactive:'Assignment', quiz:'Quiz', scenario:'Case Study' }
  const TYPE_ICON  = { text:'📄', video:'🎬', interactive:'⚡', quiz:'✅', scenario:'🌍' }

  // Group modules by section
  const ungrouped = modules?.filter(m => !m.section_id) || []
  const sectionsWithModules = (sections || []).map(s => ({
    ...s,
    modules: (modules || []).filter(m => m.section_id === s.id),
  }))

  const totalModules = modules?.length || 0
  const totalMins    = modules?.reduce((s, m) => s + (m.duration_mins || 0), 0) || 0

  return (
    <div className="min-h-screen bg-violet-50">
      {/* Draft banner */}
      {!course.published && isInstructor && (
        <div className="bg-solar-100 border-b border-solar-300 px-5 py-2.5 text-center">
          <p className="font-mono text-xs text-solar-800">
            ⚠️ Preview mode — this course is a draft and not visible to students yet.{' '}
            <Link href={`/instructor/courses/${course.id}`} className="underline font-semibold">Edit course</Link>
          </p>
        </div>
      )}

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
          <div className="grid md:grid-cols-[1fr_320px] gap-10 items-start">
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="badge bg-white/15 text-white border-0">{course.category}</span>
                <span className="badge bg-white/15 text-white border-0">{LEVEL[course.level] || course.level}</span>
                {course.is_free && <span className="badge-solar">Free</span>}
              </div>
              <h1 className="font-display text-4xl font-bold leading-tight mb-4">{course.title}</h1>
              <p className="font-sans text-violet-200 text-base leading-relaxed max-w-2xl">
                {course.description || course.short_desc}
              </p>
              <div className="flex flex-wrap gap-6 mt-6 text-sm">
                <div className="flex items-center gap-2 text-violet-300"><Clock size={14}/><span>{totalMins > 0 ? `${(totalMins/60).toFixed(1)}h` : course.duration_hours ? `${course.duration_hours}h` : '—'} total</span></div>
                <div className="flex items-center gap-2 text-violet-300"><BookOpen size={14}/><span>{totalModules} modules</span></div>
                {course.instructor?.full_name && <div className="flex items-center gap-2 text-violet-300"><Users size={14}/><span>{course.instructor.full_name}</span></div>}
              </div>
            </div>

            {/* Enroll card */}
            <div className="card p-6">
              <div className="text-center mb-5">
                <p className="font-display text-4xl font-bold text-violet-900">
                  {course.is_free ? 'Free' : `$${course.price}`}
                </p>
              </div>
              {enrolled ? (
                <div>
                  <div className="flex items-center gap-2 justify-center mb-4 text-green-600">
                    <CheckCircle size={16}/><span className="font-sans font-semibold text-sm">Enrolled</span>
                  </div>
                  <Link href="/dashboard" className="btn-primary w-full text-center">Go to Dashboard</Link>
                </div>
              ) : isInstructor ? (
                <Link href={`/instructor/courses/${course.id}`} className="btn-primary w-full text-center">
                  Edit Course
                </Link>
              ) : !user ? (
                <Link href="/auth/register" className="btn-primary w-full text-center">Sign up to enroll <ArrowRight size={14}/></Link>
              ) : (
                <EnrollButtonClient courseId={course.id} isFree={course.is_free} price={course.price} />
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

      {/* Curriculum */}
      <div className="max-w-5xl mx-auto px-5 py-12 grid md:grid-cols-[1fr_300px] gap-10">
        <div>
          <h2 className="font-display text-2xl font-bold text-violet-900 mb-6">Course content</h2>

          {sectionsWithModules.length === 0 && ungrouped.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="font-sans text-sm text-muted">Modules are being prepared.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sectionsWithModules.map(section => (
                <div key={section.id} className="card overflow-hidden">
                  {/* Section header */}
                  <div className="bg-violet-900 text-white px-5 py-3.5">
                    <p className="font-display font-bold text-sm">{section.title}</p>
                    <p className="font-mono text-xs text-violet-400 mt-0.5">
                      {section.modules.length} item{section.modules.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {/* Concept overview */}
                  {section.overview && (
                    <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
                      <p className="font-mono text-xs text-amber-600 uppercase tracking-wider mb-1">Concept Overview</p>
                      <p className="font-sans text-sm text-amber-900 leading-relaxed">{section.overview}</p>
                    </div>
                  )}
                  {/* Module rows */}
                  <div className="divide-y divide-border">
                    {section.modules.map(mod => (
                      <div key={mod.id} className="flex items-center gap-3 px-5 py-3">
                        <span className="text-base flex-shrink-0">{TYPE_ICON[mod.content_type] || '📄'}</span>
                        <p className="font-sans text-sm text-violet-900 flex-1">{mod.title}</p>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="font-mono text-xs text-muted">{TYPE_LABEL[mod.content_type]}</span>
                          {mod.duration_mins && <span className="font-mono text-xs text-muted">{mod.duration_mins}m</span>}
                          {!enrolled && !isInstructor && <Lock size={11} className="text-violet-300"/>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {ungrouped.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="bg-violet-100 px-5 py-3">
                    <p className="font-mono text-xs text-muted uppercase tracking-wider">Additional Content</p>
                  </div>
                  <div className="divide-y divide-border">
                    {ungrouped.map(mod => (
                      <div key={mod.id} className="flex items-center gap-3 px-5 py-3">
                        <span className="text-base">{TYPE_ICON[mod.content_type] || '📄'}</span>
                        <p className="font-sans text-sm text-violet-900 flex-1">{mod.title}</p>
                        <span className="font-mono text-xs text-muted">{mod.duration_mins ? `${mod.duration_mins}m` : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
