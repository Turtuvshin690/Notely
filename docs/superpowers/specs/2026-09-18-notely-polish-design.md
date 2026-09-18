# Notely — Polish + Features Design (2026-09-18)

Balanced slice. Lean, 100% local, zero new deps. User-approved Approach A.

## 1. Architecture

Tauri 2 + React 19 + Vite + TS. Filesystem stays the DB. Vault = folder of plain `.md`.
- Keep `src/lib/fs.ts` as the only file-ops layer (`readTree`, `readTextFile`, `writeTextFile`, CRUD).
- Add `src/lib/meta.ts`: pins / recents / collapsed state backed by `plugin-store` `notely.dat` under keys `meta:<vaultPath>` → `{ pinned: string[], recent: string[], collapsed: string[] }`. No frontmatter, no `.md` format change — files stay portable to Obsidian/VS Code.
- Add `src/components/Modal.tsx`: single reusable accessible dialog (input + confirm/cancel, Esc/Enter, autofocus, `role="dialog"`).
- Extend in place: `Sidebar.tsx`, `EditorView.tsx`, `SearchBar.tsx`, `index.css`. No new routes, no new libs.

Isolation: Sidebar → `fs.ts` + `meta.ts` only. Editor → `fs.ts` only. Search → `fs.ts` read cache + in-memory tag parse. Modal has no store/fs imports (pure UI, callbacks only).

## 2. Components

### Modal (replaces prompt/confirm)
- Props: `title, initialValue?, placeholder?, confirmLabel, danger?, requireOverwriteConfirm?, onSubmit(value), onClose`.
- Used for: new note, new folder, rename note/folder, delete confirm (no input, shows path name).
- Validation inline: empty → disable submit; duplicate `.md` → when `requireOverwriteConfirm` is set, confirm button turns into "Overwrite?" two-click confirm inside the same dialog (replaces `confirm('Overwrite?')`). YAGNI: no focus trap lib, just autofocus + Esc.

### Sidebar polish
- Collapsible folders: chevron rotates, children hide. State in-memory + persisted to `meta.ts` `collapsed[]`.
- Pinned section on top: pin/unpin icon-btn per note. Pinned stored as full paths in `meta.ts`.
- Recents: last 10 selected paths, LRU on `onSelect`, rendered under Pinned as compact list. Missing files pruned on tree refresh.
- Keep: folders-first A-Z sort, hover acts, `.tree-empty` state, inline `alert` for errors.

### EditorView
- Mode: `write | preview | split`. Segment control gets third button. Split = CSS grid 2 cols on wide (>900px), stacked on narrow. Both panes render from same `text` state.
- Toolbar (write + split only): H, B, I, •list, Quote, Link, Code. Inserts markdown around selection via CodeMirror ref (`view.dispatch`). No new dep — use `@uiw/react-codemirror` ref api already installed.
- Status bar: `words / chars` count (split on `\s+`, ponytail: naive count, good enough) + existing save dot + Retry.
- Shortcuts: `Ctrl/Cmd+S` force-save (preventDefault), `Ctrl/Cmd+E` cycle mode, `Ctrl/Cmd+B` / `Ctrl/Cmd+I` wrap selection. Scoped to EditorView keydown, ignored when Modal open.
- Autosave debounce 500ms unchanged, stale-write guard (`gen` ref) unchanged.

### SearchBar v2 + Tags
- Debounce input 150ms. Content cache: chunked async load (50 files per tick via `setTimeout 0`) to lift 200-file cap without jank; cap display at 20 hits.
- Hit row: name + one-line snippet (first matching line, ±30 chars, `<mark>` highlight — plain string split, no HTML injection since we render text nodes).
- Keyboard: Up/Down moves active, Enter selects, Esc clears. `role="listbox/option"`, `aria-activedescendant`.
- Tags: parse `/#[\w-]{2,}/g` from cached contents. Typing `#work` filters to notes containing that exact tag (case-insensitive); when input is empty or exactly `#`, show top-10 tags by frequency as clickable pills that fill the input. No file writes.

## 3. Data Flow

1. `App` loads vault path from store, `readTree(vault)` → tree. `meta.ts` loads `pinned/recent/collapsed` for vault key.
2. Select note → `onSelect(path)` → EditorView mounts (`key={path}`) → `readTextFile` → edit. `meta.recordRecent(path)` (fire-and-forget store save).
3. Type → 500ms debounce → `writeTextFile`. `pending` ref flush on path change/unmount unchanged.
4. CRUD via Modal → `fs.ts` op → `onChanged()` refresh tree → prune `pinned/recent` entries missing from tree.
5. Search effect depends on `tree`; chunked loader fills `contents` map; tag index derived via `useMemo`.

All `.md` UTF-8, filename = title. Meta never touches vault files.

## 4. Error Handling

- Reuse `errMsg` (Tauri rejects with plain string). Modal submit errors → inline hint, keep dialog open.
- Duplicate name: inline hint + disable confirm unless overwrite checkbox ticked (replaces `confirm('Overwrite?')`).
- Write fail: existing `error` save-state + Retry kept. Flush-on-unmount failure stays silent-catch (no silent loss of current buffer — buffer lives in `pending` + `text` state).
- Search file read fail → name-only fallback (existing behavior kept).
- No vault / unreadable vault: existing centered cards unchanged.

## 5. Testing

- Extend colocated tests: `Modal.test.tsx` (submit/cancel/Esc), `Sidebar` pin + collapse, `EditorView` toolbar wrap + split renders both panes + `Ctrl+S` calls write, `SearchBar` keyboard nav + `#tag` filter.
- `npm run build` must typecheck (`tsc -b`). Vitest + Testing Library already installed.
- Manual UAT: open vault, create/rename/delete via Modal, pin/recent persist across restart, split edit, toolbar, shortcuts, search snippet + keyboard, 500+ file vault stays responsive.

## Out of Scope

Sorting options, drag-drop, export zip, backlinks/graph, themes beyond OS light/dark, plugins, sync, SQLite, new deps (fuzzy lib, hotkey lib). Add when requested.
