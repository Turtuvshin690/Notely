import { describe, it, expect, vi } from 'vitest'
vi.mock('@tauri-apps/plugin-fs', () => ({
  readDir: async () => [{ name: 'hello.md', isDirectory: false }, { isDirectory: false }],
  readTextFile: async () => '# hi',
  writeTextFile: async () => {},
  exists: async () => false,
  mkdir: async () => {},
  remove: async () => {},
  rename: async () => {},
}))
import { readTree } from './fs'
describe('readTree', () => {
  it('lists md files', async () => {
    const nodes = await readTree('/vault')
    expect(nodes.length).toBe(1)
    expect(nodes[0].name).toBe('hello.md')
  })
  it('skips entries without a name', async () => {
    const nodes = await readTree('/vault')
    expect(nodes.every((n) => Boolean(n.name))).toBe(true)
  })
})
