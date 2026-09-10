import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Sidebar from './Sidebar'
const noop = () => {}
describe('Sidebar', () => {
  it('renders md nodes', () => {
    render(<Sidebar vault="/v" tree={[{ name: 'a.md', path: '/v/a.md', isDir: false }]} onSelect={noop} onChanged={noop} />)
    expect(screen.getByText('a.md')).toBeTruthy()
  })
  it('renders nested dirs recursively', () => {
    render(<Sidebar vault="/v" tree={[{ name: 'sub', path: '/v/sub', isDir: true, children: [
      { name: 'deep', path: '/v/sub/deep', isDir: true, children: [
        { name: 'n.md', path: '/v/sub/deep/n.md', isDir: false },
      ] },
    ] }]} onSelect={noop} onChanged={noop} />)
    expect(screen.getByText('n.md')).toBeTruthy()
  })
})
