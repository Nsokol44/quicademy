import { createClient } from '@/lib/supabase-server'
import CoursesClient from './CoursesClient'
export const metadata = { title: 'Browse Courses' }

export default async function CoursesPage({ searchParams }) {
  const supabase = createClient()
  const category = searchParams?.category || 'all'
  const level    = searchParams?.level    || 'all'

  let query = supabase.from('courses').select('*').eq('published',true).eq('approved',true)
  if (category !== 'all') query = query.eq('category', category)
  if (level    !== 'all') query = query.eq('level', level)
  const { data: courses } = await query.order('created_at', { ascending:false })

  return <CoursesClient courses={courses||[]} activeCategory={category} activeLevel={level} />
}
