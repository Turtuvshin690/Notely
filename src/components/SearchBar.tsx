import { useState } from 'react'
import type { TreeNode } from '../lib/fs'
const flat = (t: TreeNode[]): TreeNode[] => t.flatMap(n => n.isDir ? flat(n.children ?? []) : [n])
export default function SearchBar({ tree, onSelect }: { tree: TreeNode[]; onSelect: (p: string) => void }) {
  const [q, setQ] = useState('')
  const all = flat(tree)
  const res = q ? all.filter(n => n.name.toLowerCase().includes(q.toLowerCase())).slice(0, 20) : []
  return (
    <div>
      <input placeholder="Search" value={q} onChange={e => setQ(e.target.value)} style={{ width: '100%' }} />
      {res.map(r => <div key={r.path} onClick={() => onSelect(r.path)}>{r.name}</div>)}
    </div>
  )
}
