import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// preferences 모듈을 mock
vi.mock('@/lib/storage/preferences', () => ({
  getPreferences: vi.fn(),
  updatePreferences: vi.fn(),
}))

import { getPreferences, updatePreferences } from '@/lib/storage/preferences'
import { GuestBanner } from './GuestBanner'

const mockGetPreferences = vi.mocked(getPreferences)
const mockUpdatePreferences = vi.mocked(updatePreferences)

beforeEach(() => {
  vi.clearAllMocks()
  mockUpdatePreferences.mockResolvedValue(undefined)
})

describe('GuestBanner', () => {
  it('guestBannerDismissed=false이면 배너를 표시한다', async () => {
    mockGetPreferences.mockResolvedValue({ guestBannerDismissed: false })
    render(<GuestBanner />)
    await waitFor(() => {
      expect(screen.getByText(/이 방은 당신의 거예요/)).toBeDefined()
    })
  })

  it('guestBannerDismissed=true이면 배너를 표시하지 않는다', async () => {
    mockGetPreferences.mockResolvedValue({ guestBannerDismissed: true })
    render(<GuestBanner />)
    await waitFor(() => {
      expect(screen.queryByText(/이 방은 당신의 거예요/)).toBeNull()
    })
  })

  it('닫기 버튼 클릭 시 배너가 사라지고 updatePreferences를 호출한다', async () => {
    const user = userEvent.setup()
    mockGetPreferences.mockResolvedValue({ guestBannerDismissed: false })
    render(<GuestBanner />)
    await waitFor(() => {
      expect(screen.getByLabelText('배너 닫기')).toBeDefined()
    })
    await user.click(screen.getByLabelText('배너 닫기'))
    expect(screen.queryByText(/이 방은 당신의 거예요/)).toBeNull()
    expect(mockUpdatePreferences).toHaveBeenCalledWith({ guestBannerDismissed: true })
  })
})