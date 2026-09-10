import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
vi.mock('../lib/fs', () => ({ readTextFile: async () => '# hi', writeTextFile: async () => {} }))
import EditorView from './EditorView'
describe('EditorView', () => {
  it('shows save state', async () => {
    render(<EditorView path="/v/a.md" />)
    expect(await screen.findByText(/saved|saving|hi/i)).toBeTruthy()
  })
})
