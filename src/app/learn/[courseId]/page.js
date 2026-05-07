import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import LearnClient from './LearnClient'

export async function generateMetadata({ params }) {
  const supabase = createClient()
  const { data } = await supabase.from('courses').select('title').eq('id', params.courseId).single()
  return { title: data ? `Learning: ${data.title}` : 'Course' }
}

export default async function LearnPage({ params }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [
    { data: enrollment },
    { data: course },
    { data: sections },
    { data: modules },
    { data: progress },
    { data: submissions },
  ] = await Promise.all([
    supabase.from('enrollments').select('*').eq('student_id', user.id).eq('course_id', params.courseId).single(),
    supabase.from('courses').select('*, instructor:instructor_id(id, full_name, email)').eq('id', params.courseId).single(),
    supabase.from('sections').select('*').eq('course_id', params.courseId).order('sort_order'),
    supabase.from('modules').select('*').eq('course_id', params.courseId).order('sort_order'),
    supabase.from('module_progress').select('*').eq('student_id', user.id),
    supabase.from('submissions').select('*').eq('student_id', user.id).eq('course_id', params.courseId),
  ])

  if (!enrollment) redirect(`/courses/${params.courseId}`)
  if (!course) notFound()

  const { data: profile } = await supabase.from('profiles').select('id, full_name, role').eq('id', user.id).single()

  return (
    <LearnClient
      course={course}
      enrollment={enrollment}
      sections={sections || []}
      modules={modules || []}
      initialProgress={progress || []}
      initialSubmissions={submissions || []}
      profile={profile}
    />
  )
}
