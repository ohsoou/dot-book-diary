import type { Book, ReadingSession } from '@/types'
import { ReadingSessionForm } from './ReadingSessionForm'

interface ReadingPageContentProps {
  book: Book
  sessions: ReadingSession[]
  isLoggedIn: boolean
}

export function ReadingPageContent({ book, sessions, isLoggedIn }: ReadingPageContentProps) {
  return <ReadingSessionForm book={book} sessions={sessions} isLoggedIn={isLoggedIn} />
}
