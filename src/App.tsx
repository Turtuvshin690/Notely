import { useEffect, useState } from 'react'
import { pickVault, readTree } from './lib/fs'
import type { TreeNode } from './lib/fs'
import { load } from '@tauri-apps/plugin-store'
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
  return <div>{tree.map(n => <div key={n.path}>{n.name}</div>)}</div>
}
