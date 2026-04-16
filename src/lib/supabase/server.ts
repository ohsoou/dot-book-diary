import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { clientEnv } from '@/lib/env';

/**
 * Server Component / Route Handler / Server Action에서만 사용.
 * 쿠키 기반 세션을 읽고 Supabase 클라이언트를 생성한다.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component에서 호출 시 쿠키를 쓸 수 없다.
            // middleware가 세션 갱신을 담당하므로 무시해도 안전하다.
          }
        },
      },
    },
  );
}
