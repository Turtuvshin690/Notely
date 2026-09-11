import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
vi.mock('@tauri-apps/plugin-fs', () => ({
  readDir: async () => [],
  readTextFile: async () => '',
  writeTextFile: async () => {},
  exists: async () => false,
  mkdir: async () => {},
  remove: async () => {},
  rename: async () => {},
}))
vi.mock('@tauri-apps/plugin-store', () => ({
  load: async () => ({ get: async () => null, set: async () => {}, save: async () => {} }),
}))
const { openMock } = vi.hoisted(() => ({ openMock: vi.fn() }))
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: openMock }))
import App from './App'

describe('App vault', () => {
  beforeEach(() => { cleanup(); openMock.mockReset(); openMock.mockResolvedValue(null) })
  it('shows Open folder when no vault saved', async () => {
    render(<App />)
    expect(await screen.findByRole('button', { name: /open folder/i })).toBeTruthy()
  })
  it('surfaces the underlying pick failure instead of a bare message', async () => {
    // Tauri rejects with a plain string, not an Error — the UI must show it.
    openMock.mockRejectedValue('dialog blocked in test')
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /open folder/i }))
    expect(await screen.findByText(/dialog blocked in test/)).toBeTruthy()
  })
  it('opens the vault shell after a successful pick', async () => {
    openMock.mockResolvedValue('/vault')
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /open folder/i }))
    expect(await screen.findByText('Select a note')).toBeTruthy()
  })
})
