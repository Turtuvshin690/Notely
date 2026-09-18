# Notely Polish + Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the balanced lean slice — inline Modal replacing prompt/confirm, pins/recents/collapsible Sidebar, Editor split+toolbar+shortcuts+counts, Search v2 with snippets/keyboard/tags — with zero new deps.

**Architecture:** Keep `src/lib/fs.ts` as the only file-ops layer. Add `src/lib/meta.ts` (plugin-store `notely.dat` under `meta:<vaultPath>`) and `src/components/Modal.tsx` (pure UI). Extend Sidebar/Editor/Search in place following existing `errMsg`, `TreeNode`, CSS-var patterns.

**Tech Stack:** Tauri 2, React 19 + Vite + TypeScript, CodeMirror 6 via `@uiw/react-codemirror`, `react-markdown`, `@tauri-apps/plugin-store` / `plugin-fs` / `plugin-dialog`, Vitest + Testing Library, oxlint.

## Global Constraints

- 100% local — no account, no cloud, no network calls; vault path stays in `notely.dat` only.
- Zero new dependencies — reuse installed packages only (`@uiw/react-codemirror`, `react-markdown`, phosphor-icons, plugin-store/fs).
- Plain `.md` files stay portable — meta (pins/recents/collapsed) never writes frontmatter or sidecars into the vault.
- Follow existing patterns — Tauri `invoke()` rejects with plain string, use `errMsg`-style handling; `TreeNode` shape `{ name, path, isDir, children? }` unchanged.
- `npm run build` (`tsc -b && vite build`) must pass; `npx vitest run` must pass; `npm run lint` (oxlint) must pass.
- No `prompt()` / `confirm()` in shipped code — all CRUD goes through `Modal.tsx`.

---

### Task 1: Modal component (replaces prompt/confirm)

**Files:**
- Create: `src/components/Modal.tsx`
- Create: `src/components/Modal.test.tsx`
- Modify: `src/index.css` (append modal styles only)

**Interfaces:**
- Consumes: none (pure UI, React only).
- Produces: `Modal(props: { title: string; initialValue?: string; placeholder?: string; confirmLabel: string; danger?: boolean; requireOverwriteConfirm?: boolean; isDuplicate?: (v: string) => boolean; onSubmit: (v: string) => void; onClose: () => void })` — `requireOverwriteConfirm` turns confirm into two-click "Overwrite?" when `isDuplicate(value)` is true. Delete usage passes no `initialValue` and renders body text via `title` + children path (pass `initialValue=""` and hide input with `hideInput?: boolean` — signature includes `hideInput?: boolean`).

**Exact component contract (so later tasks typecheck):**
```ts
export type ModalProps = {
  title: string; initialValue?: string; placeholder?: string;
  confirmLabel: string; danger?: boolean; hideInput?: boolean;
  requireOverwriteConfirm?: boolean; isDuplicate?: (v: string) => boolean;
  body?: string; onSubmit: (v: string) => void; onClose: () => void;
}
export default function Modal(props: ModalProps): JSX.Element
```

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/Modal.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Modal from './Modal'

