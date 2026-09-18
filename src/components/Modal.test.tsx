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
