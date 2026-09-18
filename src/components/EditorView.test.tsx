import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'

const writes: Array<[string, string]> = []
vi.mock('../lib/fs', () => ({
  readTextFile: async (p: string) => `content of ${p}`,
  writeTextFile: async (p: string, c: string) => { writes.push([p, c]) },
}))
vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea aria-label="editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}))

import EditorView from './EditorView'

const flush = () => act(async () => {})

describe('EditorView', () => {
  beforeEach(() => { vi.useFakeTimers(); writes.length = 0 })
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks() })

  it('switch-within-500ms writes correct file, no post-unmount setState', async () => {
    const { rerender, unmount } = render(<EditorView path="/v/a.md" />)
    await flush()
    fireEvent.change(screen.getByLabelText('editor'), { target: { value: 'draft A' } })
    expect(screen.getByText('saving')).toBeTruthy()
    // switch file before debounce fires: stale timer must not write B
    rerender(<EditorView path="/v/b.md" />)
    await flush()
    await act(async () => { vi.advanceTimersByTime(600) })
    // flushed draft went to A (its own file), never to B
    expect(writes).toContainEqual(['/v/a.md', 'draft A'])
    expect(writes.some(([p]) => p === '/v/b.md')).toBe(false)
    // unmount with pending draft flushes without throwing / setState after unmount
    fireEvent.change(screen.getByLabelText('editor'), { target: { value: 'draft B' } })
    expect(() => unmount()).not.toThrow()
    await act(async () => { vi.advanceTimersByTime(600) })
    expect(writes).toContainEqual(['/v/b.md', 'draft B'])
  })
  it('split renders editor and preview, toolbar bolds', async () => {
    const { container } = render(<EditorView path="/v/a.md" />)
    await flush()
    fireEvent.click(screen.getByRole('tab', { name: /split/i }))
    expect(container.querySelector('.pane.split-edit')).toBeTruthy()
    expect(container.querySelector('.pane.split-preview')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /bold/i }))
    expect((screen.getByLabelText('editor') as HTMLTextAreaElement).value).toContain('**')
  })
  it('shows word count', async () => {
    render(<EditorView path="/v/a.md" />)
    await flush()
    fireEvent.change(screen.getByLabelText('editor'), { target: { value: 'hello world' } })
    expect(screen.getByText(/2 words/i)).toBeTruthy()
  })
})
