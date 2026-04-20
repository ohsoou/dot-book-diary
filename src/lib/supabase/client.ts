'use client';
import { createBrowserClient } from '@supabase/ssr';

/**
 * Client Component에서만 사용.
 * 브라우저 쿠키 기반으로 Supabase 클라이언트를 생성한다.
 * env.ts를 임포트하지 않는다 — serverEnv 파싱이 클라이언트에서 실행되면
 * ALADIN_TTB_KEY 등 서버 전용 변수가 undefined여서 ZodError가 발생한다.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}