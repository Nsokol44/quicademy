import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import BlogAdminClient from './BlogAdminClient'
export const metadata = { title: 'Blog Admin' }

export default async function BlogAdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false })

  return <BlogAdminClient posts={posts || []} />
}
