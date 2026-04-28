import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { BearStateProvider, useBearState, type BearStateContextValue } from './BearStateContext'
import { BearStateHydrator } from './BearStateHydrator'

vi.mock('@/lib/storage/use-store', () => ({
  useStore: vi.fn().mockReturnValue({}),
}))

vi.mock('@/lib/last-read-store', () => ({
  getLastReadAtFromStore: vi.fn(),
}))

vi.mock('@/lib/storage/preferences', () => ({
  getPreferences: vi.fn().mockResolvedValue({}),
}))

const guestInitial: BearStateContextValue = {
  bearAsset: undefined,
  bearLabel: null,
  lastReadAt: null,
  nickname: '책곰이',
}

function ContextReader() {
  const { bearAsset, bearLabel, lastReadAt, nickname } = useBearState()
  return (
    <div>
      <span data-testid="asset">{bearAsset ?? 'undefined'}</span>
      <span data-testid="label">{bearLabel ?? 'null'}</span>
      <span data-testid="lastReadAt">{lastReadAt ?? 'null'}</span>
      <span data-testid="nickname">{nickname}</span>
    </div>
  )
}

describe('BearStateHydrator', () => {
  beforeEach(async () => {
    const { getLastReadAtFromStore } = await import('@/lib/last-read-store')
    const { getPreferences } = await import('@/lib/storage/preferences')
    vi.mocked(getLastReadAtFromStore).mockReset()
    vi.mocked(getPreferences).mockReset()
    vi.mocked(getPreferences).mockResolvedValue({})
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

  it('Context 업데이트 후 label이 렌더된다', async () => {
    const { getLastReadAtFromStore } = await import('@/lib/last-read-store')
    vi.mocked(getLastReadAtFromStore).mockResolvedValue('2026-04-14T12:00:00.000Z')

    render(
      <BearStateProvider initial={guestInitial}>
        <BearStateHydrator isGuest={true} />
        <ContextReader />
      </BearStateProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('label').textContent).toBe('곰이 자고 있어요')
    })
  })

  it('preferences에 nickname이 설정된 경우 context.nickname에 해당 값이 들어간다', async () => {
    const { getLastReadAtFromStore } = await import('@/lib/last-read-store')
    const { getPreferences } = await import('@/lib/storage/preferences')
    vi.mocked(getLastReadAtFromStore).mockResolvedValue(null)
    vi.mocked(getPreferences).mockResolvedValue({ nickname: '독서왕' })

    render(
      <BearStateProvider initial={guestInitial}>
        <BearStateHydrator isGuest={true} />
        <ContextReader />
      </BearStateProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('nickname').textContent).toBe('독서왕')
    })
  })

  it('preferences에 nickname이 없으면 context.nickname이 책곰이가 된다', async () => {
    const { getLastReadAtFromStore } = await import('@/lib/last-read-store')
    vi.mocked(getLastReadAtFromStore).mockResolvedValue(null)

    render(
      <BearStateProvider initial={guestInitial}>
        <BearStateHydrator isGuest={true} />
        <ContextReader />
      </BearStateProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('nickname').textContent).toBe('책곰이')
    })
  })

  it('preferences에 nickname이 빈 문자열이면 context.nickname이 책곰이가 된다', async () => {
    const { getLastReadAtFromStore } = await import('@/lib/last-read-store')
    const { getPreferences } = await import('@/lib/storage/preferences')
    vi.mocked(getLastReadAtFromStore).mockResolvedValue(null)
    vi.mocked(getPreferences).mockResolvedValue({ nickname: '' })

    render(
      <BearStateProvider initial={guestInitial}>
        <BearStateHydrator isGuest={true} />
        <ContextReader />
      </BearStateProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('nickname').textContent).toBe('책곰이')
    })
  })
})
