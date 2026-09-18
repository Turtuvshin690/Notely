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
