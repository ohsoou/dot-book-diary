'use client'

import { useEffect, useState } from 'react'
import { Button } from './Button'

function checkSupport(): boolean {
  try {
    if (typeof indexedDB === 'undefined') return false
    if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') return false
    return true
  } catch {
    return false
  }
}

interface UnsupportedEnvScreenProps {
  onLogin?: () => void
}

export function UnsupportedEnvScreen({ onLogin }: UnsupportedEnvScreenProps) {
  const [unsupported, setUnsupported] = useState(false)

  useEffect(() => {
    setUnsupported(!checkSupport())
  }, [])

  if (!unsupported) return null

  return (
    <div className="fixed inset-0 z-50 min-h-screen bg-[#2a1f17] flex flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm text-[#a08866]">
        이 브라우저에서는 일부 기능이 지원되지 않아요.
      </p>
      <p className="text-xs text-[#6b5540]">
        로그인하면 서버에 저장해서 계속 이용할 수 있어요.
      </p>
      {onLogin && (
        <Button variant="primary" onClick={onLogin}>
          로그인
        </Button>
      )}
    </div>
  )
}