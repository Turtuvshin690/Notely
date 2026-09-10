import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Sidebar from './Sidebar'
describe('Sidebar', () => {
  it('renders md nodes', () => {
    render(<Sidebar vault="/v" tree={[{ name: 'a.md', path: '/v/a.md', isDir: false }]} onSelect={() => {}} onChanged={() => {}} />)
    expect(screen.getByText('a.md')).toBeTruthy()
  })
})
