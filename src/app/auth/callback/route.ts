import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * OAuth / 매직링크 code 교환 엔드포인트.
 * Supabase가 인증 완료 후 이 URL로 리다이렉트한다.
 *
 * 에러 매핑:
 * - code 없음 또는 OTP/매직링크 교환 실패 → /login?error=link_expired
 * - OAuth provider callback 에러 → /login?error=oauth_failed
 * - 세션 수립 후 profile upsert 실패 → /login?error=profile_setup_failed
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const providerError = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin;

  // OAuth provider가 에러 파라미터를 포함해 돌아온 경우
  if (providerError) {
    return NextResponse.redirect(new URL('/login?error=oauth_failed', appUrl));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=link_expired', appUrl));
  }

  const supabase = await createClient();

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    // OAuth 계열 에러와 매직링크/OTP 에러를 구분한다.
    const isOAuthError =
      exchangeError.message.toLowerCase().includes('oauth') ||
      exchangeError.message.toLowerCase().includes('provider');
    const errorParam = isOAuthError ? 'oauth_failed' : 'link_expired';
    return NextResponse.redirect(new URL(`/login?error=${errorParam}`, appUrl));
  }

  // 세션이 수립된 후 profiles row를 보장한다.
  // handle_new_user trigger가 이미 생성했을 수 있으므로 on conflict do nothing.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ user_id: user.id }, { onConflict: 'user_id', ignoreDuplicates: true });

    if (profileError) {
      return NextResponse.redirect(new URL('/login?error=profile_setup_failed', appUrl));
    }
  }

  return NextResponse.redirect(new URL('/', appUrl));
}