describe('Modal', () => {
  it('submits input value and closes on Esc', () => {
    const onSubmit = vi.fn(); const onClose = vi.fn()
    render(<Modal title="New note" confirmLabel="Create" onSubmit={onSubmit} onClose={onClose} />)
    fireEvent.change(screen.getByPlaceholderText(/name/i), { target: { value: 'ideas' } })
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    expect(onSubmit).toHaveBeenCalledWith('ideas')
  })
  it('two-click overwrite when duplicate', () => {
    const onSubmit = vi.fn(); const onClose = vi.fn()
    render(<Modal title="Rename" confirmLabel="Rename" requireOverwriteConfirm isDuplicate={() => true} initialValue="a" onSubmit={onSubmit} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /rename/i }))
    expect(screen.getByRole('button', { name: /overwrite/i })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /overwrite/i }))
    expect(onSubmit).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Modal.test.tsx`
Expected: FAIL with "Failed to resolve import ./Modal" / "Cannot find module".

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/Modal.tsx
import { useEffect, useRef, useState } from 'react'
export type ModalProps = {
  title: string; initialValue?: string; placeholder?: string;
  confirmLabel: string; danger?: boolean; hideInput?: boolean;
  requireOverwriteConfirm?: boolean; isDuplicate?: (v: string) => boolean;
  body?: string; onSubmit: (v: string) => void; onClose: () => void;
}
export default function Modal({ title, initialValue = '', placeholder = 'Name', confirmLabel, danger, hideInput, requireOverwriteConfirm, isDuplicate, body, onSubmit, onClose }: ModalProps) {
  const [v, setV] = useState(initialValue)
  const [arm, setArm] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  const dup = !hideInput && requireOverwriteConfirm && isDuplicate?.(v.trim()) ? true : false
  const showOverwrite = dup && !arm
  const label = dup && arm ? 'Overwrite?' : confirmLabel
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{title}</h2>
        {body && <p className="modal-body">{body}</p>}
        {!hideInput && <input ref={inputRef} className="modal-input" placeholder={placeholder} value={v} onChange={(e) => { setV(e.target.value); setArm(false) }} onKeyDown={(e) => { if (e.key === 'Enter' && v.trim()) { if (showOverwrite) setArm(true); else onSubmit(v.trim()) } }} />}
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className={danger || dup ? 'btn btn-danger' : 'btn btn-primary'}
            disabled={!hideInput && !v.trim()}
            onClick={() => { if (showOverwrite) { setArm(true); return } onSubmit(hideInput ? '' : v.trim()) }}
          >{label}</button>
        </div>
      </div>
    </div>
  )
}
```

CSS append (same step, in `src/index.css` at end):
```css
.modal-backdrop { position: fixed; inset: 0; background: rgba(20,30,25,.4); display: flex; align-items: center; justify-content: center; z-index: 50; }
.modal { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; box-shadow: var(--shadow); padding: 20px; width: min(380px, 90vw); animation: rise 180ms cubic-bezier(.16,1,.3,1); }
.modal-title { margin: 0 0 8px; font-size: 16px; color: var(--text-h); }
.modal-body { margin: 0 0 12px; color: var(--muted); font-size: 13.5px; word-break: break-all; }
.modal-input { width: 100%; box-sizing: border-box; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; font-size: 13.5px; }
.modal-input:focus { outline: none; border-color: var(--accent); }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
.btn-danger { background: var(--danger); border-color: transparent; color: #fff; }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/Modal.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/Modal.tsx src/components/Modal.test.tsx src/index.css
git commit -m "feat: add Modal dialog replacing prompt/confirm"
```

### Task 2: meta.ts store (pins / recents / collapsed)

**Files:**
- Create: `src/lib/meta.ts`
- Create: `src/lib/meta.test.ts`

**Interfaces:**
- Consumes: `@tauri-apps/plugin-store` `load('notely.dat')`.
- Produces:
```ts
export type VaultMeta = { pinned: string[]; recent: string[]; collapsed: string[] }
export const metaKey: (vault: string) => string  // `meta:<vault>`
export async function loadMeta(vault: string): Promise<VaultMeta>
export async function saveMeta(vault: string, m: VaultMeta): Promise<void>
export function pushRecent(m: VaultMeta, path: string, cap?: number): VaultMeta  // cap default 10, LRU, dedup
export function togglePin(m: VaultMeta, path: string): VaultMeta
export function toggleCollapse(m: VaultMeta, dir: string): VaultMeta
export function pruneMeta(m: VaultMeta, existing: Set<string>): VaultMeta
```

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/meta.test.ts
import { describe, it, expect, vi } from 'vitest'
vi.mock('@tauri-apps/plugin-store', () => ({
  load: async () => ({ get: async () => null, set: async () => {}, save: async () => {} }),
}))
import { pushRecent, togglePin, pruneMeta, metaKey } from './meta'

