<div align="center">

# 📝 Notely

**Your local notes, simply kept.**

100% free · No account · No cloud · Just Markdown files in a folder you own.

[![Tauri](https://img.shields.io/badge/Tauri-2.x-FFC131?logo=tauri&logoColor=black)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20·%20macOS%20·%20Linux-lightgrey)](https://tauri.app)

</div>

---

## ✨ What you get

| | |
|---|---|
| 📁 **Vault = folder** | Pick any folder. Every note is a plain `.md` file — open them in VS Code, Obsidian, or `notepad`. |
| ✍️ **Edit + live preview** | CodeMirror Markdown editor side-by-side with a clean rendered preview. |
| 💾 **Autosave** | Saves ~500ms after you stop typing. `Saved / Saving / Error` dot with retry — no silent loss. |
| 🔍 **Instant search** | Searches file names *and* contents as you type. |
| 🗂️ **Real file tree** | Create, rename, and delete notes and folders inline. Folders sort first, A→Z. |
| 🌗 **Light / dark** | Follows your OS theme. Warm paper look, no setup. |
| 🔒 **Private by design** | Nothing leaves your machine. Vault path is remembered locally only. |
| 📌 **Pins + recents** | Pin notes to the top; recent files follow you per vault. |
| ✂️ **Split + toolbar** | Write/preview/split, markdown toolbar, `Ctrl+S/E/B/I` shortcuts, word count. |
| 🏷️ **Tags + search v2** | `#tag` filter, snippets, keyboard nav (`↑↓ Enter Esc`). |

## 🚀 Quick start

**Prerequisites:** [Node.js](https://nodejs.org/) + [Rust](https://www.rust-lang.org/tools/install) (Tauri requirement)

```bash
npm install
npm run tauri dev
```

Build a release binary:

```bash
npm run tauri build
```

Web-only preview (no file access — Tauri APIs need the desktop shell):

```bash
npm run dev
```

## 🧠 How it works

1. Click **Open folder** → choose a directory as your vault.
2. Create notes with **+ New**, organize with **+ Folder**.
3. Write Markdown on the left, see it rendered on the right.
4. Files save back to `your-vault/note.md` automatically.

```
your-vault/
├── ideas.md
├── todo.md
└── projects/
    └── launch-plan.md
```

> Bring your own sync: point the vault at a Dropbox / iCloud / Nextcloud folder and your notes follow you.

## 🛠️ Stack

- **Tauri 2** — native shell, `plugin-fs` / `plugin-dialog` / `plugin-store`
- **React 19 + Vite + TypeScript**
- **CodeMirror 6** (`@uiw/react-codemirror`) — editing
- **react-markdown** — preview (no raw HTML by design)
- **Vitest + Testing Library** — `npm run build` typechecks, tests live next to components (`*.test.tsx`)

```
src/
├── App.tsx            # vault pick + shell
├── components/        # Sidebar, EditorView, SearchBar
├── lib/fs.ts          # all file ops in one place
└── index.css          # theme (CSS vars, light/dark)
```

## 🤝 Contributing

Issues and PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## 📄 License

MIT — see [LICENSE](LICENSE).
