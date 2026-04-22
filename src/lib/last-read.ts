import 'server-only';
import type { Store } from '@/lib/storage/Store';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function getLastReadAtFromStore(store: Store): Promise<string | null> {
  const sessions = await store.listReadingSessions();
  if (sessions.length === 0) return null;

  const latest = sessions.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
  return latest.createdAt;
}

export async function getLastReadAtFromSupabase(
  userId: string,
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('reading_sessions')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return (data as { created_at: string } | null)?.created_at ?? null;
}
