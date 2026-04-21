import type { Book, ReadingSession } from '@/types';
import { formatLocalYmd } from './date';

export type GoalStatus = 'none' | 'on-track' | 'behind' | 'overdue';

export interface GoalSummary {
  pageProgress: number | null;
  dateProgress: number | null;
  maxEndPage: number | null;
  remainingDays: number | null;
  status: GoalStatus;
}

export function computeGoal(
  book: Book,
  sessions: ReadingSession[],
  today: Date = new Date(),
): GoalSummary {
  const endPages = sessions
    .filter((s) => s.endPage != null)
    .map((s) => s.endPage as number);
  const maxEndPage = endPages.length > 0 ? Math.max(...endPages) : null;

  const pageProgress =
    book.totalPages != null && maxEndPage != null
      ? Math.min(maxEndPage / book.totalPages, 1)
      : null;

  const todayYmd = formatLocalYmd(today);

  let dateProgress: number | null = null;
  let remainingDays: number | null = null;

  if (book.targetDate) {
    const createdYmd = formatLocalYmd(new Date(book.createdAt));
    const createdMs = new Date(createdYmd).getTime();
    const targetMs = new Date(book.targetDate).getTime();
    const todayMs = new Date(todayYmd).getTime();

    const span = targetMs - createdMs;
    if (span > 0) {
      dateProgress = (todayMs - createdMs) / span;
    }

    remainingDays = Math.ceil((targetMs - todayMs) / 86_400_000);
  }

  if (!book.targetDate) {
    return { pageProgress, dateProgress, maxEndPage, remainingDays, status: 'none' };
  }

  const pageNotComplete = pageProgress == null || pageProgress < 1;
  const isOverdue = todayYmd > book.targetDate && pageNotComplete;
  if (isOverdue) {
    return { pageProgress, dateProgress, maxEndPage, remainingDays, status: 'overdue' };
  }

  if (pageProgress === 1) {
    return { pageProgress, dateProgress, maxEndPage, remainingDays, status: 'on-track' };
  }

  if (pageProgress != null && dateProgress != null) {
    if (pageProgress >= dateProgress) {
      return { pageProgress, dateProgress, maxEndPage, remainingDays, status: 'on-track' };
    }
    if (dateProgress - pageProgress >= 0.1) {
      return { pageProgress, dateProgress, maxEndPage, remainingDays, status: 'behind' };
    }
  }

  return { pageProgress, dateProgress, maxEndPage, remainingDays, status: 'on-track' };
}
