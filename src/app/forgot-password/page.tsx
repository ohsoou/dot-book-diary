import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

export const metadata = { title: '비밀번호 재설정' }

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-8 text-center">비밀번호 재설정</h1>
        <ForgotPasswordForm />
      </div>
    </main>
  )
}
