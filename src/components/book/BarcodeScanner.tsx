'use client'

import { useEffect, useRef, useState } from 'react'
import { UnsupportedEnvScreen } from '@/components/ui/UnsupportedEnvScreen'
import { useToast } from '@/components/ui/Toast'
import type { BookSearchResult } from '@/types'

interface BarcodeScannerProps {
  onScanResult: (book: BookSearchResult) => void
  onFallbackToSearch: () => void
}

type ScannerState = 'loading' | 'active' | 'unsupported' | 'error'

export function BarcodeScanner({ onScanResult, onFallbackToSearch }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const { addToast } = useToast()
  const [scannerState, setScannerState] = useState<ScannerState>('loading')
  const [flash, setFlash] = useState(false)

  const cleanup = () => {
    import('@/lib/barcode').then(({ stopScanner }) => stopScanner())
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  useEffect(() => {
    const protocol = typeof location !== 'undefined' ? location.protocol : 'https:'
    const hostname = typeof location !== 'undefined' ? location.hostname : 'localhost'

    if (protocol !== 'https:' && hostname !== 'localhost') {
      addToast({ message: 'HTTPS 환경에서만 카메라를 사용할 수 있어요', variant: 'error' })
      onFallbackToSearch()
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerState('unsupported')
      return
    }

    let cancelled = false

    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setScannerState('active')

        const { startScanner } = await import('@/lib/barcode')
        if (cancelled || !videoRef.current) return

        await startScanner(
          videoRef.current,
          async (isbn) => {
            setFlash(true)
            setTimeout(() => setFlash(false), 300)

            const res = await fetch(`/api/books/isbn?isbn=${encodeURIComponent(isbn)}`)
            const json = await res.json() as { data?: BookSearchResult; error?: { message: string } }
            if (res.ok && json.data) {
              addToast({ message: '바코드를 인식했어요', variant: 'success' })
              onScanResult(json.data)
            } else {
              addToast({ message: json.error?.message ?? '책 정보를 가져올 수 없어요', variant: 'error' })
            }
          },
          (err) => {
            if (err.name === 'NotAllowedError') {
              addToast({ message: '카메라 권한이 필요해요', variant: 'error' })
              onFallbackToSearch()
            }
          },
        )
      } catch (err: unknown) {
        if (cancelled) return
        const e = err as { name?: string }
        if (e.name === 'NotAllowedError') {
          addToast({ message: '카메라 권한이 필요해요', variant: 'error' })
          onFallbackToSearch()
        } else if (e.name === 'NotSupportedError' || e.name === 'NotFoundError') {
          setScannerState('unsupported')
        } else {
          setScannerState('error')
        }
      }
    }

    void initCamera()

    return () => {
      cancelled = true
      cleanup()
    }
  }, [addToast, onFallbackToSearch, onScanResult])

  if (scannerState === 'unsupported') {
    return <UnsupportedEnvScreen />
  }

  if (scannerState === 'error') {
    return (
      <p className="text-sm text-[#c85a54] text-center py-8">카메라를 시작할 수 없어요</p>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-full max-w-[320px]">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full aspect-square object-cover bg-[#1a100a]"
          aria-label="바코드 스캐너"
        />
        {/* 가이드 오버레이 */}
        <div
          className="absolute inset-6 border-2 border-dashed border-[#e89b5e] pointer-events-none"
          aria-hidden="true"
        />
        {/* 스캔 성공 플래시 */}
        {flash && (
          <div
            className="absolute inset-0 bg-white/30 pointer-events-none"
            aria-hidden="true"
          />
        )}
      </div>
      <p className="text-xs text-[#a08866]">바코드를 사각형 안에 맞춰주세요</p>
    </div>
  )
}