import { render, screen, waitFor } from '@testing-library/react'
import { MoleculeViewer3D } from '@/components/profile/MoleculeViewer3D'

jest.mock('@/lib/api/pubchem3d', () => ({
  probePubChem3dClient: jest.fn(),
  hasPubChem3dConformer: jest.fn(),
}))

jest.mock('@/lib/productEvents', () => ({
  emitProductEvent: jest.fn(),
}))

import { probePubChem3dClient } from '@/lib/api/pubchem3d'

const mockProbe = probePubChem3dClient as jest.MockedFunction<typeof probePubChem3dClient>

describe('MoleculeViewer3D', () => {
  beforeEach(() => {
    mockProbe.mockReset()
  })

  it('renders MolView iframe when 3D conformer exists', async () => {
    mockProbe.mockResolvedValue(true)
    render(<MoleculeViewer3D cid={2244} name="Aspirin" />)
    expect(screen.getByTestId('molecule-viewer-checking')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByTitle('3D structure of Aspirin')).toBeInTheDocument()
    })
    const iframe = screen.getByTitle('3D structure of Aspirin')
    expect(iframe.getAttribute('src')).toContain('2244')
    expect(iframe.getAttribute('src')).toContain('embed.molview.org')
  })

  it('falls back to 2D when PubChem has no 3D conformer', async () => {
    mockProbe.mockResolvedValue(false)
    render(
      <MoleculeViewer3D
        cid={121493436}
        name="Big peptide"
        fallbackImageUrl="https://example.com/2d.png"
      />,
    )
    await waitFor(() => {
      expect(screen.getByTestId('molecule-viewer-fallback')).toBeInTheDocument()
    })
    expect(screen.getByText(/No 3D model/i)).toBeInTheDocument()
    expect(screen.queryByTitle(/3D structure/i)).not.toBeInTheDocument()
  })

  it('uses parent has3d=false without probing', async () => {
    render(
      <MoleculeViewer3D cid={1} name="X" has3d={false} fallbackImageUrl="https://example.com/x.png" />,
    )
    await waitFor(() => {
      expect(screen.getByTestId('molecule-viewer-fallback')).toBeInTheDocument()
    })
    expect(mockProbe).not.toHaveBeenCalled()
  })
})
