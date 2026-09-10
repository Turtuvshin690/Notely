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
