import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RoomScene } from './RoomScene'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

function mockMatchMedia({ reducedMotion = false } = {}) {
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
  mockMatchMedia()
})

describe('RoomScene', () => {
  it('renders 5 hitbox buttons with correct aria-labels', () => {
    render(<RoomScene theme="day" />)
    expect(screen.getByRole('button', { name: '다이어리' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '책장' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '캘린더' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '책 등록' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '설정' })).toBeInTheDocument()
  })

  it('navigates to correct href on each hitbox click', () => {
    render(<RoomScene theme="day" />)

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
        theme="day"
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
    mockMatchMedia({ reducedMotion: true })
    const { container } = render(<RoomScene theme="day" />)

    const bearImg = container.querySelector('img[src="/sprites/day/Bear.png"]')
    const lampImg = container.querySelector('img[src="/sprites/day/Table_Lamp.png"]')

    expect(bearImg?.className).not.toContain('bear-idle')
    expect(lampImg?.className).not.toContain('lamp-flicker')
  })

  it('applies bear-idle and lamp-flicker classes when motion is allowed', () => {
    mockMatchMedia({ reducedMotion: false })
    const { container } = render(<RoomScene theme="day" />)

    const bearImg = container.querySelector('img[src="/sprites/day/Bear.png"]')
    const lampImg = container.querySelector('img[src="/sprites/day/Table_Lamp.png"]')

    expect(bearImg?.className).toContain('bear-idle')
    expect(lampImg?.className).toContain('lamp-flicker')
  })

  it('has role=img with aria-label on the scene container', () => {
    render(<RoomScene theme="day" />)
    expect(screen.getByRole('img', { name: '곰이 책을 읽는 따뜻한 방' })).toBeInTheDocument()
  })

  it('applies correct coordinates to bear sprite', () => {
    const { container } = render(<RoomScene theme="day" />)

    const bearImg = container.querySelector('img[src="/sprites/day/Bear.png"]') as HTMLElement | null
    expect(bearImg).not.toBeNull()
    expect(bearImg?.style.bottom).toBe('1.25%')
    expect(bearImg?.style.left).toBe('42.0313%')
  })

  it('renders sprites from /sprites/day/ when theme="day"', () => {
    const { container } = render(<RoomScene theme="day" />)
    const imgs = container.querySelectorAll('img')
    expect(imgs.length).toBeGreaterThan(0)
    imgs.forEach((img) => {
      expect(img.getAttribute('src')).toMatch(/^\/sprites\/day\//)
    })
  })

  it('renders sprites from /sprites/night/ when theme="night"', () => {
    const { container } = render(<RoomScene theme="night" />)
    const imgs = container.querySelectorAll('img')
    expect(imgs.length).toBeGreaterThan(0)
    imgs.forEach((img) => {
      expect(img.getAttribute('src')).toMatch(/^\/sprites\/night\//)
    })
  })

  it('updates sprite src when theme prop changes from day to night', () => {
    const { container, rerender } = render(<RoomScene theme="day" />)

    expect(container.querySelector('img[src="/sprites/day/Bear.png"]')).not.toBeNull()
    expect(container.querySelector('img[src="/sprites/night/Bear.png"]')).toBeNull()

    rerender(<RoomScene theme="night" />)

    expect(container.querySelector('img[src="/sprites/night/Bear.png"]')).not.toBeNull()
    expect(container.querySelector('img[src="/sprites/day/Bear.png"]')).toBeNull()
  })

  it('uses correct per-theme filename for bookstack sprite (case mismatch)', () => {
    const { container: dayContainer } = render(<RoomScene theme="day" />)
    expect(dayContainer.querySelector('img[src="/sprites/day/Bookstack.png"]')).not.toBeNull()

    const { container: nightContainer } = render(<RoomScene theme="night" />)
    expect(nightContainer.querySelector('img[src="/sprites/night/BookStack.png"]')).not.toBeNull()
  })

  it('renders rug sprite with correct properties and z-index below bear', () => {
    const { container } = render(<RoomScene theme="day" />)

    const rugImg = container.querySelector('img[src="/sprites/day/Rug.png"]') as HTMLElement | null
    const bearImg = container.querySelector('img[src="/sprites/day/Bear.png"]') as HTMLElement | null

    expect(rugImg).not.toBeNull()
    expect(rugImg?.style.bottom).toBe('0.5%')
    expect(rugImg?.style.left).toBe('35.9375%')
    expect(rugImg?.style.zIndex).toBe('15')

    const rugZ = parseInt(rugImg?.style.zIndex || '0')
    const bearZ = parseInt(bearImg?.style.zIndex || '0')
    expect(rugZ).toBeLessThan(bearZ)
  })
})
