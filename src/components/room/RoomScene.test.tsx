import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RoomScene } from './RoomScene'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

function mockMatchMedia(reducedMotion: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? reducedMotion : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

beforeEach(() => {
  mockPush.mockReset()
  mockMatchMedia(false)
})

describe('RoomScene', () => {
  it('renders 5 hitbox buttons with correct aria-labels', () => {
    render(<RoomScene />)
    expect(screen.getByRole('button', { name: '다이어리' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '책장' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '캘린더' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '책 등록' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '설정' })).toBeInTheDocument()
  })

  it('navigates to correct href on each hitbox click', () => {
    render(<RoomScene />)

    fireEvent.click(screen.getByRole('button', { name: '다이어리' }))
    expect(mockPush).toHaveBeenCalledWith('/diary')

    fireEvent.click(screen.getByRole('button', { name: '책장' }))
    expect(mockPush).toHaveBeenCalledWith('/bookshelf')

    fireEvent.click(screen.getByRole('button', { name: '캘린더' }))
    expect(mockPush).toHaveBeenCalledWith('/book-calendar')

    fireEvent.click(screen.getByRole('button', { name: '책 등록' }))
    expect(mockPush).toHaveBeenCalledWith('/add-book')

    fireEvent.click(screen.getByRole('button', { name: '설정' }))
    expect(mockPush).toHaveBeenCalledWith('/settings')
  })

  it('accepts custom href props', () => {
    render(
      <RoomScene
        diaryHref="/custom-diary"
        bookshelfHref="/custom-bookshelf"
        calendarHref="/custom-calendar"
        addBookHref="/custom-add-book"
        settingsHref="/custom-settings"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '다이어리' }))
    expect(mockPush).toHaveBeenCalledWith('/custom-diary')

    fireEvent.click(screen.getByRole('button', { name: '책장' }))
    expect(mockPush).toHaveBeenCalledWith('/custom-bookshelf')
  })

  it('removes bear-idle and lamp-flicker classes when prefers-reduced-motion is set', () => {
    mockMatchMedia(true)
    const { container } = render(<RoomScene />)

    const bearImg = container.querySelector('img[src="/sprites/day/Bear.png"]')
    const lampImg = container.querySelector('img[src="/sprites/day/Table_Lamp.png"]')

    expect(bearImg?.className).not.toContain('bear-idle')
    expect(lampImg?.className).not.toContain('lamp-flicker')
  })

  it('applies bear-idle and lamp-flicker classes when motion is allowed', () => {
    mockMatchMedia(false)
    const { container } = render(<RoomScene />)

    const bearImg = container.querySelector('img[src="/sprites/day/Bear.png"]')
    const lampImg = container.querySelector('img[src="/sprites/day/Table_Lamp.png"]')

    expect(bearImg?.className).toContain('bear-idle')
    expect(lampImg?.className).toContain('lamp-flicker')
  })

  it('has role=img with aria-label on the scene container', () => {
    render(<RoomScene />)
    expect(screen.getByRole('img', { name: '곰이 책을 읽는 따뜻한 방' })).toBeInTheDocument()
  })
})
