import { render, screen } from '@testing-library/react'
import { MoleculeViewer3D } from '@/components/profile/MoleculeViewer3D'

describe('MoleculeViewer3D', () => {
  it('renders iframe with correct src', () => {
    render(<MoleculeViewer3D cid={2244} name="Aspirin" />)
    const iframe = screen.getByTitle('3D structure of Aspirin')
    expect(iframe).toBeInTheDocument()
    expect(iframe.getAttribute('src')).toContain('2244')
  })
})
