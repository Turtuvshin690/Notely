# Notely — Design (2026-09-10)

100% free open-source local-first notes. Minimal MVP desktop.

## 1. Architecture
Tauri 2 + React + Vite. Filesystem is DB. Vault = user-chosen folder. No server, no SQLite, no sync in v1.
- `src-tauri/` Rust: dialog (open folder), fs read/write/watch
- `src/` React: tree, editor, preview, search

## 2. Components
- SidebarTree: list dirs + `.md` files, create/rename/delete
- Editor: CodeMirror markdown source
- Preview: react-markdown (split or toggle)
- SearchBar: filename substring + content grep in-memory
- StatusBar: saved / saving / error

Isolation: each reads/writes via `lib/fs.ts` (`readTree`, `readFile`, `writeFile`). No cross-imports.

## 3. Data Flow
1. Onboarding -> `open` dialog -> store vault path in tauri-store
2. `readTree(vault)` -> render
3. Select file -> `readFile` -> editor
4. Type -> 500ms debounce -> `writeFile`
5. External change (watcher) -> toast Reload/Discard

All files plain `.md` UTF-8. File name = title.

## 4. Error Handling
- No vault: onboarding screen, no crash
- Write fail (perm/lock): toast + retry, keep buffer
- Binary/invalid UTF8: show "cannot preview" error
- Never silent data loss: failed save keeps dirty state

## 5. Testing + OSS
- Manual UAT: open folder, CRUD, search, reload, restart persistence
- `ponytail:` no unit framework in v1, single `fs round-trip` script if needed
- MIT LICENSE, README (install/dev/build), CONTRIBUTING, GitHub Actions (tauri build on win/mac/linux)

## Out of Scope (v1)
Tags, favorites, dark mode extra, backlinks, graph, sync, plugins, SQLite. Add when requested.
