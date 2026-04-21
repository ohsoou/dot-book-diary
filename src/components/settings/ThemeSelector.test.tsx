import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/actions/profile', () => ({
  updateThemePreferenceAction: vi.fn(),
}))

vi.mock('@/lib/storage/preferences', () => ({
  updatePreferences: vi.fn(),
  getPreferences: vi.fn().mockResolvedValue({}),
}))

import { ThemeSelector } from './ThemeSelector'
import * as profileActions from '@/lib/actions/profile'
import * as preferences from '@/lib/storage/preferences'

describe('ThemeSelector', () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = 'night'
    vi.clearAllMocks()
  })

  afterEach(() => {
    delete document.documentElement.dataset.theme
  })

  it('3개 탭(자동/낮/밤)을 렌더한다', () => {
    render(<ThemeSelector initialPreference="system" isLoggedIn={false} />)
    expect(screen.getByRole('tab', { name: '자동' })).toBeDefined()
    expect(screen.getByRole('tab', { name: '낮' })).toBeDefined()
    expect(screen.getByRole('tab', { name: '밤' })).toBeDefined()
  })

  it('initialPreference에 따라 선택 상태가 설정된다', () => {
    render(<ThemeSelector initialPreference="day" isLoggedIn={false} />)
    const dayTab = screen.getByRole('tab', { name: '낮' })
    expect(dayTab.getAttribute('aria-selected')).toBe('true')
  })

  it('보조 텍스트를 렌더한다', () => {
    render(<ThemeSelector initialPreference="system" isLoggedIn={false} />)
    expect(screen.getByText('밤에는 어둡게, 낮에는 밝게 보여요')).toBeDefined()
  })

  describe('비회원 경로', () => {
    it('탭 클릭 시 updatePreferences를 호출한다', async () => {
      vi.mocked(preferences.updatePreferences).mockResolvedValue()
      render(<ThemeSelector initialPreference="system" isLoggedIn={false} />)

      await act(async () => {
        fireEvent.click(screen.getByRole('tab', { name: '낮' }))
        await Promise.resolve()
      })

      expect(preferences.updatePreferences).toHaveBeenCalledWith({ themePreference: 'day' })
    })

    it('탭 클릭 시 document.documentElement.dataset.theme이 즉시 변경된다', async () => {
      vi.mocked(preferences.updatePreferences).mockResolvedValue()
      render(<ThemeSelector initialPreference="system" isLoggedIn={false} />)

      await act(async () => {
        fireEvent.click(screen.getByRole('tab', { name: '낮' }))
        await Promise.resolve()
      })

      expect(document.documentElement.dataset.theme).toBe('day')
    })

    it('updatePreferences 실패 시 이전 값으로 롤백한다', async () => {
      vi.mocked(preferences.updatePreferences).mockRejectedValue(new Error('저장 실패'))
      document.documentElement.dataset.theme = 'night'
      render(<ThemeSelector initialPreference="night" isLoggedIn={false} />)

      await act(async () => {
        fireEvent.click(screen.getByRole('tab', { name: '낮' }))
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(document.documentElement.dataset.theme).toBe('night')
      expect(screen.getByRole('alert')).toBeDefined()
    })

    it('서버 Action을 호출하지 않는다', async () => {
      vi.mocked(preferences.updatePreferences).mockResolvedValue()
      render(<ThemeSelector initialPreference="system" isLoggedIn={false} />)

      await act(async () => {
        fireEvent.click(screen.getByRole('tab', { name: '밤' }))
        await Promise.resolve()
      })

      expect(profileActions.updateThemePreferenceAction).not.toHaveBeenCalled()
    })
  })

  describe('회원 경로', () => {
    it('탭 클릭 시 updateThemePreferenceAction을 호출한다', async () => {
      vi.mocked(profileActions.updateThemePreferenceAction).mockResolvedValue({ ok: true, data: undefined })
      render(<ThemeSelector initialPreference="system" isLoggedIn={true} />)

      await act(async () => {
        fireEvent.click(screen.getByRole('tab', { name: '낮' }))
        await Promise.resolve()
      })

      expect(profileActions.updateThemePreferenceAction).toHaveBeenCalledWith('day')
    })

    it('action 실패 시 이전 값으로 롤백하고 토스트를 표시한다', async () => {
      vi.mocked(profileActions.updateThemePreferenceAction).mockResolvedValue({
        ok: false,
        error: { code: 'UPSTREAM_FAILED', message: '테마를 저장하지 못했어요' },
      })
      document.documentElement.dataset.theme = 'night'
      render(<ThemeSelector initialPreference="night" isLoggedIn={true} />)

      await act(async () => {
        fireEvent.click(screen.getByRole('tab', { name: '낮' }))
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(document.documentElement.dataset.theme).toBe('night')
      expect(screen.getByRole('alert')).toBeDefined()
    })

    it('preferences를 호출하지 않는다', async () => {
      vi.mocked(profileActions.updateThemePreferenceAction).mockResolvedValue({ ok: true, data: undefined })
      render(<ThemeSelector initialPreference="system" isLoggedIn={true} />)

      await act(async () => {
        fireEvent.click(screen.getByRole('tab', { name: '밤' }))
        await Promise.resolve()
      })

      expect(preferences.updatePreferences).not.toHaveBeenCalled()
    })
  })
})
