import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export const metadata = { title: '새 비밀번호 설정' }

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-8 text-center">새 비밀번호 설정</h1>
        <ResetPasswordForm />
      </div>
    </main>
  )
}
