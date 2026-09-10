import { useCallback, useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import EditorView from './components/EditorView'
import SearchBar from './components/SearchBar'
import { pickVault, readTree } from './lib/fs'
import type { TreeNode } from './lib/fs'
import { load } from '@tauri-apps/plugin-store'
export function AppShell({ vault, tree, refresh }: { vault: string; tree: TreeNode[]; refresh: () => void }) {
  const [sel, setSel] = useState<string | null>(null)
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div><SearchBar tree={tree} onSelect={setSel} /><Sidebar vault={vault} tree={tree} onSelect={setSel} onChanged={refresh} /></div>
      {sel ? <EditorView key={sel} path={sel} /> : <div style={{ padding: 24 }}>Select a note</div>}
    </div>
  )
}
export default function App() {
  const [vault, setVault] = useState<string | null>(null)
  const [tree, setTree] = useState<TreeNode[]>([])
  const [error, setError] = useState<string | null>(null)
  const refresh = useCallback(async (v: string) => {
    try { setTree(await readTree(v)); setError(null) }
    catch { setError('Could not read vault folder. It may have moved or permissions changed.') }
  }, [])
  useEffect(() => {
    ;(async () => {
      try {
        const s = await load('notely.dat')
        const v = await s?.get<string>('vault')
        if (v) { setVault(v); await refresh(v) }
      } catch { setError('Could not load saved vault.') }
    })()
  }, [refresh])
  const pick = async () => {
    try {
      const v = await pickVault()
      if (!v) return
      const s = await load('notely.dat')
      await s.set('vault', v); await s.save()
      setVault(v); await refresh(v)
    } catch { setError('Could not open folder.') }
  }
  const repick = async () => {
    setError(null); setVault(null); setTree([])
    await pick()
  }
  if (!vault) return (
    <div style={{ padding: 24 }}>
      <button onClick={pick}>Open folder</button>
      {error && <div role="alert">{error} <button onClick={pick}>Retry</button></div>}
    </div>
  )
  if (error) return (
    <div style={{ padding: 24 }}>
      <div role="alert">{error}</div>
      <button onClick={() => vault && void refresh(vault)}>Retry</button>
      <button onClick={repick}>Pick another folder</button>
    </div>
  )
  return <AppShell vault={vault} tree={tree} refresh={() => void refresh(vault)} />
}
