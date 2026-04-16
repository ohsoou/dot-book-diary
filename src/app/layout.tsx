import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: '도트 북 다이어리', template: '%s · 도트 북 다이어리' },
  description: '따뜻한 도트 방에서 쓰는 독서 기록',
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" data-theme="night">
      <body className="min-h-screen bg-[#2a1f17] text-[#d7c199]">{children}</body>
    </html>
  )
}
