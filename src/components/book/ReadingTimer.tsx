'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import * as timerLib from '@/lib/reading-timer'
import type { TimerState } from '@/lib/reading-timer'

interface ReadingTimerProps {
  bookId: string
  onStop: (seconds: number) => void
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${mm}:${ss}`
  }
  return `${mm}:${ss}`
}

function resolveStatus(state: TimerState | null, bookId: string): 'running' | 'paused' | 'stopped' {
  if (!state || state.bookId !== bookId) return 'stopped'
  return state.status
}

export function ReadingTimer({ bookId, onStop }: ReadingTimerProps) {
  const [state, setState] = useState<TimerState | null>(() => timerLib.read())
  const [now, setNow] = useState(() => Date.now())
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const status = resolveStatus(state, bookId)
  const effectiveState = state?.bookId === bookId ? state : null
  const displayMs = effectiveState ? timerLib.elapsedMs(effectiveState, now) : 0

  useEffect(() => {
    if (status === 'running') {
      intervalRef.current = setInterval(() => {
        setNow(Date.now())
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [status])

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'dbd:reading_timer') {
        setState(timerLib.read())
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const handleStart = useCallback(() => {
    const existing = timerLib.read()
    if (existing && existing.bookId !== bookId) {
      setShowConflictDialog(true)
      return
    }
    const s = timerLib.start(bookId)
    setState(s)
    setNow(Date.now())
  }, [bookId])

  const handleConflictConfirm = useCallback(() => {
    timerLib.clear()
    const s = timerLib.start(bookId)
    setState(s)
    setNow(Date.now())
    setShowConflictDialog(false)
  }, [bookId])

  const handlePause = useCallback(() => {
    const s = timerLib.pause()
    setState(s)
    setNow(Date.now())
  }, [])

  const handleResume = useCallback(() => {
    const s = timerLib.resume()
    setState(s)
    setNow(Date.now())
  }, [])

  const handleStop = useCallback(() => {
    const result = timerLib.stop()
    setState(null)
    if (result) {
      onStop(result.seconds)
    }
  }, [onStop])

  return (
    <>
      <div className="border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 flex items-center gap-4">
        <span className="text-2xl tabular-nums text-[var(--color-text-primary)]">
          {formatTime(displayMs)}
        </span>
        <div className="flex gap-2">
          {status === 'stopped' && (
            <Button size="sm" onClick={handleStart}>
              시작
            </Button>
          )}
          {status === 'running' && (
            <>
              <Button size="sm" variant="secondary" onClick={handlePause}>
                일시정지
              </Button>
              <Button size="sm" variant="danger" onClick={handleStop}>
                정지
              </Button>
            </>
          )}
          {status === 'paused' && (
            <>
              <Button size="sm" onClick={handleResume}>
                재개
              </Button>
              <Button size="sm" variant="danger" onClick={handleStop}>
                정지
              </Button>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showConflictDialog}
        title="다른 책의 타이머가 실행 중이에요"
        message="다른 책의 타이머를 정지하고 이 책의 타이머를 시작할까요?"
        confirmLabel="정지하고 시작"
        onConfirm={handleConflictConfirm}
        onCancel={() => setShowConflictDialog(false)}
      />
    </>
  )
}
