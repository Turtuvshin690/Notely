// src/lib/meta.test.ts
import { describe, it, expect, vi } from 'vitest'
vi.mock('@tauri-apps/plugin-store', () => ({
  load: async () => ({ get: async () => null, set: async () => {}, save: async () => {} }),
}))
import { pushRecent, togglePin, pruneMeta, metaKey, type VaultMeta } from './meta'

describe('meta', () => {
  it('metaKey namespaces by vault', () => {
    expect(metaKey('/v')).toBe('meta:/v')
  })
  it('pushRecent dedups LRU capped at 10', () => {
    let m: VaultMeta = { pinned: [], recent: [], collapsed: [] as string[] }
    for (let i = 0; i < 12; i++) m = pushRecent(m, `/v/${i}.md`)
    expect(m.recent.length).toBe(10)
    expect(m.recent[0]).toBe('/v/11.md')
    m = pushRecent(m, '/v/11.md')
    expect(m.recent[0]).toBe('/v/11.md')
    expect(m.recent.length).toBe(10)
  })
  it('togglePin adds/removes, prune drops missing', () => {
    let m: VaultMeta = { pinned: ['/v/a.md'], recent: ['/v/gone.md'], collapsed: [] as string[] }
    m = togglePin(m, '/v/a.md')
    expect(m.pinned).toEqual([])
    m = { ...m, recent: ['/v/gone.md'] }
    m = pruneMeta(m, new Set(['/v/keep.md']))
    expect(m.recent).toEqual([])
  })
})
