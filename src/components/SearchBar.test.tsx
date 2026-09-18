import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
vi.mock('../lib/fs', () => ({ readTextFile: async () => 'groceries: oat milk and honey #honey' }))
import SearchBar, { extractTags, findSnippet } from './SearchBar'
describe('SearchBar', () => {
  it('filters by name', async () => {
    render(<SearchBar tree={[{ name: 'apple.md', path: '/v/apple.md', isDir: false }]} onSelect={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'apple' } })
    await act(async () => { await new Promise((r) => setTimeout(r, 200)) })
    expect(screen.getByText('apple.md')).toBeTruthy()
  })
  it('matches file content in-memory', async () => {
    render(<SearchBar tree={[{ name: 'notes.md', path: '/v/notes.md', isDir: false }]} onSelect={() => {}} />)
    await act(async () => {})
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'oat milk' } })
    await act(async () => { await new Promise((r) => setTimeout(r, 200)) })
    expect(screen.getByText('notes.md')).toBeTruthy()
  })
  it('extracts tags and finds snippet', () => {
    expect(extractTags('a #Work and #work plus #todo-list')).toEqual(['#work', '#todo-list'])
    expect(findSnippet('line one\noat milk here\nline three', 'oat milk')).toContain('oat milk')
  })
  it('filters by #tag', async () => {
    render(<SearchBar tree={[{ name: 'n.md', path: '/v/n.md', isDir: false }]} onSelect={() => {}} />)
    await act(async () => {})
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: '#honey' } })
    await act(async () => { await new Promise((r) => setTimeout(r, 200)) })
    expect(screen.getByText('n.md')).toBeTruthy()
  })
  it('shows tag pills for bare #', async () => {
    render(<SearchBar tree={[{ name: 'n.md', path: '/v/n.md', isDir: false }]} onSelect={() => {}} />)
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: '#' } })
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    expect(screen.getByText('#honey')).toBeTruthy()
  })
})
