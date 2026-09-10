import { useEffect, useState } from 'react'
import type { TreeNode } from '../lib/fs'
import { readTextFile } from '../lib/fs'
const flat = (t: TreeNode[]): TreeNode[] => t.flatMap(n => n.isDir ? flat(n.children ?? []) : [n])
// ponytail: in-memory grep over cached contents, capped for small vaults; add indexed search when vaults grow.
export default function SearchBar({ tree, onSelect }: { tree: TreeNode[]; onSelect: (p: string) => void }) {
  const [q, setQ] = useState('')
  const [contents, setContents] = useState<Record<string, string>>({})
  useEffect(() => {
    let live = true
    ;(async () => {
      const m: Record<string, string> = {}
      for (const n of flat(tree).slice(0, 200)) {
        try { m[n.path] = await readTextFile(n.path) } catch { /* name-only fallback */ }
      }
      if (live) setContents(m)
    })()
    return () => { live = false }
  }, [tree])
  const all = flat(tree)
  const needle = q.toLowerCase()
  const res = q ? all.filter(n =>
    n.name.toLowerCase().includes(needle) || (contents[n.path] ?? '').toLowerCase().includes(needle)
  ).slice(0, 20) : []
  return (
    <div>
      <input placeholder="Search" value={q} onChange={e => setQ(e.target.value)} style={{ width: '100%' }} />
      {res.map(r => <div key={r.path} onClick={() => onSelect(r.path)}>{r.name}</div>)}
    </div>
  )
}
