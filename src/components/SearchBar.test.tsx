import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
vi.mock('../lib/fs', () => ({ readTextFile: async () => 'groceries: oat milk and honey' }))
import SearchBar from './SearchBar'
describe('SearchBar', () => {
  it('filters by name', () => {
    render(<SearchBar tree={[{ name: 'apple.md', path: '/v/apple.md', isDir: false }]} onSelect={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'apple' } })
    expect(screen.getByText('apple.md')).toBeTruthy()
  })
  it('matches file content in-memory', async () => {
    render(<SearchBar tree={[{ name: 'notes.md', path: '/v/notes.md', isDir: false }]} onSelect={() => {}} />)
    await act(async () => {})
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'oat milk' } })
    expect(screen.getByText('notes.md')).toBeTruthy()
  })
})
