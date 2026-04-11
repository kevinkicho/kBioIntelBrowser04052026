import { render, screen } from '@testing-library/react'
import { EbiProteinsPanel } from '@/components/profile/EbiProteinsPanel'
import type { ProteinVariation, ProteomicsMapping, CrossReference } from '@/lib/api/ebi-proteins-variation'

const mockVariations: ProteinVariation = {
  accession: 'P12821',
  entryName: 'ACE_HUMAN',
  geneName: 'ACE',
  variations: [
    {
      type: 'MUTATION',
      source: 'ClinVar',
      sourceId: '12345',
      location: { start: 361, end: 361 },
      sequenceVariation: { type: 'MISSENSE', sequence: 'R361C' },
      clinicalSignificance: 'Pathogenic',
      frequency: { value: 0.001, population: 'European' },
    },
    {
      type: 'DELETION',
      source: 'gnomAD',
      sourceId: 'rs123456',
      location: { start: 520, end: 525 },
    },
  ],
}

const mockProteomics: ProteomicsMapping = {
  accession: 'P12821',
  entryName: 'ACE_HUMAN',
  proteomicsData: [
    {
      proteinId: 'P12821',
      peptideCount: 45,
      uniquePeptideCount: 32,
      coverage: 0.65,
      experiments: ['EXP001', 'EXP002'],
    },
  ],
}

const mockCrossReferences: CrossReference = {
  accession: 'P12821',
  entryName: 'ACE_HUMAN',
  crossReferences: [
    { database: 'UniProt', id: 'P12821', url: 'https://www.uniprot.org/uniprot/P12821' },
    { database: 'PDB', id: '1ABC', url: 'https://www.rcsb.org/structure/1ABC' },
  ],
}

describe('EbiProteinsPanel', () => {
  test('renders variation badges', () => {
    render(<EbiProteinsPanel variations={mockVariations} panelId="test" />)
    expect(screen.getByText('MUTATION')).toBeInTheDocument()
    expect(screen.getByText('DELETION')).toBeInTheDocument()
  })

  test('renders clinical significance', () => {
    render(<EbiProteinsPanel variations={mockVariations} panelId="test" />)
    expect(screen.getByText('Clinical: Pathogenic')).toBeInTheDocument()
  })

  test('renders position ranges', () => {
    render(<EbiProteinsPanel variations={mockVariations} panelId="test" />)
    expect(screen.getByText(/361.*361/)).toBeInTheDocument()
    expect(screen.getByText(/520.*525/)).toBeInTheDocument()
  })

  test('renders proteomics data', () => {
    render(<EbiProteinsPanel proteomics={mockProteomics} panelId="test" />)
    expect(screen.getByText('P12821')).toBeInTheDocument()
    expect(screen.getByText('45')).toBeInTheDocument()
    expect(screen.getByText(/65\.0%/)).toBeInTheDocument()
  })

  test('renders cross-references', () => {
    render(<EbiProteinsPanel crossReferences={mockCrossReferences} panelId="test" />)
    expect(screen.getByText('UniProt: P12821')).toBeInTheDocument()
    expect(screen.getByText('PDB: 1ABC')).toBeInTheDocument()
  })

  test('renders empty state when no data', () => {
    render(<EbiProteinsPanel panelId="test" />)
    expect(screen.getByText(/no variation, proteomics, or cross-reference data available/i)).toBeInTheDocument()
  })
})
