import { useEffect, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import ReactMarkdown from 'react-markdown'
// CSP note: tauri.conf.json keeps "csp": null because react-markdown renders
// safe defaults (no rehype-raw / no dangerouslySetInnerHTML), so no raw HTML
// execution path exists. Add a minimal CSP if rehype-raw is ever introduced.
import { readTextFile, writeTextFile } from '../lib/fs'
export default function EditorView({ path }: { path: string }) {
  const [text, setText] = useState('')
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [state, setState] = useState<'saved' | 'saving' | 'error'>('saved')
  const t = useRef<number | undefined>(undefined)
  const pending = useRef<{ path: string; text: string } | null>(null)
  const gen = useRef(0)
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
  const name = path.split(/[/\\]/).pop() ?? path
  return (
    <div className="note">
      <div className="note-bar">
        <span className="note-title" title={path}>{name}</span>
        <div className="segment" role="tablist" aria-label="View mode">
          <button role="tab" aria-selected={mode === 'edit'} className={mode === 'edit' ? 'active' : ''} onClick={() => setMode('edit')}>Write</button>
          <button role="tab" aria-selected={mode === 'preview'} className={mode === 'preview' ? 'active' : ''} onClick={() => setMode('preview')}>Preview</button>
        </div>
        <div className="save-state">
          <span className={`dot ${state}`} />
          <span>{state}</span>
          {state === 'error' && <button className="btn" onClick={retry}>Retry</button>}
        </div>
      </div>
      {mode === 'edit'
        ? <div key="edit" className="pane edit enter"><CodeMirror value={text} extensions={[markdown()]} onChange={onChange} /></div>
        : <div key="preview" className="pane preview enter"><div className="preview-inner"><ReactMarkdown>{text}</ReactMarkdown></div></div>}
    </div>
  )
}
