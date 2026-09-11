import { readDir, readTextFile as r, writeTextFile as w, mkdir, remove as rm, rename as rn, exists } from '@tauri-apps/plugin-fs'
import { open } from '@tauri-apps/plugin-dialog'
export type TreeNode = { name: string; path: string; isDir: boolean; children?: TreeNode[] }
export async function readTree(root: string): Promise<TreeNode[]> {
  const entries = await readDir(root)
  const out: TreeNode[] = []
  for (const e of entries) {
    if (!e.name) continue
    const p = `${root}/${e.name}`
    if (e.isDirectory) out.push({ name: e.name, path: p, isDir: true, children: await readTree(p) })
    else if (e.name.endsWith('.md')) out.push({ name: e.name, path: p, isDir: false })
  }
  return out.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1))
}
export const readTextFile = (p: string) => r(p)
export const writeTextFile = (p: string, c: string) => w(p, c)
export function parentDir(p: string): string {
  const n = p.replace(/\\/g, '/')
  const i = n.lastIndexOf('/')
  return i <= 0 ? '' : p.slice(0, i)
}
export function ensureMd(name: string): string {
  const t = name.trim()
  return t.toLowerCase().endsWith('.md') ? t : `${t}.md`
}
export async function noteExists(p: string): Promise<boolean> {
  try { return await exists(p) } catch { return false }
}
export const createNote = (p: string, c: string) => w(p, c)
export const renameNote = (from: string, to: string) => rn(from, to)
export const removeNote = (p: string) => rm(p)
export const mkdirDir = (p: string) => mkdir(p, { recursive: true })
export async function pickVault(): Promise<string | null> {
  const sel = await open({ directory: true })
  return typeof sel === 'string' ? sel : Array.isArray(sel) ? sel[0] ?? null : null
}
