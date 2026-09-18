import { useEffect, useMemo, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import ReactMarkdown from 'react-markdown'
// CSP note: tauri.conf.json keeps "csp": null because react-markdown renders
// safe defaults (no rehype-raw / no dangerouslySetInnerHTML), so no raw HTML
// execution path exists. Add a minimal CSP if rehype-raw is ever introduced.
import { readTextFile, writeTextFile } from '../lib/fs'
export default function EditorView({ path }: { path: string }) {
  const [text, setText] = useState('')
  const [mode, setMode] = useState<'edit' | 'preview' | 'split'>('edit')
  const [state, setState] = useState<'saved' | 'saving' | 'error'>('saved')
  const t = useRef<number | undefined>(undefined)
  const pending = useRef<{ path: string; text: string } | null>(null)
  const gen = useRef(0)
  const cmRef = useRef<ReactCodeMirrorRef>(null)
  useEffect(() => {
    const g = ++gen.current
    let live = true
    window.clearTimeout(t.current)
    readTextFile(path).then((c) => { if (live && gen.current === g) { setText(c); setState('saved') } })
      .catch(() => { if (live && gen.current === g) setState('error') })
    return () => {
      live = false
      // path change / unmount: cancel debounce, flush pending draft to its own file (no silent loss)
      window.clearTimeout(t.current)
      const p = pending.current
      pending.current = null
      if (p) writeTextFile(p.path, p.text).catch(() => {})
    }
  }, [path])
  const schedule = (p: string, v: string) => {
    const g = gen.current
    window.clearTimeout(t.current)
    t.current = window.setTimeout(async () => {
      try { await writeTextFile(p, v); pending.current = null; if (gen.current === g) setState('saved') }
      catch { if (gen.current === g) setState('error') }
    }, 500)
  }
  const onChange = (v: string) => {
    setText(v); setState('saving')
    pending.current = { path, text: v }
    schedule(path, v)
  }
  const retry = async () => {
    const p = pending.current ?? { path, text }
    setState('saving')
    try { await writeTextFile(p.path, p.text); pending.current = null; setState('saved') }
    catch { setState('error') }
  }
  const words = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text])
  const chars = text.length
  // toolbar helpers (operate on cm view if present, else string fallback on whole text):
  const wrapSelection = (before: string, after: string) => {
    const view = cmRef.current?.view
    if (!view) { onChange(`${before}${text || 'text'}${after}`); return }
    const { from, to } = view.state.selection.main
    const sel = view.state.sliceDoc(from, to) || 'text'
    view.dispatch({ changes: { from, to, insert: `${before}${sel}${after}` } })
    view.focus()
  }
  const prefixLines = (prefix: string) => {
    const view = cmRef.current?.view
    if (!view) { onChange(text.split('\n').map((l) => `${prefix}${l}`).join('\n')); return }
    const { from, to } = view.state.selection.main
    const startLine = view.state.doc.lineAt(from).number
    const endLine = view.state.doc.lineAt(to).number
    const changes = []
    for (let n = startLine; n <= endLine; n++) {
      const line = view.state.doc.line(n)
      changes.push({ from: line.from, to: line.from, insert: prefix })
    }
    view.dispatch({ changes })
    view.focus()
  }
  const cycleMode = () => setMode((m) => (m === 'edit' ? 'preview' : m === 'preview' ? 'split' : 'edit'))
  // shortcuts on wrapper div onKeyDown:
  const onKey = (e: React.KeyboardEvent) => {
    // Modal renders inside Sidebar aside but EditorView stays mounted — ignore its keys
    if ((e.target as HTMLElement).closest?.('[role="dialog"]')) return
    const mod = e.ctrlKey || e.metaKey
    if (!mod) return
    if (e.key.toLowerCase() === 's') { e.preventDefault(); void retry() }
    if (e.key.toLowerCase() === 'e') { e.preventDefault(); cycleMode() }
    if (e.key.toLowerCase() === 'b') { e.preventDefault(); wrapSelection('**', '**') }
    if (e.key.toLowerCase() === 'i') { e.preventDefault(); wrapSelection('_', '_') }
  }
  const name = path.split(/[/\\]/).pop() ?? path
  return (
    <div className="note" onKeyDown={onKey}>
      <div className="note-bar">
        <span className="note-title" title={path}>{name}</span>
        <div className="segment" role="tablist" aria-label="View mode">
          <button role="tab" aria-selected={mode === 'edit'} className={mode === 'edit' ? 'active' : ''} onClick={() => setMode('edit')}>Write</button>
          <button role="tab" aria-selected={mode === 'preview'} className={mode === 'preview' ? 'active' : ''} onClick={() => setMode('preview')}>Preview</button>
          <button role="tab" aria-selected={mode === 'split'} className={mode === 'split' ? 'active' : ''} onClick={() => setMode('split')}>Split</button>
        </div>
        <div className="save-state">
          <span className="status-counts">{words} words · {chars} chars</span>
          <span className={`dot ${state}`} />
          <span>{state}</span>
          {state === 'error' && <button className="btn" onClick={retry}>Retry</button>}
        </div>
      </div>
      {(mode === 'edit' || mode === 'split') && (
        <div className="toolbar" role="toolbar" aria-label="Formatting">
          <button className="icon-btn" title="Bold (Ctrl+B)" aria-label="Bold" onClick={() => wrapSelection('**', '**')}>B</button>
          <button className="icon-btn" title="Italic (Ctrl+I)" aria-label="Italic" onClick={() => wrapSelection('_', '_')}>I</button>
          <button className="icon-btn" title="Heading" aria-label="Heading" onClick={() => prefixLines('## ')}>H</button>
          <button className="icon-btn" title="List" aria-label="List" onClick={() => prefixLines('- ')}>•</button>
          <button className="icon-btn" title="Quote" aria-label="Quote" onClick={() => prefixLines('> ')}>&gt;</button>
          <button className="icon-btn" title="Link" aria-label="Link" onClick={() => wrapSelection('[', '](url)')}>🔗</button>
          <button className="icon-btn" title="Code" aria-label="Code" onClick={() => wrapSelection('`', '`')}>&lt;&gt;</button>
        </div>
      )}
      {mode === 'split'
        ? <div className="split"><div className="pane split-edit"><CodeMirror ref={cmRef} value={text} extensions={[markdown()]} onChange={onChange} /></div><div className="pane split-preview"><div className="preview-inner"><ReactMarkdown>{text}</ReactMarkdown></div></div></div>
        : mode === 'edit' ? <div key="edit" className="pane edit enter"><CodeMirror ref={cmRef} value={text} extensions={[markdown()]} onChange={onChange} /></div>
        : <div key="preview" className="pane preview enter"><div className="preview-inner"><ReactMarkdown>{text}</ReactMarkdown></div></div>}
    </div>
  )
}
