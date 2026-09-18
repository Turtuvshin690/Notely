import { useCallback, useEffect, useState } from 'react'
import { Notebook } from '@phosphor-icons/react'
import Sidebar from './components/Sidebar'
import EditorView from './components/EditorView'
import SearchBar from './components/SearchBar'
import { pickVault, readTree } from './lib/fs'
import type { TreeNode } from './lib/fs'
import { load } from '@tauri-apps/plugin-store'
import { loadMeta, saveMeta, pushRecent, togglePin, toggleCollapse, pruneMeta } from './lib/meta'
import type { VaultMeta } from './lib/meta'
// Tauri invoke() rejects with a plain string, not an Error — handle both.
const errMsg = (e: unknown) => typeof e === 'string' ? e : e instanceof Error ? e.message : 'failed'
const flatPaths = (nodes: TreeNode[], into = new Set<string>()): Set<string> => {
  for (const n of nodes) { into.add(n.path); if (n.children) flatPaths(n.children, into) }
  return into
}
export function AppShell({ vault, tree, refresh, onOpenNote }: { vault: string; tree: TreeNode[]; refresh: () => void; onOpenNote?: (p: string) => void }) {
  const [sel, setSel] = useState<string | null>(null)
  const [meta, setMeta] = useState<VaultMeta>({ pinned: [], recent: [], collapsed: [] })
  const vaultName = vault.split(/[/\\]/).filter(Boolean).pop() ?? vault
  useEffect(() => {
    let live = true
    void loadMeta(vault).then((m) => { if (live) setMeta(pruneMeta(m, flatPaths(tree))) }).catch(() => {})
    return () => { live = false }
  }, [vault])
  useEffect(() => { setMeta((m) => pruneMeta(m, flatPaths(tree))) }, [tree])
  const persist = (next: VaultMeta) => { setMeta(next); void saveMeta(vault, next).catch(() => {}) }
  const handleSelect = (p: string) => { setSel(p); onOpenNote?.(p); persist(pushRecent(meta, p)) }
  return (
    <div className="app">
      <aside className="side">
        <div className="brand"><Notebook size={18} weight="duotone" className="brand-icon" />Notely</div>
        <div className="vault-name" title={vault}>{vaultName}</div>
        <SearchBar tree={tree} onSelect={handleSelect} />
        <Sidebar vault={vault} tree={tree} selected={sel} pinned={meta.pinned} recent={meta.recent} collapsed={meta.collapsed} onSelect={handleSelect} onChanged={refresh} onTogglePin={(p) => persist(togglePin(meta, p))} onToggleCollapse={(d) => persist(toggleCollapse(meta, d))} />
      </aside>
      <main className="main">
        {sel ? <EditorView key={sel} path={sel} /> : <div className="empty"><strong>Select a note</strong>Choose a note from the sidebar, or create a new one.</div>}
      </main>
    </div>
  )
}
export default function App() {
  const [vault, setVault] = useState<string | null>(null)
  const [tree, setTree] = useState<TreeNode[]>([])
  const [error, setError] = useState<string | null>(null)
  const refresh = useCallback(async (v: string) => {
    try { setTree(await readTree(v)); setError(null) }
    catch (e) { setError(`Could not read vault folder: ${errMsg(e)}`) }
  }, [])
  useEffect(() => {
    ;(async () => {
      try {
        const s = await load('notely.dat')
        const v = await s?.get<string>('vault')
        if (v) { setVault(v); await refresh(v) }
      } catch (e) { setError(`Could not load saved vault: ${errMsg(e)}`) }
    })()
  }, [refresh])
  const pick = async () => {
    try {
      const v = await pickVault()
      if (!v) return
      const s = await load('notely.dat')
      await s.set('vault', v); await s.save()
      setVault(v); await refresh(v)
    } catch (e) { setError(`Could not open folder: ${errMsg(e)}`) }
  }
  const repick = async () => {
    setError(null); setVault(null); setTree([])
    await pick()
  }
  if (!vault) return (
    <div className="center">
      <div className="card">
        <h1>Notely</h1>
        <p>Your local notes, simply kept. Pick a folder to use as your vault.</p>
        <button className="btn btn-primary" onClick={pick}>Open folder</button>
        {error && <div className="alert" role="alert"><span>{error}</span><button className="btn" onClick={pick}>Retry</button></div>}
      </div>
    </div>
  )
  if (error) return (
    <div className="center">
      <div className="card">
        <h1>Notely</h1>
        <p>{error}</p>
        <div className="actions-row">
          <button className="btn" onClick={() => vault && void refresh(vault)}>Retry</button>
          <button className="btn" onClick={repick}>Pick another folder</button>
        </div>
      </div>
    </div>
  )
  return <AppShell vault={vault} tree={tree} refresh={() => void refresh(vault)} />
}
