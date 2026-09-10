# Notely MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build minimal Tauri desktop Notely that edits plain .md files in a user-chosen folder.

**Architecture:** Tauri 2 shell for window + fs + dialog. React+Vite UI. Filesystem is DB, no SQLite. `src/lib/fs.ts` is sole fs boundary.

**Tech Stack:** Tauri 2, React 18, Vite 5, TypeScript 5, @tauri-apps/plugin-fs, @tauri-apps/plugin-dialog, @tauri-apps/plugin-store, @uiw/react-codemirror, react-markdown, vitest

## Global Constraints

- Vault = user-chosen folder, stored via tauri-store, reloaded on restart
- All notes are plain `.md` UTF-8 files, filename = title
- Autosave debounce 500ms, never silent data loss — failed save keeps dirty state
- No SQLite, no server, no sync in v1
- MIT license, 100% free open-source

---

### Task 1: Scaffold Tauri + React + Vitest

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/capabilities/default.json`
- Test: `src/lib/fs.test.ts`

**Interfaces:**
- Consumes: none
- Produces: runnable `npm run tauri dev`, `vitest` runner

- [ ] **Step 1: Scaffold frontend**

Run:
```bash
npm create vite@latest . -- --template react-ts
npm install
```
Expected: `package.json`, `src/` created. If dir not empty, run in temp then copy `package.json`, `vite.config.ts`, `index.html`, `src/`.

- [ ] **Step 2: Add Tauri + plugins**

Run:
```bash
npm install --save-dev @tauri-apps/cli
npm install @tauri-apps/api @tauri-apps/plugin-fs @tauri-apps/plugin-dialog @tauri-apps/plugin-store @uiw/react-codemirror react-markdown
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
npx tauri init --ci --app-name Notely --window-title Notely --frontend-dist ../dist
```

- [ ] **Step 3: Configure vitest + capabilities**

`vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true },
  clearScreen: false,
  server: { strictPort: true },
})
```

`src-tauri/capabilities/default.json`:
```json
{
  "identifier": "default",
  "permissions": ["fs:allow-read-dir", "fs:allow-read-text-file", "fs:allow-write-text-file", "fs:allow-remove-file", "fs:allow-rename-file", "fs:allow-mkdir", "dialog:allow-open", "store:allow-load", "store:allow-save"]
}
```

- [ ] **Step 4: Smoke test runs**

Run:
```bash
npx tsc --noEmit
npx vitest run --reporter=verbose
```
Expected: PASS (no tests yet), no TS errors.

- [ ] **Step 5: Commit**

```bash
git add package.json vite.config.ts tsconfig.json index.html src/ src-tauri/
git commit -m "feat: scaffold tauri+react+vitest"
```

### Task 2: fs lib + vault pick + tree read

**Files:**
- Create: `src/lib/fs.ts`
- Create: `src/lib/fs.test.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: tauri plugins fs/dialog/store
- Produces:
  - `export type TreeNode = { name: string; path: string; isDir: boolean; children?: TreeNode[] }`
  - `export async function readTree(root: string): Promise<TreeNode[]>`
  - `export async function readTextFile(path: string): Promise<string>`
  - `export async function writeTextFile(path: string, content: string): Promise<void>`
  - `export async function pickVault(): Promise<string | null>`

- [ ] **Step 1: Write failing test**

`src/lib/fs.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
vi.mock('@tauri-apps/plugin-fs', () => ({
  readDir: async () => [{ name: 'hello.md', isDirectory: false }],
  readTextFile: async () => '# hi',
  writeTextFile: async () => {},
}))
import { readTree } from './fs'
describe('readTree', () => {
  it('lists md files', async () => {
    const nodes = await readTree('/vault')
    expect(nodes.length).toBe(1)
    expect(nodes[0].name).toBe('hello.md')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/fs.test.ts -v`
Expected: FAIL with "Cannot find module './fs'"

- [ ] **Step 3: Write minimal implementation**

