import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
import App from './App'

describe('App vault', () => {
  it('shows Open folder when no vault saved', async () => {
    render(<App />)
    expect(await screen.findByRole('button', { name: /open folder/i })).toBeTruthy()
  })
})
