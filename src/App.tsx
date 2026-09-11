import { useCallback, useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import EditorView from './components/EditorView'
import SearchBar from './components/SearchBar'
import { pickVault, readTree } from './lib/fs'
import type { TreeNode } from './lib/fs'
import { load } from '@tauri-apps/plugin-store'
export function AppShell({ vault, tree, refresh }: { vault: string; tree: TreeNode[]; refresh: () => void }) {
  const [sel, setSel] = useState<string | null>(null)
  const vaultName = vault.split(/[/\\]/).filter(Boolean).pop() ?? vault
  return (
    <div className="app">
      <aside className="side">
        <div className="brand"><span className="brand-mark" />Notely</div>
        <div className="vault-name" title={vault}>{vaultName}</div>
        <SearchBar tree={tree} onSelect={setSel} />
        <Sidebar vault={vault} tree={tree} selected={sel} onSelect={setSel} onChanged={refresh} />
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
    catch (e) { setError(`Could not read vault folder: ${e instanceof Error ? e.message : 'failed'}`) }
  }, [])
  useEffect(() => {
    ;(async () => {
      try {
        const s = await load('notely.dat')
        const v = await s?.get<string>('vault')
        if (v) { setVault(v); await refresh(v) }
      } catch (e) { setError(`Could not load saved vault: ${e instanceof Error ? e.message : 'failed'}`) }
    })()
  }, [refresh])
  const pick = async () => {
    try {
      const v = await pickVault()
      if (!v) return
      const s = await load('notely.dat')
      await s.set('vault', v); await s.save()
      setVault(v); await refresh(v)
    } catch (e) { setError(`Could not open folder: ${e instanceof Error ? e.message : 'failed'}`) }
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
