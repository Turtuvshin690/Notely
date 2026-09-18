import { useState } from 'react'
import type { ReactNode } from 'react'
import { CaretDown, CaretRight, Clock, FileText, FolderPlus, PencilSimple, Plus, PushPin, Trash } from '@phosphor-icons/react'
import type { TreeNode } from '../lib/fs'
import { createNote, renameNote, removeNote, mkdirDir, parentDir, ensureMd, noteExists } from '../lib/fs'
import Modal from './Modal'
type Props = { vault: string; tree: TreeNode[]; selected?: string | null; pinned?: string[]; recent?: string[]; collapsed?: string[]; onSelect: (p: string) => void; onChanged: () => void; onTogglePin?: (p: string) => void; onToggleCollapse?: (d: string) => void }
type ModalState = null | { kind: 'newNote' | 'newFolder' | 'rename' | 'delete'; dir?: string; node?: TreeNode }
const base = (p: string) => p.split(/[/\\]/).filter(Boolean).pop() ?? p
export default function Sidebar({ vault, tree, selected, pinned, recent, collapsed, onSelect, onChanged, onTogglePin, onToggleCollapse }: Props) {
  const [err, setErr] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const fail = (e: unknown, what: string) => setErr(`${what}: ${e instanceof Error ? e.message : 'failed'}`)
  const paths = new Set<string>()
  const walk = (nodes: TreeNode[]) => { for (const n of nodes) { paths.add(n.path); if (n.children) walk(n.children) } }
  walk(tree)
  const close = () => setModal(null)
  const submitNewNote = async (v: string, dir: string) => {
    const full = `${dir}/${ensureMd(v)}`
    try {
      if (await noteExists(full)) { setErr('Already exists'); return }
      await createNote(full, `# ${v}\n`)
      setErr(null); close(); onChanged()
    } catch (e) { fail(e, 'Create failed') }
  }
  const submitNewFolder = async (v: string, dir: string) => {
    const full = `${dir}/${v.trim()}`
    try {
      if (await noteExists(full)) { setErr('Already exists'); return }
      await mkdirDir(full)
      setErr(null); close(); onChanged()
    } catch (e) { fail(e, 'Create folder failed') }
  }
  const submitRename = async (v: string, node: TreeNode) => {
    const b = parentDir(node.path)
    const dest = node.isDir ? `${b}/${v.trim()}` : `${b}/${ensureMd(v)}`
    if (dest === node.path) { close(); return }
    try {
      if (await noteExists(dest)) { setErr('Already exists'); return }
      await renameNote(node.path, dest)
      setErr(null); close(); onChanged()
    } catch (e) { fail(e, 'Rename failed') }
  }
  const submitDelete = async (node: TreeNode) => {
    try { await removeNote(node.path); setErr(null); close(); onChanged() }
    catch (e) { fail(e, 'Delete failed') }
  }
  const renderNodes = (nodes: TreeNode[], depth: number): ReactNode =>
    nodes.map((n) => {
      const isCollapsed = n.isDir && collapsed?.includes(n.path)
      return (
      <div key={n.path}>
        <div
          className={n.isDir ? 'node node-dir' : `node${selected === n.path ? ' selected' : ''}`}
          onClick={() => !n.isDir && onSelect(n.path)}
          style={{ paddingLeft: 8 + depth * 14 }}
        >
          {!n.isDir && <FileText size={14} className="row-icon" />}
          {n.isDir && (
            <button
              className="icon-btn"
              aria-expanded={!isCollapsed}
              aria-label={isCollapsed ? `Expand ${n.name}` : `Collapse ${n.name}`}
              onClick={(e) => { e.stopPropagation(); onToggleCollapse?.(n.path) }}
            >{isCollapsed ? <CaretRight size={11} /> : <CaretDown size={11} />}</button>
          )}
          <span className="label">{n.name}</span>
          <span className="acts">
            {!n.isDir && onTogglePin && (
              <button className="icon-btn" title={pinned?.includes(n.path) ? 'Unpin' : 'Pin'} onClick={(e) => { e.stopPropagation(); onTogglePin(n.path) }}><PushPin size={14} /></button>
            )}
            <button className="icon-btn" title="Rename" onClick={(e) => { e.stopPropagation(); setModal({ kind: 'rename', node: n }) }}><PencilSimple size={14} /></button>
            <button className="icon-btn danger" title="Delete" onClick={(e) => { e.stopPropagation(); setModal({ kind: 'delete', node: n }) }}><Trash size={14} /></button>
            {n.isDir && <>
              <button className="icon-btn" title="New note here" onClick={(e) => { e.stopPropagation(); setModal({ kind: 'newNote', dir: n.path }) }}><Plus size={14} /></button>
              <button className="icon-btn" title="New folder here" onClick={(e) => { e.stopPropagation(); setModal({ kind: 'newFolder', dir: n.path }) }}><FolderPlus size={14} /></button>
            </>}
          </span>
        </div>
        {n.isDir && !isCollapsed && n.children && renderNodes(n.children, depth + 1)}
      </div>
      )
    })
  const secRow = (p: string, icon: ReactNode) => (
    <div key={p} className="node" title={p} onClick={() => onSelect(p)}>
      {icon}
      <span className="label">{base(p)}</span>
    </div>
  )
  return (
    <>
      <div className="actions-row">
        <button className="btn" onClick={() => setModal({ kind: 'newNote', dir: vault })}><Plus size={14} /> New</button>
        <button className="btn" onClick={() => setModal({ kind: 'newFolder', dir: vault })}><FolderPlus size={14} /> Folder</button>
      </div>
      {err && <div className="alert" role="alert">{err}</div>}
      {pinned && pinned.length > 0 && (
        <div className="side-sec">
          <div className="side-sec-title">Pinned</div>
          {pinned.map((p) => secRow(p, <PushPin size={14} className="row-icon" />))}
        </div>
      )}
      {recent && recent.length > 0 && (
        <div className="side-sec">
          <div className="side-sec-title">Recent</div>
          {recent.map((p) => secRow(p, <Clock size={14} className="row-icon" />))}
        </div>
      )}
      <div className="tree">
        {tree.length === 0 && !err && <div className="tree-empty">No notes yet — create one to begin.</div>}
        {renderNodes(tree, 0)}
      </div>
      {modal?.kind === 'newNote' && modal.dir !== undefined && (
        <Modal
          title="New note" confirmLabel="Create" requireOverwriteConfirm
          isDuplicate={(v) => paths.has(`${modal.dir}/${ensureMd(v)}`)}
          onSubmit={(v) => void submitNewNote(v, modal.dir as string)} onClose={close}
        />
      )}
      {modal?.kind === 'newFolder' && modal.dir !== undefined && (
        <Modal
          title="New folder" placeholder="Folder name" confirmLabel="Create"
          isDuplicate={(v) => paths.has(`${modal.dir}/${v.trim()}`)}
          onSubmit={(v) => void submitNewFolder(v, modal.dir as string)} onClose={close}
        />
      )}
      {modal?.kind === 'rename' && modal.node && (
        <Modal
          title={modal.node.isDir ? 'Rename folder' : 'Rename note'} initialValue={modal.node.name} confirmLabel="Rename" requireOverwriteConfirm={!modal.node.isDir}
          isDuplicate={(v) => {
            const b = parentDir(modal.node!.path)
            const dest = modal.node!.isDir ? `${b}/${v.trim()}` : `${b}/${ensureMd(v)}`
            return dest !== modal.node!.path && paths.has(dest)
          }}
          onSubmit={(v) => void submitRename(v, modal.node as TreeNode)} onClose={close}
        />
      )}
      {modal?.kind === 'delete' && modal.node && (
        <Modal
          title="Delete" confirmLabel="Delete" danger hideInput
          body={`Delete ${modal.node.name}?`}
          onSubmit={() => void submitDelete(modal.node as TreeNode)} onClose={close}
        />
      )}
    </>
  )
}
