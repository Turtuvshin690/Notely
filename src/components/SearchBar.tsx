import { useEffect, useMemo, useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import type { TreeNode } from '../lib/fs'
import { readTextFile } from '../lib/fs'
const flat = (t: TreeNode[]): TreeNode[] => t.flatMap((n) => (n.isDir ? flat(n.children ?? []) : [n]))
export function extractTags(s: string): string[] {
  const out = s.match(/#[\w-]{2,}/g) ?? []
  return [...new Set(out.map((t) => t.toLowerCase()))]
}
export function findSnippet(content: string, needle: string): string {
  const i = content.toLowerCase().indexOf(needle.toLowerCase())
  if (i < 0) return ''
  const start = Math.max(0, content.lastIndexOf('\n', i) + 1)
  let end = content.indexOf('\n', i)
  if (end < 0) end = content.length
  const line = content.slice(start, end)
  const j = line.toLowerCase().indexOf(needle.toLowerCase())
  return line.slice(Math.max(0, j - 30), j + needle.length + 30)
}
export default function SearchBar({ tree, onSelect }: { tree: TreeNode[]; onSelect: (p: string) => void }) {
  const [q, setQ] = useState('')
  const [dq, setDq] = useState('')
  const [contents, setContents] = useState<Record<string, string>>({})
  const [active, setActive] = useState(0)
  useEffect(() => {
    const t = window.setTimeout(() => setDq(q), q.startsWith('#') ? 0 : 150)
    return () => window.clearTimeout(t)
  }, [q])
  useEffect(() => {
    let live = true
    ;(async () => {
      const m: Record<string, string> = {}
      const files = flat(tree)
      for (let i = 0; i < files.length; i += 50) {
        for (const n of files.slice(i, i + 50)) {
          try { m[n.path] = await readTextFile(n.path) } catch { /* name-only */ }
        }
        if (!live) return
        await new Promise((r) => setTimeout(r, 0))
      }
      if (live) setContents(m)
    })()
    return () => { live = false }
  }, [tree])
  const all = useMemo(() => flat(tree), [tree])
  const tags = useMemo(() => {
    const c = new Map<string, number>()
    for (const v of Object.values(contents)) for (const t of extractTags(v)) c.set(t, (c.get(t) ?? 0) + 1)
    return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t]) => t)
  }, [contents])
  const needle = dq.trim().toLowerCase()
  const isTag = needle.startsWith('#')
  const res = dq
    ? all.filter((n) => {
        if (isTag) return (extractTags(contents[n.path] ?? '').includes(needle))
        return n.name.toLowerCase().includes(needle) || (contents[n.path] ?? '').toLowerCase().includes(needle)
      }).slice(0, 20)
    : []
  useEffect(() => { setActive(0) }, [dq])
  return (
    <div className="search-wrap">
      <MagnifyingGlass size={15} className="search-icon" />
      <input className="search" placeholder="Search notes" role="combobox" aria-expanded={res.length > 0} aria-activedescendant={res.length ? `hit-${active}` : undefined} value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && res.length) { e.preventDefault(); setActive((a) => (a + 1) % res.length) }
          if (e.key === 'ArrowUp' && res.length) { e.preventDefault(); setActive((a) => (a - 1 + res.length) % res.length) }
          if (e.key === 'Enter' && res[active]) { onSelect(res[active].path); setQ('') }
          if (e.key === 'Escape') setQ('')
        }} />
      {(dq === '' || dq === '#') && tags.length > 0 && (q===''||q==='#') && <div className="tag-pills">{tags.map((t) => <button key={t} className="tag-pill" onClick={() => setQ(t)}>{t}</button>)}</div>}
      {res.length > 0 && <div className="search-results" role="listbox">
        {res.map((r, i) => {
          const sn = !isTag && needle ? findSnippet(contents[r.path] ?? '', needle) : extractTags(contents[r.path] ?? '').join(' ')
          return <div className={`search-hit${i === active ? ' active' : ''}`} id={`hit-${i}`} role="option" aria-selected={i === active} key={r.path} onMouseEnter={() => setActive(i)} onClick={() => { onSelect(r.path); setQ('') }}><div className="hit-name">{r.name}</div>{sn && <div className="hit-snippet">{sn}</div>}</div>
        })}
      </div>}
    </div>
  )
}
