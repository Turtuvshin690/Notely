import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SearchBar from './SearchBar'
describe('SearchBar', () => {
  it('filters by name', () => {
    render(<SearchBar tree={[{ name: 'apple.md', path: '/v/apple.md', isDir: false }]} onSelect={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'apple' } })
    expect(screen.getByText('apple.md')).toBeTruthy()
  })
})
