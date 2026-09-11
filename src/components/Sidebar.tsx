import { useState } from 'react'
import type { ReactNode } from 'react'
import type { TreeNode } from '../lib/fs'
import { createNote, renameNote, removeNote, mkdirDir, parentDir, ensureMd, noteExists } from '../lib/fs'
type Props = { vault: string; tree: TreeNode[]; selected?: string | null; onSelect: (p: string) => void; onChanged: () => void }
export default function Sidebar({ vault, tree, selected, onSelect, onChanged }: Props) {
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
      <div key={n.path}>
        <div
          className={n.isDir ? 'node node-dir' : `node${selected === n.path ? ' selected' : ''}`}
          onClick={() => !n.isDir && onSelect(n.path)}
          style={{ paddingLeft: 8 + depth * 14 }}
        >
          {!n.isDir && <span className="twisty">⋯</span>}
          <span className="label">{n.name}</span>
          <span className="acts">
            <button className="icon-btn" title="Rename" onClick={(e) => { e.stopPropagation(); void renameNode(n) }}>✎</button>
            <button className="icon-btn danger" title="Delete" onClick={(e) => { e.stopPropagation(); void del(n) }}>×</button>
            {n.isDir && <>
              <button className="icon-btn" title="New note here" onClick={(e) => { e.stopPropagation(); void createIn(n.path) }}>+</button>
              <button className="icon-btn" title="New folder here" onClick={(e) => { e.stopPropagation(); void mkDir(n.path) }}>⊞</button>
            </>}
          </span>
        </div>
        {n.isDir && n.children && renderNodes(n.children, depth + 1)}
      </div>
    ))
  return (
    <>
      <div className="actions-row">
        <button className="btn" onClick={() => void createIn(vault)}>+ New</button>
        <button className="btn" onClick={() => void mkDir(vault)}>+ Folder</button>
      </div>
      {err && <div className="alert" role="alert">{err}</div>}
      <div className="tree">
        {tree.length === 0 && !err && <div className="tree-empty">No notes yet — create one to begin.</div>}
        {renderNodes(tree, 0)}
      </div>
    </>
  )
}
