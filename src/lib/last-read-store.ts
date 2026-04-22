import type { Store } from '@/lib/storage/Store'

export async function getLastReadAtFromStore(store: Store): Promise<string | null> {
  const sessions = await store.listReadingSessions()
  if (sessions.length === 0) return null
  return sessions.reduce((a, b) => (a.createdAt > b.createdAt ? a : b)).createdAt
}
