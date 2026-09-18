// src/lib/meta.ts
import { load } from '@tauri-apps/plugin-store'
export type VaultMeta = { pinned: string[]; recent: string[]; collapsed: string[] }
export const metaKey = (vault: string) => `meta:${vault}`
const empty: VaultMeta = { pinned: [], recent: [], collapsed: [] }
export async function loadMeta(vault: string): Promise<VaultMeta> {
  try {
    const s = await load('notely.dat')
    const m = await s?.get<VaultMeta>(metaKey(vault))
    if (!m) return { ...empty }
    return { pinned: m.pinned ?? [], recent: (m.recent ?? []).slice(0, 10), collapsed: m.collapsed ?? [] }
  } catch { return { ...empty } }
}
export async function saveMeta(vault: string, m: VaultMeta): Promise<void> {
  const s = await load('notely.dat')
  await s.set(metaKey(vault), m)
  await s.save()
}
export function pushRecent(m: VaultMeta, path: string, cap = 10): VaultMeta {
  return { ...m, recent: [path, ...m.recent.filter((p) => p !== path)].slice(0, cap) }
}
export function togglePin(m: VaultMeta, path: string): VaultMeta {
  return m.pinned.includes(path)
    ? { ...m, pinned: m.pinned.filter((p) => p !== path) }
    : { ...m, pinned: [...m.pinned, path] }
}
export function toggleCollapse(m: VaultMeta, dir: string): VaultMeta {
  return m.collapsed.includes(dir)
    ? { ...m, collapsed: m.collapsed.filter((d) => d !== dir) }
    : { ...m, collapsed: [...m.collapsed, dir] }
}
export function pruneMeta(m: VaultMeta, existing: Set<string>): VaultMeta {
  return { ...m, pinned: m.pinned.filter((p) => existing.has(p)), recent: m.recent.filter((p) => existing.has(p)) }
}
