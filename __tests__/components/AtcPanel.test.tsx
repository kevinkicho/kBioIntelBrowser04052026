import { render, screen } from '@testing-library/react'
import { AtcPanel } from '@/components/profile/AtcPanel'
import type { AtcClassification } from '@/lib/types'

const mockClassifications: AtcClassification[] = [
  {
    code: 'A10BA02',
    name: 'metformin',
    classType: 'ATC1-4',
    url: 'https://atcddd.fhi.no/atc_ddd_index/?code=A10BA02&showdescription=yes',
  },
  {
    code: 'A10BA',
    name: 'Biguanides',
    classType: 'ATC1-4',
    url: 'https://atcddd.fhi.no/atc_ddd_index/?code=A10BA&showdescription=yes',
  },
]

describe('AtcPanel', () => {
  test('renders table column headers (no Open column)', () => {
    render(<AtcPanel classifications={mockClassifications} />)
    expect(screen.getByText('Code')).toBeInTheDocument()
    expect(screen.getByText('Class name')).toBeInTheDocument()
    expect(screen.getByText('Level')).toBeInTheDocument()
    expect(screen.queryByText('Open')).not.toBeInTheDocument()
    expect(screen.queryByText('View ↗')).not.toBeInTheDocument()
  })

  test('renders ATC codes and names', () => {
    render(<AtcPanel classifications={mockClassifications} />)
    expect(screen.getByText('A10BA02')).toBeInTheDocument()
    expect(screen.getByText('metformin')).toBeInTheDocument()
    expect(screen.getByText('Biguanides')).toBeInTheDocument()
  })

  test('each row is a deep link to WHO ATC/DDD Index', () => {
    render(<AtcPanel classifications={mockClassifications} />)
    const row = screen.getByRole('link', { name: /A10BA02/i })
    expect(row).toHaveAttribute(
      'href',
      'https://atcddd.fhi.no/atc_ddd_index/?code=A10BA02&showdescription=yes',
    )
    expect(row).toHaveAttribute('target', '_blank')
  })

  test('builds deep link when url omitted', () => {
    render(
      <AtcPanel
        classifications={[{ code: 'N02BE01', name: 'paracetamol', classType: 'ATC1-4' }]}
      />,
    )
    expect(screen.getByRole('link', { name: /N02BE01/i })).toHaveAttribute(
      'href',
      'https://atcddd.fhi.no/atc_ddd_index/?code=N02BE01&showdescription=yes',
    )
  })

  test('shows hierarchy level labels', () => {
    render(<AtcPanel classifications={mockClassifications} />)
    expect(screen.getAllByText(/Level 5/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Level 4/).length).toBeGreaterThanOrEqual(1)
  })

  test('empty state', () => {
    render(<AtcPanel classifications={[]} />)
    expect(screen.getByText(/no atc classification found/i)).toBeInTheDocument()
  })

  test('collapses duplicate list rows with the same ATC code (RxClass multi-relation cache)', () => {
    const dups: AtcClassification[] = Array.from({ length: 5 }, () => ({
      code: 'L01EK',
      name: 'Vascular endothelial growth factor receptor (VEGFR) tyrosine kinase inhibitors',
      classType: 'ATC1-4',
      url: 'https://atcddd.fhi.no/atc_ddd_index/?code=L01EK&showdescription=yes',
    }))
    render(<AtcPanel classifications={dups} />)
    expect(screen.getAllByText('L01EK')).toHaveLength(1)
    expect(
      screen.getAllByRole('link', {
        name: /L01EK.*VEGFR/i,
      }),
    ).toHaveLength(1)
  })
})
