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

  test('renders disease id and score in table', () => {
    render(<OpenTargetsPanel diseases={mockDiseases} />)
    expect(screen.getByText('EFO_0000311')).toBeInTheDocument()
    expect(screen.getByText('0.95')).toBeInTheDocument()
  })

  test('deep-links to Open Targets disease page', () => {
    render(<OpenTargetsPanel diseases={mockDiseases} />)
    const link = screen.getByRole('link', { name: /Type 2 diabetes mellitus/i })
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('platform.opentargets.org/disease/EFO_0000311'),
    )
  })

  test('renders empty state when no diseases', () => {
    render(<OpenTargetsPanel diseases={[]} />)
    expect(screen.getByText(/no disease associations found/i)).toBeInTheDocument()
  })
})
