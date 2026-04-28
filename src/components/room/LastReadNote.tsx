'use client'

import { formatElapsed } from '@/lib/bear-state'
import { useBearState } from './BearStateContext'

interface LastReadNoteProps {
  lastReadAt?: string | null
  now?: Date
}

export function LastReadNote({ lastReadAt: lastReadAtProp, now = new Date() }: LastReadNoteProps) {
  const { lastReadAt: contextLastReadAt } = useBearState()
  const lastReadAt = lastReadAtProp !== undefined ? lastReadAtProp : contextLastReadAt

  let content: React.ReactNode = '아직 독서 기록이 없어요'
  if (lastReadAt !== null) {
    const parsed = new Date(lastReadAt)
    if (!isNaN(parsed.getTime())) {
      const elapsedMs = now.getTime() - parsed.getTime()
      const elapsedText = elapsedMs >= 0 ? formatElapsed(elapsedMs) : '방금'
      content = (
        <>
          마지막 독서: <time dateTime={lastReadAt}>{elapsedText}</time>
        </>
      )
    }
  }

  return (
    <div className="w-full px-4 py-4">
      <div className="bg-[#3a2a1a] border-2 border-[#1a100a] shadow-[2px_2px_0_#1a100a] px-4 py-3 w-full">
        <p className="text-sm text-[#d7c199]">{content}</p>
      </div>
    </div>
  )
}