`src/lib/fs.ts`:
```ts
import { readDir, readTextFile as r, writeTextFile as w } from '@tauri-apps/plugin-fs'
import { open } from '@tauri-apps/plugin-dialog'
export type TreeNode = { name: string; path: string; isDir: boolean; children?: TreeNode[] }
export async function readTree(root: string): Promise<TreeNode[]> {
  const entries = await readDir(root)
  const out: TreeNode[] = []
  for (const e of entries) {
    const p = `${root}/${e.name}`
    if (e.isDirectory) out.push({ name: e.name!, path: p, isDir: true, children: await readTree(p) })
    else if (e.name!.endsWith('.md')) out.push({ name: e.name!, path: p, isDir: false })
  }
  return out.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1))
}
export const readTextFile = (p: string) => r(p)
export const writeTextFile = (p: string, c: string) => w(p, c)
export async function pickVault(): Promise<string | null> {
  const sel = await open({ directory: true })
  return typeof sel === 'string' ? sel : null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/fs.test.ts -v`
Expected: PASS

- [ ] **Step 5: Wire App vault state**

`src/App.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { pickVault, readTree, TreeNode } from './lib/fs'
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
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/fs.ts src/lib/fs.test.ts src/App.tsx
git commit -m "feat: fs lib + vault pick + tree read"
```

### Task 3: Sidebar CRUD

**Files:**
- Create: `src/components/Sidebar.tsx`
- Test: `src/components/Sidebar.test.tsx`

**Interfaces:**
- Consumes: `TreeNode`, `readTree` from Task 2
- Produces: `<Sidebar vault tree onSelect onChanged />` where `onSelect(path: string)`, `onChanged(): void`

- [ ] **Step 1: Write failing test**

`src/components/Sidebar.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Sidebar from './Sidebar'
describe('Sidebar', () => {
  it('renders md nodes', () => {
    render(<Sidebar vault="/v" tree={[{ name: 'a.md', path: '/v/a.md', isDir: false }]} onSelect={() => {}} onChanged={() => {}} />)
    expect(screen.getByText('a.md')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Sidebar.test.tsx -v`
Expected: FAIL "Cannot find module './Sidebar'"

- [ ] **Step 3: Write minimal implementation**

`src/components/Sidebar.tsx`:
```tsx
import { mkdir, writeTextFile, remove, rename } from '@tauri-apps/plugin-fs'
import { TreeNode } from '../lib/fs'
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Sidebar.test.tsx -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/Sidebar.tsx src/components/Sidebar.test.tsx
git commit -m "feat: sidebar tree + CRUD"
```

### Task 4: Editor + Preview + Autosave

**Files:**
- Create: `src/components/EditorView.tsx`
- Test: `src/components/EditorView.test.tsx`

**Interfaces:**
- Consumes: `readTextFile(path): Promise<string>`, `writeTextFile(path, content): Promise<void>`
- Produces: `<EditorView path />` — loads, edits, debounced 500ms save, split preview

- [ ] **Step 1: Write failing test**

`src/components/EditorView.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
vi.mock('../lib/fs', () => ({ readTextFile: async () => '# hi', writeTextFile: async () => {} }))
import EditorView from './EditorView'
describe('EditorView', () => {
  it('shows save state', async () => {
    render(<EditorView path="/v/a.md" />)
    expect(await screen.findByText(/saved|saving|hi/i)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/EditorView.test.tsx -v`
Expected: FAIL "Cannot find module './EditorView'"

- [ ] **Step 3: Write minimal implementation**

