import RegisterClient from './RegisterClient'
export const metadata = { title: 'Create Account' }
export default function RegisterPage({ searchParams }) {
  const role = searchParams?.role === 'instructor' ? 'instructor' : 'student'
  return <RegisterClient defaultRole={role} />
}
