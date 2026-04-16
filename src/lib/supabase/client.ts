'use client';
import { createBrowserClient } from '@supabase/ssr';
import { clientEnv } from '@/lib/env';

/**
 * Client Component에서만 사용.
 * 브라우저 쿠키 기반으로 Supabase 클라이언트를 생성한다.
 */
export function createClient() {
  return createBrowserClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}