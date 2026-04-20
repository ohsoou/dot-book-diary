import { render, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ThemeHydrator } from './ThemeHydrator'

vi.mock('@/lib/storage/preferences', () => ({
  getPreferences: vi.fn(),
}))

import { getPreferences } from '@/lib/storage/preferences'
const mockGetPreferences = vi.mocked(getPreferences)

describe('ThemeHydrator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.documentElement.dataset.theme = 'night'
  })

  afterEach(() => {
    vi.useRealTimers()
    delete document.documentElement.dataset.theme
    vi.restoreAllMocks()
  })

  async function renderAndFlush() {
    await act(async () => {
      render(<ThemeHydrator />)
      // flush initial Promise microtasks (getPreferences is async)
      await Promise.resolve()
      await Promise.resolve()
    })
  }

  it('reads preferences and updates data-theme on mount', async () => {
    mockGetPreferences.mockResolvedValue({ themePreference: 'day' })
    await renderAndFlush()
    expect(document.documentElement.dataset.theme).toBe('day')
  })

  it('uses resolveTheme for system preference (daytime)', async () => {
    const now = new Date()
    now.setHours(10, 0, 0, 0)
    vi.setSystemTime(now)

    mockGetPreferences.mockResolvedValue({ themePreference: 'system' })
    await renderAndFlush()

    expect(document.documentElement.dataset.theme).toBe('day')
  })

  it('uses resolveTheme for system preference (nighttime)', async () => {
    const now = new Date()
    now.setHours(20, 0, 0, 0)
    vi.setSystemTime(now)

    mockGetPreferences.mockResolvedValue({ themePreference: 'system' })
    await renderAndFlush()

    expect(document.documentElement.dataset.theme).toBe('night')
  })

  it('defaults to system when themePreference is not set', async () => {
    const now = new Date()
    now.setHours(10, 0, 0, 0)
    vi.setSystemTime(now)

    mockGetPreferences.mockResolvedValue({})
    await renderAndFlush()

    expect(document.documentElement.dataset.theme).toBe('day')
  })

  it('renders null (no DOM element)', async () => {
    mockGetPreferences.mockResolvedValue({ themePreference: 'night' })
    let container!: HTMLElement
    await act(async () => {
      const result = render(<ThemeHydrator />)
      container = result.container
    })
    expect(container.firstChild).toBeNull()
  })
})
