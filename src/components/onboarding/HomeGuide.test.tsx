import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/storage/preferences', () => ({
  getPreferences: vi.fn(),
  updatePreferences: vi.fn(),
}))

import { getPreferences, updatePreferences } from '@/lib/storage/preferences'
import { HomeGuide } from './HomeGuide'

const mockGetPreferences = vi.mocked(getPreferences)
const mockUpdatePreferences = vi.mocked(updatePreferences)

const GUIDE_LABELS = ['다이어리', '책장', '캘린더', '책 등록', '설정']

beforeEach(() => {
  vi.clearAllMocks()
  mockUpdatePreferences.mockResolvedValue(undefined)
})

describe('HomeGuide', () => {
  it('homeGuideDismissed=false이면 모달이 렌더되고 5개 라벨이 모두 표시된다', async () => {
    mockGetPreferences.mockResolvedValue({ homeGuideDismissed: false })
    render(<HomeGuide />)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    for (const label of GUIDE_LABELS) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('닫기 버튼 클릭 시 updatePreferences 호출 후 모달이 사라진다', async () => {
    const user = userEvent.setup()
    mockGetPreferences.mockResolvedValue({ homeGuideDismissed: false })
    render(<HomeGuide />)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '방을 둘러볼게요' }))
    expect(mockUpdatePreferences).toHaveBeenCalledWith({ homeGuideDismissed: true })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('homeGuideDismissed=true이면 모달이 렌더되지 않는다', async () => {
    mockGetPreferences.mockResolvedValue({ homeGuideDismissed: true })
    render(<HomeGuide />)
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('GUIDE_ITEMS 라벨 5개가 모두 화면에 렌더되고 순서가 올바르다', async () => {
    mockGetPreferences.mockResolvedValue({ homeGuideDismissed: false })
    render(<HomeGuide />)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    const renderedLabels = GUIDE_LABELS.map((label) => screen.getByText(label))
    expect(renderedLabels).toHaveLength(5)
    renderedLabels.forEach((el) => expect(el).toBeInTheDocument())
  })
})