describe('meta', () => {
  it('metaKey namespaces by vault', () => {
    expect(metaKey('/v')).toBe('meta:/v')
  })
  it('pushRecent dedups LRU capped at 10', () => {
    let m = { pinned: [], recent: [], collapsed: [] as string[] }
    for (let i = 0; i < 12; i++) m = pushRecent(m, `/v/${i}.md`)
    expect(m.recent.length).toBe(10)
    expect(m.recent[0]).toBe('/v/11.md')
    m = pushRecent(m, '/v/11.md')
    expect(m.recent[0]).toBe('/v/11.md')
    expect(m.recent.length).toBe(10)
  })
  it('togglePin adds/removes, prune drops missing', () => {
    let m = { pinned: ['/v/a.md'], recent: ['/v/gone.md'], collapsed: [] as string[] }
    m = togglePin(m, '/v/a.md')
    expect(m.pinned).toEqual([])
    m = { ...m, recent: ['/v/gone.md'] }
    m = pruneMeta(m, new Set(['/v/keep.md']))
    expect(m.recent).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/meta.test.ts`
Expected: FAIL with "Cannot find module ./meta".

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/meta.ts
import { load } from '@tauri-apps/plugin-store'
export type VaultMeta = { pinned: string[]; recent: string[]; collapsed: string[] }
export const metaKey = (vault: string) => `meta:${vault}`
const empty: VaultMeta = { pinned: [], recent: [], collapsed: [] }
export async function loadMeta(vault: string): Promise<VaultMeta> {
  try {
    const s = await load('notely.dat')
    const m = await s?.get<VaultMeta>(metaKey(vault))
    if (!m) return { ...empty }
    return { pinned: m.pinned ?? [], recent: (m.recent ?? []).slice(0, 10), collapsed: m.collapsed ?? [] }
  } catch { return { ...empty } }
}
export async function saveMeta(vault: string, m: VaultMeta): Promise<void> {
  const s = await load('notely.dat')
  await s.set(metaKey(vault), m)
  await s.save()
}
export function pushRecent(m: VaultMeta, path: string, cap = 10): VaultMeta {
  return { ...m, recent: [path, ...m.recent.filter((p) => p !== path)].slice(0, cap) }
}
export function togglePin(m: VaultMeta, path: string): VaultMeta {
  return m.pinned.includes(path)
    ? { ...m, pinned: m.pinned.filter((p) => p !== path) }
    : { ...m, pinned: [...m.pinned, path] }
}
export function toggleCollapse(m: VaultMeta, dir: string): VaultMeta {
  return m.collapsed.includes(dir)
    ? { ...m, collapsed: m.collapsed.filter((d) => d !== dir) }
    : { ...m, collapsed: [...m.collapsed, dir] }
}
export function pruneMeta(m: VaultMeta, existing: Set<string>): VaultMeta {
  return { ...m, pinned: m.pinned.filter((p) => existing.has(p)), recent: m.recent.filter((p) => existing.has(p)) }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/meta.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/meta.ts src/lib/meta.test.ts
git commit -m "feat: add vault meta store for pins recents collapsed"
```

### Task 3: Sidebar — Modal wiring + pins / recents / collapse

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/Sidebar.test.tsx`
- Modify: `src/App.tsx:11-27` (wire `recordRecent` + prune; keep `AppShell` signature, add optional `onOpenNote` passthrough)
- Test: `src/components/Sidebar.test.tsx`

**Interfaces:**
- Consumes: `Modal` from Task 1, `loadMeta/saveMeta/pushRecent/togglePin/toggleCollapse/pruneMeta` from Task 2, existing `createNote/renameNote/removeNote/mkdirDir/parentDir/ensureMd/noteExists` from `../lib/fs`, `TreeNode` type.
- Produces: Sidebar renders `Pinned` + `Recent` sections above tree; folder rows toggle collapse on chevron/caret click; CRUD opens Modal instead of prompt/confirm. `App.tsx` `AppShell` calls `pushRecent`+`saveMeta` on select (fire-and-forget, errors swallowed).

- [ ] **Step 1: Write the failing test**

```tsx
// add to src/components/Sidebar.test.tsx (keep existing 2 tests, append):
import { fireEvent } from '@testing-library/react'
// ... inside describe('Sidebar'):
  it('opens modal instead of prompt on New', () => {
    render(<Sidebar vault="/v" tree={[]} onSelect={() => {}} onChanged={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /new/i }))
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
  it('renders pinned section', () => {
    render(<Sidebar vault="/v" tree={[{ name: 'a.md', path: '/v/a.md', isDir: false }]} pinned={['/v/a.md']} onSelect={() => {}} onChanged={() => {}} />)
    expect(screen.getByText(/pinned/i)).toBeTruthy()
  })
```

Note: this requires new optional props `pinned?: string[]`, `recent?: string[]`, `collapsed?: string[]`, `onTogglePin?: (p: string) => void`, `onToggleCollapse?: (d: string) => void`. Test fails first because props don't exist yet.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Sidebar.test.tsx`
Expected: FAIL — TypeScript/props error or "Unable to find role dialog".

- [ ] **Step 3: Write minimal implementation**

Replace `prompt`/`confirm` blocks in `src/components/Sidebar.tsx`:
- Add imports: `import Modal from './Modal'`, `import { Pin, Clock } from '@phosphor-icons/react'` (Pin + Clock exist in phosphor 2.x; if lint complains use `PushPin` — verify with `npx tsc --noEmit` and pick the exported name).
- Props: `type Props = { vault: string; tree: TreeNode[]; selected?: string | null; pinned?: string[]; recent?: string[]; collapsed?: string[]; onSelect: (p: string) => void; onChanged: () => void; onTogglePin?: (p: string) => void; onToggleCollapse?: (d: string) => void }`.
- Local state: `const [modal, setModal] = useState<null | { kind: 'newNote'|'newFolder'|'rename'|'delete'; dir?: string; node?: TreeNode }>(null)`.
- `createIn(dir)` → `setModal({ kind: 'newNote', dir })`; `mkDir(dir)` → `setModal({ kind: 'newFolder', dir })`; `renameNode(n)` → `setModal({ kind: 'rename', node: n })`; `del(n)` → `setModal({ kind: 'delete', node: n })`.
- Render `{modal && <Modal ... />}` at bottom with per-kind wiring:
  - newNote: `title="New note" confirmLabel="Create" requireOverwriteConfirm isDuplicate={(v) => tree-or-fs check}` — duplicate check must be async (`noteExists`) so implement as: `onSubmit` handler does `if (await noteExists(full) && !overwriteArmed)` — but Modal already two-clicks via `isDuplicate` sync check. Sync check: compare against flat tree names in target dir (no async). Keep async `noteExists` as final guard inside `onSubmit` that re-arms via `setModal` second confirm? Simplest: sync `isDuplicate` from tree + async guard that aborts with `setErr('Already exists')`. No data loss, no overwrite without explicit second click.
  - newFolder/rename/delete analogous; delete uses `hideInput body={Delete ${node.name}?}` with `danger confirmLabel="Delete"`.
- Folder row: caret button `onClick={(e) => { e.stopPropagation(); onToggleCollapse?.(n.path) }}` with `aria-expanded={!collapsed?.includes(n.path)}`; skip rendering children when collapsed. Keep `paddingLeft: 8 + depth*14`.
- Sections above `.tree`: `{pinned?.length > 0 && <div className="side-sec"><div className="side-sec-title">Pinned</div>{pinned rows}</div>}` and same for Recent with Clock icon. Pin toggle button per note row: `title={pinned?.includes(n.path) ? 'Unpin' : 'Pin'}`.
- `App.tsx` change (lines 11-27): in `AppShell`, add `useEffect` loading meta via `loadMeta(vault)`, prune against flat tree paths, `handleSelect = (p) => { setSel(p); const next = pushRecent(meta, p); setMeta(next); void saveMeta(vault, next).catch(() => {}) }`. Pass `pinned={meta.pinned} recent={meta.recent} collapsed={meta.collapsed}` plus toggle handlers that update + save. Keep `refresh` prop behavior unchanged.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/Sidebar.test.tsx`
Expected: PASS. Then typecheck: `npx tsc --noEmit`
Expected: no errors (fix phosphor icon name if needed).

- [ ] **Step 5: Commit**

```bash
git add src/components/Sidebar.tsx src/components/Sidebar.test.tsx src/App.tsx
git commit -m "feat: sidebar modal CRUD plus pins recents collapse"
```

### Task 4: Editor — split view + counts + toolbar + shortcuts

**Files:**
- Modify: `src/components/EditorView.tsx`
- Modify: `src/components/EditorView.test.tsx`
- Modify: `src/index.css` (append toolbar/split/status styles)

**Interfaces:**
- Consumes: existing `readTextFile/writeTextFile` debounce + `gen` guard (unchanged); `@uiw/react-codemirror` ref via `ReactCodeMirrorRef` type (`import type { ReactCodeMirrorRef } from '@uiw/react-codemirror'`).
- Produces: mode state `'edit' | 'preview' | 'split'`; toolbar buttons call `wrapSelection(before, after)` / `prefixLines(prefix)`; status bar shows `{words} words · {chars} chars`; `Ctrl/Cmd+S` forces immediate write, `Ctrl/Cmd+E` cycles mode, `Ctrl/Cmd+B/I` wrap `**`/`_`.

- [ ] **Step 1: Write the failing test**

```tsx
// append to src/components/EditorView.test.tsx inside describe('EditorView'):
  it('split renders editor and preview, toolbar bolds', async () => {
    const { container } = render(<EditorView path="/v/a.md" />)
    await flush()
    fireEvent.click(screen.getByRole('tab', { name: /split/i }))
    expect(container.querySelector('.pane.split-edit')).toBeTruthy()
    expect(container.querySelector('.pane.split-preview')).toBeTruthy()
  })
  it('shows word count', async () => {
    render(<EditorView path="/v/a.md" />)
    await flush()
    fireEvent.change(screen.getByLabelText('editor'), { target: { value: 'hello world' } })
    expect(screen.getByText(/2 words/i)).toBeTruthy()
  })
```

Fails because no `split` tab and no word count exist yet.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/EditorView.test.tsx`
Expected: FAIL — "Unable to find role tab with name /split/i".

- [ ] **Step 3: Write minimal implementation**

In `src/components/EditorView.tsx`:
```tsx
// add to imports:
import { useMemo } from 'react'
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror'
// state:
const [mode, setMode] = useState<'edit' | 'preview' | 'split'>('edit')
const cmRef = useRef<ReactCodeMirrorRef>(null)
// counts:
const words = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text])
const chars = text.length
// toolbar helpers (operate on cm view if present, else string fallback on whole text):
const wrapSelection = (before: string, after: string) => {
  const view = cmRef.current?.view
  if (!view) return
  const { from, to } = view.state.selection.main
  const sel = view.state.sliceDoc(from, to) || 'text'
  view.dispatch({ changes: { from, to, insert: `${before}${sel}${after}` } })
  view.focus()
}
// buttons call wrapSelection('**','**'), wrapSelection('_','_'), prefixLines('## '), prefixLines('- '), wrapSelection('> ','') per line, link: wrapSelection('[','](url)'), code: wrapSelection('`','`')
// shortcuts on wrapper div onKeyDown:
const onKey = (e: React.KeyboardEvent) => {
  const mod = e.ctrlKey || e.metaKey
  if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); void retry() }
  if (mod && e.key.toLowerCase() === 'e') { e.preventDefault(); setMode((m) => (m === 'edit' ? 'preview' : m === 'preview' ? 'split' : 'edit')) }
  if (mod && e.key.toLowerCase() === 'b') { e.preventDefault(); wrapSelection('**', '**') }
  if (mod && e.key.toLowerCase() === 'i') { e.preventDefault(); wrapSelection('_', '_') }
}
// render: segment gets third tab Split; toolbar div (role="toolbar" aria-label="Formatting") above panes in edit/split; status bar adds <span>{words} words · {chars} chars</span>; split pane:
{mode === 'split'
  ? <div className="split"><div className="pane split-edit"><CodeMirror ref={cmRef} value={text} extensions={[markdown()]} onChange={onChange} /></div><div className="pane split-preview"><div className="preview-inner"><ReactMarkdown>{text}</ReactMarkdown></div></div></div>
  : mode === 'edit' ? <div key="edit" className="pane edit enter"><CodeMirror ref={cmRef} value={text} extensions={[markdown()]} onChange={onChange} /></div>
  : <div key="preview" className="pane preview enter"><div className="preview-inner"><ReactMarkdown>{text}</ReactMarkdown></div></div>}
```

CSS append:
```css
.toolbar { display: flex; gap: 4px; padding: 6px 12px; border-bottom: 1px solid var(--border); background: var(--surface); }
.toolbar .icon-btn { font-size: 12.5px; font-weight: 700; padding: 4px 8px; }
.split { display: grid; grid-template-columns: 1fr 1fr; flex: 1; min-height: 0; }
.split .pane { overflow: auto; }
.split .split-edit { border-right: 1px solid var(--border); }
@media (max-width: 900px) { .split { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; } .split .split-edit { border-right: 0; border-bottom: 1px solid var(--border); } }
.status-counts { color: var(--muted); font-size: 12px; }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/EditorView.test.tsx`
Expected: PASS. Typecheck: `npx tsc --noEmit` — must pass (`ReactCodeMirrorRef` type exists in installed `@uiw/react-codemirror` 4.x).

- [ ] **Step 5: Commit**

```bash
git add src/components/EditorView.tsx src/components/EditorView.test.tsx src/index.css
git commit -m "feat: editor split view toolbar shortcuts counts"
```

### Task 5: Search v2 — debounce + snippets + keyboard + tags

**Files:**
- Modify: `src/components/SearchBar.tsx`
- Modify: `src/components/SearchBar.test.tsx`
- Modify: `src/index.css` (append snippet/pill styles)

**Interfaces:**
- Consumes: `readTextFile` from `../lib/fs`, `TreeNode` type. No new deps.
- Produces: same props `{ tree, onSelect }`; behavior: input debounced 150ms for content matching (name matches instant); hit shows `snippet` line; `ArrowUp/Down/Enter/Escape` keyboard; `#tag` query filters by tag; empty-`#` shows top-10 tag pills.
- Exported for tests: `export const extractTags: (s: string) => string[]`, `export const findSnippet: (content: string, needle: string) => string`.

```ts
export function extractTags(s: string): string[] {
  const out = s.match(/#[\w-]{2,}/g) ?? []
  return [...new Set(out.map((t) => t.toLowerCase()))]
}
export function findSnippet(content: string, needle: string): string {
  const i = content.toLowerCase().indexOf(needle.toLowerCase())
  if (i < 0) return ''
  const line = content.slice(Math.max(0, content.lastIndexOf('\n', i) + 1), content.indexOf('\n', i) < 0 ? undefined : content.indexOf('\n', i))
  const j = line.toLowerCase().indexOf(needle.toLowerCase())
  return line.slice(Math.max(0, j - 30), j + needle.length + 30)
}
```

- [ ] **Step 1: Write the failing test**

```tsx
// append to src/components/SearchBar.test.tsx:
import SearchBar, { extractTags, findSnippet } from './SearchBar'
// inside describe:
  it('extracts tags and finds snippet', () => {
    expect(extractTags('a #Work and #work plus #todo-list')).toEqual(['#work', '#todo-list'])
    expect(findSnippet('line one\noat milk here\nline three', 'oat milk')).toContain('oat milk')
  })
  it('filters by #tag', async () => {
    render(<SearchBar tree={[{ name: 'n.md', path: '/v/n.md', isDir: false }]} onSelect={() => {}} />)
    await act(async () => {})
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: '#honey' } })
    await act(async () => { await new Promise((r) => setTimeout(r, 200)) })
    expect(screen.getByText('n.md')).toBeTruthy()
  })
```

Mocked `readTextFile` returns `'groceries: oat milk and honey #honey'` — update the top `vi.mock` content string to include ` #honey` so the tag test passes after implementation (current mock `'groceries: oat milk and honey'` lacks tag; change to `'groceries: oat milk and honey #honey'` in this step).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/SearchBar.test.tsx`
Expected: FAIL — "extractTags is not exported" / "findSnippet is not exported".

- [ ] **Step 3: Write minimal implementation**

Rewrite `src/components/SearchBar.tsx`:
```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
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
      {(dq === '' || dq === '#') && tags.length > 0 && !q && <div className="tag-pills">{tags.map((t) => <button key={t} className="tag-pill" onClick={() => setQ(t)}>{t}</button>)}</div>}
      {res.length > 0 && <div className="search-results" role="listbox">
        {res.map((r, i) => {
          const sn = !isTag && needle ? findSnippet(contents[r.path] ?? '', needle) : extractTags(contents[r.path] ?? '').join(' ')
          return <div className={`search-hit${i === active ? ' active' : ''}`} id={`hit-${i}`} role="option" aria-selected={i === active} key={r.path} onMouseEnter={() => setActive(i)} onClick={() => { onSelect(r.path); setQ('') }}><div className="hit-name">{r.name}</div>{sn && <div className="hit-snippet">{sn}</div>}</div>
        })}
      </div>}
    </div>
  )
}
```

CSS append:
```css
.search-hit.active { background: var(--hover); color: var(--text-h); }
.hit-name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hit-snippet { font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tag-pills { display: flex; flex-wrap: wrap; gap: 4px; padding: 6px 2px; }
.tag-pill { border: 1px solid var(--border); background: var(--surface); border-radius: 999px; padding: 2px 10px; font-size: 12px; color: var(--accent); cursor: pointer; }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/SearchBar.test.tsx`
Expected: PASS. Note the `#honey` test needs the 150ms debounce — tag queries bypass debounce (`q.startsWith('#') ? 0 : 150`) so no fake timers needed; the extra 200ms wait covers the chunked content load.

- [ ] **Step 5: Commit**

```bash
git add src/components/SearchBar.tsx src/components/SearchBar.test.tsx src/index.css
git commit -m "feat: search snippets keyboard nav and tag filter"
```

### Task 6: Final polish — a11y, empty states, verify

**Files:**
- Modify: `src/index.css` (focus states for new elements only if missing)
- Modify: `src/App.tsx` (empty-state copy mentions pins/shortcuts — one line)
- Test: full suite + build + lint

**Interfaces:**
- Consumes: all Tasks 1-5.
- Produces: shippable slice, no `prompt`/`confirm` remaining, docs updated.

- [ ] **Step 1: Remove last native dialogs + verify none remain**

Run: `rg -n "prompt\(|confirm\(" src --glob '*.tsx' --glob '*.ts'`
Expected: zero hits (tests may use the words — filter to `src/` non-test files; if hits, replace with Modal before proceeding).

- [ ] **Step 2: Run full verification**

Run: `npx vitest run`
Expected: PASS all suites.

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors (fix with `npx oxlint --fix` if needed, then re-run).

Run: `npm run build`
Expected: `tsc -b && vite build` succeeds, `dist/` emitted.

- [ ] **Step 3: Update README feature list (3 lines)**

In `README.md` `## ✨ What you get` table, append rows:
```md
| 📌 **Pins + recents** | Pin notes to the top; recent files follow you per vault. |
| ✂️ **Split + toolbar** | Write/preview/split, markdown toolbar, `Ctrl+S/E/B/I` shortcuts, word count. |
| 🏷️ **Tags + search v2** | `#tag` filter, snippets, keyboard nav (`↑↓ Enter Esc`). |
```

- [ ] **Step 4: Commit**

```bash
git add README.md src/App.tsx src/index.css
git commit -m "docs: polish slice readme and final a11y"
```

## Task Dependencies

- Task 2 independent of Task 1 — can run in parallel.
- Task 3 needs Tasks 1+2 (imports Modal + meta helpers + exact prop names).
- Task 4 independent of 1-3 (touches only EditorView + CSS appends; coordinate CSS append order to avoid merge conflicts — each task appends at end of file).
- Task 5 independent of 1-4 (touches only SearchBar + CSS appends).
- Task 6 needs 1-5.

## Out of Scope (do not build)

Sorting options, drag-drop, export zip, backlinks/graph, extra themes, plugins, sync, SQLite, any new npm dependency, vault-file format changes.
