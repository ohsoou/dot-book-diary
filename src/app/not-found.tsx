import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#2a1f17] px-4 py-6 flex flex-col items-center justify-center gap-4">
      <p className="text-sm text-[#d7c199]">페이지를 찾을 수 없어요.</p>
      <Link
        href="/"
        className="bg-transparent border border-[#8b6f4a] text-[#d7c199] px-3 py-2 text-sm transition-colors duration-100 ease-linear hover:border-[#e89b5e] hover:text-[#f4e4c1]"
      >
        홈으로 돌아가기
      </Link>
    </main>
  )
}