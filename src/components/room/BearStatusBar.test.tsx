import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BearStatusBar } from './BearStatusBar'

describe('BearStatusBar', () => {
  it('renders provided label text', () => {
    render(<BearStatusBar label="곰이 자고 있어요" />)
    expect(screen.getByText('곰이 자고 있어요')).toBeInTheDocument()
  })

  it('renders aria-live container when label is null', () => {
    render(<BearStatusBar label={null} />)
    const el = screen.getByRole('status')
    expect(el).toBeInTheDocument()
  })

  it('has aria-live="polite" and aria-atomic="true"', () => {
    render(<BearStatusBar label="곰이 놀고 있어요" />)
    const el = screen.getByRole('status')
    expect(el).toHaveAttribute('aria-live', 'polite')
    expect(el).toHaveAttribute('aria-atomic', 'true')
  })
})
