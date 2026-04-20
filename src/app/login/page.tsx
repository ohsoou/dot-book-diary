import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginForm } from '@/components/auth/LoginForm'

interface LoginPageProps {
  searchParams: Promise<{ error?: string; reason?: string }>
}

export const metadata = { title: '로그인' }

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/')
  }

  const { error, reason } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-8 text-center">도트 북 다이어리</h1>
        <LoginForm error={error} reason={reason} />
      </div>
    </main>
  )
}
