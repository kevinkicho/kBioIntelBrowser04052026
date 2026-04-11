import { render, screen } from '@testing-library/react'
import { OpenTargetsPanel } from '@/components/profile/OpenTargetsPanel'
import type { DiseaseAssociation } from '@/lib/types'

const mockDiseases: DiseaseAssociation[] = [
  {
    diseaseId: 'EFO_0000311',
    diseaseName: 'Type 2 diabetes mellitus',
    score: 0.95,
    evidenceCount: 15,
    sources: ['OpenTargets', 'ClinVar'],
    therapeuticAreas: ['Metabolic disease'],
  },
]

describe('OpenTargetsPanel', () => {
  test('renders disease name', () => {
    render(<OpenTargetsPanel diseases={mockDiseases} />)
    expect(screen.getByText('Type 2 diabetes mellitus')).toBeInTheDocument()
  })

  test('renders therapeutic area', () => {
    render(<OpenTargetsPanel diseases={mockDiseases} />)
    expect(screen.getByText('Metabolic disease')).toBeInTheDocument()
  })

  test('renders empty state when no diseases', () => {
    render(<OpenTargetsPanel diseases={[]} />)
    expect(screen.getByText(/no disease associations found/i)).toBeInTheDocument()
  })
})
