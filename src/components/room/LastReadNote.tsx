import { formatElapsed } from '@/lib/bear-state'

interface LastReadNoteProps {
  lastReadAt: string | null
  now?: Date
}

export function LastReadNote({ lastReadAt, now = new Date() }: LastReadNoteProps) {
  if (lastReadAt === null) {
    return (
      <p className="py-1 text-center text-xs text-[var(--color-text-secondary)]">
        아직 독서 기록이 없어요
      </p>
    )
  }

  const parsed = new Date(lastReadAt)
  if (isNaN(parsed.getTime())) {
    return (
      <p className="py-1 text-center text-xs text-[var(--color-text-secondary)]">
        아직 독서 기록이 없어요
      </p>
    )
  }

  const elapsedMs = now.getTime() - parsed.getTime()
  const elapsedText = elapsedMs >= 0 ? formatElapsed(elapsedMs) : '방금'

  return (
    <p className="py-1 text-center text-xs text-[var(--color-text-secondary)]">
      마지막 독서:{' '}
      <time dateTime={lastReadAt}>{elapsedText}</time>
    </p>
  )
}
