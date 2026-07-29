import { render, screen } from '@testing-library/react'
import { UniProtExtendedPanel } from '@/components/profile/UniProtExtendedPanel'
import type { UniProtProtein } from '@/lib/types'
import { extractUniProtProteinName } from '@/lib/api/uniprot'
import { safeDisplayString } from '@/lib/reactSafe'

describe('UniProtExtendedPanel', () => {
  it('renders string protein names', () => {
    const proteins: UniProtProtein[] = [
      {
        accession: 'P00734',
        id: 'THRB_HUMAN',
        proteinName: 'Prothrombin',
        geneName: 'F2',
        organism: 'Homo sapiens',
        length: 622,
        sequence: 'M',
        function: 'Cleaves fibrinogen',
      },
    ]
    render(<UniProtExtendedPanel proteins={proteins} />)
    expect(screen.getByText('Prothrombin')).toBeInTheDocument()
    expect(screen.getByText('F2')).toBeInTheDocument()
  })

  it('does not crash when proteinName is a nested UniProt object (React #31)', () => {
    const nested = {
      recommendedName: { fullName: { value: 'Prothrombin' } },
      alternativeNames: [{ fullName: { value: 'Factor II' } }],
    }
    // Simulate bad DTO that slipped past the mapper
    const proteins = [
      {
        accession: 'P00734',
        id: 'THRB_HUMAN',
        proteinName: nested as unknown as string,
        geneName: 'F2',
        organism: 'Homo sapiens',
        length: 622,
        sequence: 'M',
      },
    ] as UniProtProtein[]

    expect(() => render(<UniProtExtendedPanel proteins={proteins} />)).not.toThrow()
    // safeDisplayString extracts recommendedName.fullName.value when nested
    expect(screen.getByText('Prothrombin')).toBeInTheDocument()
  })

  it('mapper + safeDisplayString keep display string-only', () => {
    const nested = {
      recommendedName: { fullName: { value: 'Prothrombin' } },
      alternativeNames: [{ fullName: { value: 'Factor II' } }],
    }
    expect(extractUniProtProteinName(nested)).toBe('Prothrombin')
    expect(safeDisplayString(nested)).toBe('Prothrombin')
  })

  it('empty list shows empty panel chrome', () => {
    render(<UniProtExtendedPanel proteins={[]} />)
    expect(screen.getByText(/UniProt Extended/i)).toBeInTheDocument()
  })
})
