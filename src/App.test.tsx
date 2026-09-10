import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import App from './App'

describe('App scaffold', () => {
  it('renders and counts clicks', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /get started/i })).toBeTruthy()
    const btn = screen.getByRole('button', { name: /count is 0/i })
    fireEvent.click(btn)
    expect(screen.getByRole('button', { name: /count is 1/i })).toBeTruthy()
  })
})
