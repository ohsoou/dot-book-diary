import { render, screen } from '@testing-library/react'
import HomePage from './page'

describe('HomePage', () => {
  it('renders placeholder text', () => {
    render(<HomePage />)
    expect(screen.getByText('도트 북 다이어리')).toBeInTheDocument()
  })
})