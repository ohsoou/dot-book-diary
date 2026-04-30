import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 이메일 확인 후 세션 수립 엔드포인트.
 * Supabase가 이메일 확인 완료 후 이 URL로 리다이렉트한다.
 *
 * 에러 매핑:
 * - code 없음 또는 code 교환 실패 → /login?error=link_expired
 * - 세션 수립 후 profile upsert 실패 → /login?error=profile_setup_failed
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin;

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=link_expired', appUrl));
  }

  const supabase = await createClient();

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(new URL('/login?error=link_expired', appUrl));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // signUpAction이 user_metadata.nickname에 저장한 값을 가져온다.
    // handle_new_user 트리거는 nickname 없이 생성할 수 있으므로 항상 upsert로 덮어쓴다.
    const nickname = (user.user_metadata?.nickname as string | undefined) ?? '책곰이';
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ user_id: user.id, nickname }, { onConflict: 'user_id' });

    if (profileError) {
      return NextResponse.redirect(new URL('/login?error=profile_setup_failed', appUrl));
    }
  }

  return NextResponse.redirect(new URL('/', appUrl));
}
