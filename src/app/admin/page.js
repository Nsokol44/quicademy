import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'
export const metadata = { title: 'Admin Panel' }

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [
    { data: pendingInstructors },
    { data: allInstructors },
    { data: recentUsers },
    { data: stats },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('role','instructor').eq('instructor_status','pending').order('created_at', { ascending: false }),
    supabase.from('profiles').select('*').eq('role','instructor').eq('instructor_status','approved').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id,full_name,email,role,created_at').order('created_at', { ascending: false }).limit(20),
    Promise.resolve({ data: null }),
  ])

  return (
    <AdminClient
      pendingInstructors={pendingInstructors || []}
      approvedInstructors={allInstructors || []}
      recentUsers={recentUsers || []}
    />
  )
}
