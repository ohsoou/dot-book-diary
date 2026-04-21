import type { Book, ReadingSession } from '@/types'
import { computeGoal } from '@/lib/goal'

interface GoalProgressProps {
  book: Book
  sessions: ReadingSession[]
  variant?: 'full' | 'compact'
}

const STATUS_LABEL: Record<string, string> = {
  'on-track': '순항',
  behind: '조금 밀림',
  overdue: '며칠 더 필요해요',
}

export function GoalProgress({ book, sessions, variant = 'full' }: GoalProgressProps) {
  const summary = computeGoal(book, sessions)

  if (variant === 'compact') {
    if (!book.targetDate) return null

    const fillPct =
      summary.pageProgress != null
        ? Math.min(Math.max(Math.round(summary.pageProgress * 100), 0), 100)
        : null

    const dLabel =
      summary.remainingDays != null
        ? summary.remainingDays > 0
          ? `D-${summary.remainingDays}`
          : summary.remainingDays === 0
            ? 'D-Day'
            : `D+${Math.abs(summary.remainingDays)}`
        : null

    return (
      <div className="flex items-center gap-2 px-1 py-0.5">
        {fillPct != null && (
          <div className="flex-1 h-1.5 border border-[var(--color-border)] bg-[var(--color-bg-input)]">
            <div
              className="h-full bg-[var(--color-accent)]"
              style={{ width: `${fillPct}%` }}
            />
          </div>
        )}
        {dLabel && (
          <span className="text-[10px] text-[var(--color-text-secondary)] tabular-nums whitespace-nowrap">
            {dLabel}
          </span>
        )}
      </div>
    )
  }

  // full variant
  if (!book.targetDate) {
    return (
      <p className="text-xs text-[var(--color-text-secondary)]">
        목표 완독일을 정해 볼까요?
      </p>
    )
  }

  const fillPct =
    summary.pageProgress != null
      ? Math.min(Math.max(Math.round(summary.pageProgress * 100), 0), 100)
      : null

  const daysLabel =
    summary.remainingDays != null
      ? summary.remainingDays > 0
        ? `${summary.remainingDays}일 남음`
        : summary.remainingDays === 0
          ? '오늘까지'
          : `${Math.abs(summary.remainingDays)}일 지남`
      : null

  const statusLabel = summary.status !== 'none' ? STATUS_LABEL[summary.status] : null

  return (
    <div className="border border-[var(--color-border)] px-3 py-2 flex items-center gap-3">
      {fillPct != null && (
        <div className="h-2 flex-1 bg-[var(--color-bg-input)] border border-[var(--color-border)]">
          <div
            className="h-full bg-[var(--color-accent)]"
            style={{ width: `${fillPct}%` }}
          />
        </div>
      )}
      {fillPct != null && (
        <span className="text-xs text-[var(--color-text-secondary)] tabular-nums">
          {fillPct}%
        </span>
      )}
      {daysLabel && (
        <span className="text-xs text-[var(--color-text-secondary)] tabular-nums">
          {daysLabel}
        </span>
      )}
      {statusLabel && (
        <span className="text-xs text-[var(--color-text-secondary)]">{statusLabel}</span>
      )}
    </div>
  )
}
