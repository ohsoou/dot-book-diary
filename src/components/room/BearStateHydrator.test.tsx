import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { BearStateProvider, useBearState, type BearStateContextValue } from './BearStateContext'
import { BearStateHydrator } from './BearStateHydrator'
import { BearStatusBar } from './BearStatusBar'

vi.mock('@/lib/storage/use-store', () => ({
  useStore: vi.fn().mockReturnValue({}),
}))

vi.mock('@/lib/last-read-store', () => ({
  getLastReadAtFromStore: vi.fn(),
}))

const guestInitial: BearStateContextValue = {
  bearAsset: undefined,
  bearLabel: null,
  lastReadAt: null,
}

function ContextReader() {
  const { bearAsset, bearLabel, lastReadAt } = useBearState()
  return (
    <div>
      <span data-testid="asset">{bearAsset ?? 'undefined'}</span>
      <span data-testid="label">{bearLabel ?? 'null'}</span>
      <span data-testid="lastReadAt">{lastReadAt ?? 'null'}</span>
    </div>
  )
}

describe('BearStateHydrator', () => {
  beforeEach(async () => {
    const { getLastReadAtFromStore } = await import('@/lib/last-read-store')
    vi.mocked(getLastReadAtFromStore).mockReset()
  })

  it('isGuest=false이면 getLastReadAtFromStore를 호출하지 않는다', async () => {
    const { getLastReadAtFromStore } = await import('@/lib/last-read-store')

    await act(async () => {
      render(
        <BearStateProvider initial={guestInitial}>
          <BearStateHydrator isGuest={false} />
        </BearStateProvider>,
      )
    })

    expect(vi.mocked(getLastReadAtFromStore)).not.toHaveBeenCalled()
  })

  it('isGuest=true이고 세션이 없으면 bearAsset=undefined, lastReadAt=null이 된다', async () => {
    const { getLastReadAtFromStore } = await import('@/lib/last-read-store')
    vi.mocked(getLastReadAtFromStore).mockResolvedValue(null)

    render(
      <BearStateProvider initial={guestInitial}>
        <BearStateHydrator isGuest={true} />
        <ContextReader />
      </BearStateProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('lastReadAt').textContent).toBe('null')
      expect(screen.getByTestId('asset').textContent).toBe('undefined')
    })
  })

  it('isGuest=true이고 세션이 7일 이상 경과하면 bearAsset=Bear_sleeping.png가 된다', async () => {
    const { getLastReadAtFromStore } = await import('@/lib/last-read-store')
    // 현재 날짜(2026-04-22) 기준 8일 전 → sleeping
    vi.mocked(getLastReadAtFromStore).mockResolvedValue('2026-04-14T12:00:00.000Z')

    render(
      <BearStateProvider initial={guestInitial}>
        <BearStateHydrator isGuest={true} />
        <ContextReader />
      </BearStateProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('asset').textContent).toBe('Bear_sleeping.png')
    })
  })

  it('Context 업데이트 후 BearStatusBar에 "곰이 자고 있어요"가 표시된다', async () => {
    const { getLastReadAtFromStore } = await import('@/lib/last-read-store')
    vi.mocked(getLastReadAtFromStore).mockResolvedValue('2026-04-14T12:00:00.000Z')

    render(
      <BearStateProvider initial={guestInitial}>
        <BearStateHydrator isGuest={true} />
        <BearStatusBar />
      </BearStateProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('곰이 자고 있어요')).toBeInTheDocument()
    })
  })
})
