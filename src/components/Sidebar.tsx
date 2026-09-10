import { mkdir, writeTextFile, remove, rename } from '@tauri-apps/plugin-fs'
import type { TreeNode } from '../lib/fs'
export default function Sidebar({ vault, tree, onSelect, onChanged }: { vault: string; tree: TreeNode[]; onSelect: (p: string) => void; onChanged: () => void }) {
  const create = async () => {
    const name = prompt('Note name (without .md)?')
    if (!name) return
    await writeTextFile(`${vault}/${name}.md`, `# ${name}\n`)
    onChanged()
  }
  return (
    <div style={{ width: 240, borderRight: '1px solid #ddd', padding: 8 }}>
      <button onClick={create}>+ New</button>
      {tree.map(n => (
        <div key={n.path} onClick={() => !n.isDir && onSelect(n.path)} style={{ cursor: 'pointer', paddingLeft: n.isDir ? 0 : 12 }}>
          {n.name}
          {!n.isDir && <>
            <button onClick={async (e) => { e.stopPropagation(); const nn = prompt('Rename?', n.name); if (nn) { await rename(n.path, `${vault}/${nn}`); onChanged() } }}>✏️</button>
            <button onClick={async (e) => { e.stopPropagation(); if (confirm('Delete?')) { await remove(n.path); onChanged() } }}>🗑️</button>
          </>}
          {n.children?.map(c => <div key={c.path} onClick={(e) => { e.stopPropagation(); onSelect(c.path) }}>{c.name}</div>)}
        </div>
      ))}
      <button onClick={async () => { await mkdir(`${vault}/sub`, { recursive: true }); onChanged() }}>+ Folder</button>
    </div>
  )
}
