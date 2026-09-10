import { useState } from 'react'
import type { ReactNode } from 'react'
import type { TreeNode } from '../lib/fs'
import { createNote, renameNote, removeNote, mkdirDir, parentDir, ensureMd, noteExists } from '../lib/fs'
type Props = { vault: string; tree: TreeNode[]; onSelect: (p: string) => void; onChanged: () => void }
export default function Sidebar({ vault, tree, onSelect, onChanged }: Props) {
  const [err, setErr] = useState<string | null>(null)
  const fail = (e: unknown, what: string) => setErr(`${what}: ${e instanceof Error ? e.message : 'failed'}`)
  const createIn = async (dir: string) => {
    const name = prompt('Note name (without .md)?')
    if (!name) return
    const full = `${dir}/${ensureMd(name)}`
    try {
      if (await noteExists(full) && !confirm('Overwrite existing note?')) return
      await createNote(full, `# ${name}\n`)
      setErr(null); onChanged()
    } catch (e) { fail(e, 'Create failed') }
  }
  const renameNode = async (n: TreeNode) => {
    const nn = prompt(n.isDir ? 'Rename folder?' : 'Rename?', n.name)
    if (!nn || nn === n.name) return
    const base = parentDir(n.path)
    const dest = n.isDir ? `${base}/${nn}` : `${base}/${ensureMd(nn)}`
    try {
      if (!n.isDir && (await noteExists(dest)) && !confirm('Overwrite existing note?')) return
      await renameNote(n.path, dest)
      setErr(null); onChanged()
    } catch (e) { fail(e, 'Rename failed') }
  }
  const del = async (n: TreeNode) => {
    if (!confirm(`Delete ${n.name}?`)) return
    try { await removeNote(n.path); setErr(null); onChanged() }
    catch (e) { fail(e, 'Delete failed') }
  }
  const mkDir = async (dir: string) => {
    const name = prompt('Folder name?')
    if (!name) return
    try { await mkdirDir(`${dir}/${name}`); setErr(null); onChanged() }
    catch (e) { fail(e, 'Create folder failed') }
  }
  const renderNodes = (nodes: TreeNode[], depth: number): ReactNode =>
    nodes.map((n) => (
      <div key={n.path} onClick={() => !n.isDir && onSelect(n.path)} style={{ cursor: n.isDir ? 'default' : 'pointer', paddingLeft: depth * 12 }}>
        <span>{n.isDir ? '📁 ' : ''}{n.name}</span>
        <button onClick={(e) => { e.stopPropagation(); void renameNode(n) }}>✏️</button>
        <button onClick={(e) => { e.stopPropagation(); void del(n) }}>🗑️</button>
        {n.isDir && <>
          <button title="New note here" onClick={(e) => { e.stopPropagation(); void createIn(n.path) }}>+📝</button>
          <button title="New folder here" onClick={(e) => { e.stopPropagation(); void mkDir(n.path) }}>+📁</button>
        </>}
        {n.isDir && n.children && renderNodes(n.children, depth + 1)}
      </div>
    ))
  return (
    <div style={{ width: 240, borderRight: '1px solid #ddd', padding: 8 }}>
      <button onClick={() => void createIn(vault)}>+ New</button>
      <button onClick={() => void mkDir(vault)}>+ Folder</button>
      {err && <div role="alert">{err}</div>}
      {renderNodes(tree, 0)}
    </div>
  )
}
