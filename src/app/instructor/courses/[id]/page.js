import { createClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import CourseEditorClient from './CourseEditorClient'

export async function generateMetadata({ params }) {
  const supabase = createClient()
  const { data } = await supabase.from('courses').select('title').eq('id', params.id).single()
  return { title: data ? `Edit: ${data.title}` : 'Course Editor' }
}

export default async function CourseEditorPage({ params }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: course }, { data: sections }, { data: modules }, { data: enrollments }] = await Promise.all([
    supabase.from('courses').select('*').eq('id', params.id).single(),
    supabase.from('sections').select('*').eq('course_id', params.id).order('sort_order'),
    supabase.from('modules').select('*').eq('course_id', params.id).order('sort_order'),
    supabase.from('enrollments')
      .select('*, profiles:student_id(id, full_name, email, created_at)')
      .eq('course_id', params.id)
      .order('enrolled_at', { ascending: false }),
  ])

  if (!course) notFound()
  if (course.instructor_id !== user.id) redirect('/instructor')

  return (
    <CourseEditorClient
      course={course}
      initialSections={sections || []}
      initialModules={modules || []}
      initialEnrollments={enrollments || []}
    />
  )
}
