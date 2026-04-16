'use client'

import { useEffect } from 'react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="min-h-screen bg-[#2a1f17] px-4 py-6 flex flex-col items-center justify-center gap-4">
      <p className="text-sm text-[#d7c199]">오류가 생겼어요.</p>
      <button
        onClick={reset}
        className="bg-[#e89b5e] border border-[#1a100a] text-[#2a1f17] px-3 py-2 text-sm transition-colors duration-100 ease-linear hover:bg-[#f0a96c] active:translate-y-px"
      >
        다시 시도
      </button>
    </main>
  )
}