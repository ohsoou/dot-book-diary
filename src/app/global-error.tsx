'use client'

import { useEffect } from 'react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="ko">
      <body
        style={{
          backgroundColor: '#2a1f17',
          color: '#d7c199',
          fontFamily: 'monospace',
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px',
          padding: '24px',
          margin: 0,
        }}
      >
        <p style={{ fontSize: '14px' }}>심각한 오류가 생겼어요.</p>
        <button
          onClick={reset}
          style={{
            backgroundColor: '#e89b5e',
            border: '1px solid #1a100a',
            color: '#2a1f17',
            padding: '8px 12px',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          다시 시도
        </button>
      </body>
    </html>
  )
}