import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'
import { BottomNav } from '@/components/nav/BottomNav'
import { GuestArchiver } from '@/components/auth/GuestArchiver'
import { ThemeHydrator } from '@/components/theme/ThemeHydrator'
import { createClient } from '@/lib/supabase/server'
import { resolveTheme } from '@/lib/theme'
import type { ThemePreference } from '@/lib/theme'

export const metadata: Metadata = {
  title: { default: '도트 북 다이어리', template: '%s · 도트 북 다이어리' },
  description: '따뜻한 도트 방에서 쓰는 독서 기록',
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.ico' },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let themePreference: ThemePreference = 'system';

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('theme_preference')
        .eq('user_id', user.id)
        .single();

      if (profile?.theme_preference) {
        themePreference = profile.theme_preference as ThemePreference;
      }
    }
  } catch {
    // 세션 조회 실패 시 기본값 유지
  }

  const theme = resolveTheme(themePreference);

  return (
    <html lang="ko" data-theme={theme}>
      <body className="min-h-screen pb-[64px]">
        <ThemeHydrator />
        <ToastProvider>
          <GuestArchiver />
          {children}
          <BottomNav />
        </ToastProvider>
      </body>
    </html>
  )
}
