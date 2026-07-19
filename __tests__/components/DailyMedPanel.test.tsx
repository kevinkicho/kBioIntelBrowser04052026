import { render, screen } from '@testing-library/react'
import { DailyMedPanel } from '@/components/profile/DailyMedPanel'
import type { DrugLabel } from '@/lib/types'

const mockLabels: DrugLabel[] = [
  {
    setId: 'abc-123-def4-5678-90ab-cdef12345678',
    title: 'METFORMIN HYDROCHLORIDE tablet',
    version: '1',
    date: '2024-01-15',
    url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=abc-123-def4-5678-90ab-cdef12345678',
    dailyMedUrl:
      'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=abc-123-def4-5678-90ab-cdef12345678',
    dosageForm: 'TABLET',
    route: 'ORAL',
    labelerName: 'Teva Pharmaceuticals',
    publishedDate: '2024-01-15',
  },
]

describe('DailyMedPanel', () => {
  test('renders label title as deep link to drugInfo.cfm?setid=', () => {
    render(<DailyMedPanel labels={mockLabels} />)
    const link = screen.getByRole('link', { name: /METFORMIN HYDROCHLORIDE tablet/i })
    expect(link).toHaveAttribute(
      'href',
      'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=abc-123-def4-5678-90ab-cdef12345678',
    )
    expect(link.getAttribute('href')).toContain('setid=')
    expect(link.getAttribute('href')).not.toMatch(/dailymed\/?$/)
  })

  test('rebuilds deep link when stored url is homepage but setId present', () => {
    render(
      <DailyMedPanel
        labels={[
          {
            ...mockLabels[0],
            dailyMedUrl: 'https://dailymed.nlm.nih.gov/dailymed/',
            url: 'https://dailymed.nlm.nih.gov/dailymed/',
          },
        ]}
      />,
    )
    const link = screen.getByRole('link', { name: /METFORMIN/i })
    expect(link.getAttribute('href')).toContain(
      'drugInfo.cfm?setid=abc-123-def4-5678-90ab-cdef12345678',
    )
  })

  test('renders labeler name', () => {
    render(<DailyMedPanel labels={mockLabels} />)
    expect(screen.getByText('Teva Pharmaceuticals')).toBeInTheDocument()
  })

  test('renders dosage form and route', () => {
    render(<DailyMedPanel labels={mockLabels} />)
    expect(screen.getByText(/TABLET/)).toBeInTheDocument()
    expect(screen.getByText(/ORAL/)).toBeInTheDocument()
  })

  test('renders empty state when no labels', () => {
    render(<DailyMedPanel labels={[]} />)
    expect(screen.getByText(/no drug label found/i)).toBeInTheDocument()
  })
})
