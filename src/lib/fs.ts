import { readDir, readTextFile as r, writeTextFile as w } from '@tauri-apps/plugin-fs'
import { open } from '@tauri-apps/plugin-dialog'
export type TreeNode = { name: string; path: string; isDir: boolean; children?: TreeNode[] }
export async function readTree(root: string): Promise<TreeNode[]> {
  const entries = await readDir(root)
  const out: TreeNode[] = []
  for (const e of entries) {
    const p = `${root}/${e.name}`
    if (e.isDirectory) out.push({ name: e.name!, path: p, isDir: true, children: await readTree(p) })
    else if (e.name!.endsWith('.md')) out.push({ name: e.name!, path: p, isDir: false })
  }
  return out.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1))
}
export const readTextFile = (p: string) => r(p)
export const writeTextFile = (p: string, c: string) => w(p, c)
export async function pickVault(): Promise<string | null> {
  const sel = await open({ directory: true })
  return typeof sel === 'string' ? sel : null
}
