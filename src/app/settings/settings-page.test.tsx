import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  redirect: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

vi.mock('@/lib/actions/profile', () => ({
  updateProfileAction: vi.fn(),
  signOutAction: vi.fn(),
}))

vi.mock('@/lib/storage/preferences', () => ({
  updatePreferences: vi.fn(),
  getPreferences: vi.fn().mockResolvedValue({}),
}))

const mockGetUser = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockMaybeSingle = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: vi.fn().mockReturnValue({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    }),
  }),
}))

async function renderPage() {
  vi.resetModules()
  const { default: SettingsPage } = await import('./page')
  const jsx = await SettingsPage()
  return render(jsx as React.ReactElement)
}

describe('SettingsPage', () => {
  describe('회원 경로', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'member@example.com' } },
      })
      mockMaybeSingle.mockResolvedValue({
        data: {
          user_id: 'user-1',
          nickname: '테스터',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      })
    })

    it('이메일을 표시한다', async () => {
      await renderPage()
      expect(screen.getByText('member@example.com')).toBeDefined()
    })

    it('로그아웃 버튼을 렌더한다', async () => {
      await renderPage()
      expect(screen.getByRole('button', { name: '로그아웃' })).toBeDefined()
    })

    it('닉네임 기본값을 폼에 채운다', async () => {
      await renderPage()
      const input = screen.getByDisplayValue('테스터')
      expect(input).toBeDefined()
    })

    it('동기화 토글이 disabled 상태로 렌더된다', async () => {
      await renderPage()
      const toggle = screen.getByRole('checkbox', { name: /동기화/ })
      expect((toggle as HTMLInputElement).disabled).toBe(true)
    })
  })

  describe('비회원 경로', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
    })

    it('로그인 링크를 렌더한다', async () => {
      await renderPage()
      const loginLinks = screen.getAllByRole('link', { name: '로그인' })
      expect(loginLinks.length).toBeGreaterThan(0)
      expect((loginLinks[0] as HTMLAnchorElement).href).toContain('/login')
    })

    it('동기화 섹션을 렌더하지 않는다', async () => {
      await renderPage()
      expect(screen.queryByRole('checkbox')).toBeNull()
    })
  })
})