`src/components/EditorView.tsx`:
```tsx
import { useEffect, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import ReactMarkdown from 'react-markdown'
import { readTextFile, writeTextFile } from '../lib/fs'
export default function EditorView({ path }: { path: string }) {
  const [text, setText] = useState('')
  const [state, setState] = useState<'saved' | 'saving' | 'error'>('saved')
  const t = useRef<number>(0)
  useEffect(() => { readTextFile(path).then(setText).catch(() => setState('error')) }, [path])
  const onChange = (v: string) => {
    setText(v); setState('saving')
    window.clearTimeout(t.current)
    t.current = window.setTimeout(async () => {
      try { await writeTextFile(path, v); setState('saved') } catch { setState('error') }
    }, 500)
  }
  return (
    <div style={{ display: 'flex', flex: 1 }}>
      <div style={{ flex: 1 }}><CodeMirror value={text} extensions={[markdown()]} onChange={onChange} /></div>
      <div style={{ flex: 1, padding: 12, borderLeft: '1px solid #eee' }}><ReactMarkdown>{text}</ReactMarkdown></div>
      <div style={{ position: 'fixed', bottom: 8, right: 12 }}>{state}</div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/EditorView.test.tsx -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/EditorView.tsx src/components/EditorView.test.tsx
git commit -m "feat: editor + preview + 500ms autosave"
```

### Task 5: Search + App wiring

**Files:**
- Create: `src/components/SearchBar.tsx`
- Modify: `src/App.tsx`
- Test: `src/components/SearchBar.test.tsx`

**Interfaces:**
- Consumes: `TreeNode[]`, `readTextFile`
- Produces: `<SearchBar tree onSelect(path) />`, full `App` layout

- [ ] **Step 1: Write failing test**

`src/components/SearchBar.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SearchBar from './SearchBar'
describe('SearchBar', () => {
  it('filters by name', () => {
    render(<SearchBar tree={[{ name: 'apple.md', path: '/v/apple.md', isDir: false }]} onSelect={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'apple' } })
    expect(screen.getByText('apple.md')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/SearchBar.test.tsx -v`
Expected: FAIL "Cannot find module './SearchBar'"

- [ ] **Step 3: Write minimal implementation**

`src/components/SearchBar.tsx`:
```tsx
import { useState } from 'react'
import { TreeNode } from '../lib/fs'
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
```

Final `src/App.tsx`:
```tsx
import { useState } from 'react'
import Sidebar from './components/Sidebar'
import EditorView from './components/EditorView'
import SearchBar from './components/SearchBar'
import { readTree, TreeNode } from './lib/fs'
export default function AppShell({ vault, tree, refresh }: { vault: string; tree: TreeNode[]; refresh: () => void }) {
  const [sel, setSel] = useState<string | null>(null)
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div><SearchBar tree={tree} onSelect={setSel} /><Sidebar vault={vault} tree={tree} onSelect={setSel} onChanged={refresh} /></div>
      {sel ? <EditorView key={sel} path={sel} /> : <div style={{ padding: 24 }}>Select a note</div>}
    </div>
  )
}
```
Wire into existing `App` from Task 2: replace tree `<div>` with `<AppShell vault tree refresh={async () => setTree(await readTree(vault))} />`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run -v`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/SearchBar.tsx src/components/SearchBar.test.tsx src/App.tsx
git commit -m "feat: search + app wiring"
```

### Task 6: OSS polish + CI

**Files:**
- Create: `LICENSE`, `README.md`, `CONTRIBUTING.md`, `.github/workflows/build.yml`

- [ ] **Step 1: Write LICENSE (MIT)**

```
MIT License — Copyright (c) 2026 Notely contributors — permission hereby granted, free of charge...
```

Full MIT text with `Notely` name.

- [ ] **Step 2: Write README**

```md
# Notely — 100% free local notes
Vault = folder you pick. Files are plain .md.
## Dev
npm install
npm run tauri dev
## Build
npm run tauri build
```

- [ ] **Step 3: Write CI**

`.github/workflows/build.yml`:
```yaml
name: build
on: [push, pull_request]
jobs:
  build:
    strategy:
      matrix: { os: [ubuntu-latest, windows-latest, macos-latest] }
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: dtolnay/rust-toolchain@stable
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npx vitest run
      - run: npm run tauri build
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add LICENSE README.md CONTRIBUTING.md .github/workflows/build.yml
git commit -m "chore: oss polish + ci"
```
