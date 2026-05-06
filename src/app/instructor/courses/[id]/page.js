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

  const [{ data: course }, { data: modules }] = await Promise.all([
    supabase.from('courses').select('*').eq('id', params.id).single(),
    supabase.from('modules').select('*').eq('course_id', params.id).order('sort_order'),
  ])

  if (!course) notFound()
  if (course.instructor_id !== user.id) redirect('/instructor')

  return <CourseEditorClient course={course} initialModules={modules || []} />
}
