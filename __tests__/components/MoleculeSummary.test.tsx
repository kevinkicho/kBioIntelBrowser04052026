import { render, screen, fireEvent } from '@testing-library/react'
import { MoleculeSummary } from '@/components/profile/MoleculeSummary'
import type { MoleculeSummaryData } from '@/lib/moleculeSummary'

const mockData: MoleculeSummaryData = {
  cards: [
    {
      id: 'approval',
      title: 'Approval & Products',
      icon: '✅',
      accentColor: 'border-t-emerald-500',
      categoryId: 'pharmaceutical',
      primaryLabel: 'Approved Products',
      primaryValue: 5,
      secondaryMetrics: [
        { label: 'NDC Codes', value: 12 },
        { label: 'Orange Book', value: 3 },
        { label: 'Drug Labels', value: 7 },
      ],
    },
    {
      id: 'safety',
      title: 'Safety Signals',
      icon: '⚠️',
      accentColor: 'border-t-red-500',
      categoryId: 'clinical-safety',
      primaryLabel: 'Adverse Events',
      primaryValue: 42,
      secondaryMetrics: [
        { label: 'Serious Events', value: 10 },
        { label: 'Recalls', value: 2 },
      ],
    },
    {
      id: 'clinical',
      title: 'Clinical Pipeline',
      icon: '🔬',
      accentColor: 'border-t-blue-500',
      categoryId: 'clinical-safety',
      primaryLabel: 'Active Trials',
      primaryValue: 8,
      secondaryMetrics: [
        { label: 'Phases', value: 'P1: 2 · P2: 3 · P3: 1' },
        { label: 'Indications', value: 4 },
      ],
    },
    {
      id: 'research',
      title: 'Research Activity',
      icon: '📊',
      accentColor: 'border-t-amber-500',
      categoryId: 'research-literature',
      primaryLabel: 'Publications',
      primaryValue: 120,
      secondaryMetrics: [
        { label: 'NIH Grants', value: 5 },
        { label: 'Patents', value: 9 },
        { label: 'Total Citations', value: 3400 },
      ],
    },
    {
      id: 'biological',
      title: 'Biological Profile',
      icon: '🎯',
      accentColor: 'border-t-violet-500',
      categoryId: 'bioactivity-targets',
      primaryLabel: 'Known Targets',
      primaryValue: 15,
      secondaryMetrics: [
        { label: 'Mechanisms', value: 3 },
        { label: 'Pathways', value: 22 },
        { label: 'Drug-Gene', value: 8 },
      ],
    },
    {
      id: 'structural',
      title: 'Structural Data',
      icon: '🧬',
      accentColor: 'border-t-cyan-500',
      categoryId: 'protein-structure',
      primaryLabel: 'Protein Targets',
      primaryValue: 4,
      secondaryMetrics: [
        { label: '3D Structures', value: 10 },
        { label: 'AlphaFold', value: 2 },
        { label: 'Domains', value: 6 },
      ],
    },
  ],
}

describe('MoleculeSummary', () => {
  const mockOnCategoryClick = jest.fn()

  beforeEach(() => {
    mockOnCategoryClick.mockClear()
  })

  it('renders all 6 cards with their titles', () => {
    render(
      <MoleculeSummary data={mockData} onCategoryClick={mockOnCategoryClick} />
    )
    expect(screen.getByText('Approval & Products')).toBeInTheDocument()
    expect(screen.getByText('Safety Signals')).toBeInTheDocument()
    expect(screen.getByText('Clinical Pipeline')).toBeInTheDocument()
    expect(screen.getByText('Research Activity')).toBeInTheDocument()
    expect(screen.getByText('Biological Profile')).toBeInTheDocument()
    expect(screen.getByText('Structural Data')).toBeInTheDocument()
  })

  it('shows primary values', () => {
    render(
      <MoleculeSummary data={mockData} onCategoryClick={mockOnCategoryClick} />
    )
    // Some values may appear in multiple places (e.g. "5" as primary and secondary)
    expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getAllByText('8').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1)
  })

  it('shows secondary metrics', () => {
    render(
      <MoleculeSummary data={mockData} onCategoryClick={mockOnCategoryClick} />
    )
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('NDC Codes')).toBeInTheDocument()
    expect(screen.getByText('P1: 2 · P2: 3 · P3: 1')).toBeInTheDocument()
    expect(screen.getByText('3400')).toBeInTheDocument()
  })

  it('calls onCategoryClick with correct categoryId when card clicked', () => {
    render(
      <MoleculeSummary data={mockData} onCategoryClick={mockOnCategoryClick} />
    )
    fireEvent.click(screen.getByText('Approval & Products'))
    expect(mockOnCategoryClick).toHaveBeenCalledWith('pharmaceutical')

    fireEvent.click(screen.getByText('Safety Signals'))
    expect(mockOnCategoryClick).toHaveBeenCalledWith('clinical-safety')

    fireEvent.click(screen.getByText('Research Activity'))
    expect(mockOnCategoryClick).toHaveBeenCalledWith('research-literature')
  })

  it('handles zero values display', () => {
    const zeroData: MoleculeSummaryData = {
      cards: [
        {
          id: 'approval',
          title: 'Approval & Products',
          icon: '✅',
          accentColor: 'border-t-emerald-500',
          categoryId: 'pharmaceutical',
          primaryLabel: 'Approved Products',
          primaryValue: 0,
          secondaryMetrics: [
            { label: 'NDC Codes', value: 0 },
          ],
        },
      ],
    }
    render(
      <MoleculeSummary data={zeroData} onCategoryClick={mockOnCategoryClick} />
    )
    const zeros = screen.getAllByText('0')
    expect(zeros.length).toBeGreaterThanOrEqual(2) // primary + secondary
  })
})
