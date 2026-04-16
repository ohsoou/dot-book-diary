import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/lib/storage/preferences', () => ({
  getPreferences: vi.fn().mockResolvedValue({ guestBannerDismissed: false }),
  updatePreferences: vi.fn(),
}))

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

async function renderPage() {
  const { default: HomePage } = await import('./page')
  const jsx = await HomePage()
  return render(jsx as React.ReactElement)
}

describe('HomePage', () => {
  it('renders RoomScene container', async () => {
    await renderPage()
    expect(screen.getByRole('img', { name: '곰이 책을 읽는 따뜻한 방' })).toBeInTheDocument()
  })

  it('renders hitbox buttons', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: '다이어리' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '책장' })).toBeInTheDocument()
  })
})