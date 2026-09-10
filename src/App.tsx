import { useEffect, useState } from 'react'
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
  useEffect(() => {
    load('notely.dat').then(async (s) => {
      const v = await s?.get<string>('vault')
      if (v) { setVault(v); setTree(await readTree(v)) }
    })
  }, [])
  if (!vault) return <button onClick={async () => {
    const v = await pickVault()
    if (v) { const s = await load('notely.dat'); await s.set('vault', v); await s.save(); setVault(v); setTree(await readTree(v)) }
  }}>Open folder</button>
  return <AppShell vault={vault} tree={tree} refresh={async () => setTree(await readTree(vault))} />
}
