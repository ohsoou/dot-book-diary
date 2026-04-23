import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

export { getLastReadAtFromStore } from './last-read-store';

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
