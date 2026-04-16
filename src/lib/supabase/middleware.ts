import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { clientEnv } from '@/lib/env';

/**
 * 모든 요청에서 Supabase 세션을 갱신한다.
 * src/middleware.ts에서 `middleware`로 export된다.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 세션 갱신을 트리거한다.
  // getUser()를 호출해야 쿠키가 올바르게 refresh된다.
  await supabase.auth.getUser();

  return supabaseResponse;
}

/** `updateSession`은 `middleware`의 alias. 이전 step 지시와 호환 유지. */
export const updateSession = middleware;