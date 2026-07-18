import { render, screen, waitFor } from '@testing-library/react'
import { CompetitiveLandscape } from '@/components/profile/CompetitiveLandscape'
import type { ChemblActivity } from '@/lib/types'

jest.mock('@/lib/clientFetch', () => ({
  clientFetch: jest.fn(),
}))

import { clientFetch } from '@/lib/clientFetch'

const activities: ChemblActivity[] = [
  {
    activityId: '1',
    targetName: 'Prostaglandin G/H synthase 2',
    targetOrganism: 'Homo sapiens',
    targetChemblId: 'CHEMBL230',
    chemblId: 'CHEMBL25',
    assayType: 'B',
    standardType: 'IC50',
    standardValue: 100,
    standardUnits: 'nM',
    pchemblValue: 7,
    activityType: 'IC50',
    activityValue: 100,
    activityUnits: 'nM',
    url: '',
  },
]

describe('CompetitiveLandscape', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  test('renders dense table rows with name, phase, potency and deep link', async () => {
    ;(clientFetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [
        {
          compoundId: 'CHEMBL118',
          compoundName: 'Celecoxib',
          name: 'Celecoxib',
          chemblId: 'CHEMBL118',
          maxPhase: 4,
          activityValue: 40,
          activityUnits: 'nM',
          activityType: 'IC50',
          pchemblValue: 7.4,
          similarity: 100,
          relationship: 'Related',
          url: 'https://www.ebi.ac.uk/chembl/explore/compound/CHEMBL118',
        },
        {
          compoundId: 'CHEMBL25',
          compoundName: 'Aspirin',
          name: 'Aspirin',
          chemblId: 'CHEMBL25',
          maxPhase: 4,
          activityValue: 1000,
          activityUnits: 'nM',
          activityType: 'IC50',
          similarity: 100,
          relationship: 'Related',
        },
      ],
    })

    render(
      <CompetitiveLandscape activities={activities} currentChemblId="CHEMBL25" />,
    )

    await waitFor(() => {
      expect(screen.getByText('Celecoxib')).toBeInTheDocument()
    })

    // Current molecule filtered out
    expect(screen.queryByText('Aspirin')).not.toBeInTheDocument()

    // Column headers (table appearance)
    expect(screen.getByText('Compound')).toBeInTheDocument()
    expect(screen.getByText('Phase')).toBeInTheDocument()
    expect(screen.getByText('Potency')).toBeInTheDocument()

    // Filled fields — not empty phase / active placeholders
    expect(screen.getByText('Approved')).toBeInTheDocument()
    expect(screen.getByText(/pChEMBL 7\.4|40 nM/)).toBeInTheDocument()

    const row = screen.getByRole('link', { name: /Celecoxib/i })
    expect(row).toHaveAttribute('href', expect.stringContaining('CHEMBL118'))
  })

  test('shows dash for missing phase instead of Phase 0', async () => {
    ;(clientFetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [
        {
          compoundId: 'CHEMBL999',
          compoundName: 'CHEMBL999',
          name: 'CHEMBL999',
          chemblId: 'CHEMBL999',
          maxPhase: 0,
          activityValue: 12,
          activityUnits: 'nM',
          activityType: 'IC50',
          similarity: 100,
          relationship: 'Related',
        },
      ],
    })

    render(
      <CompetitiveLandscape activities={activities} currentChemblId="CHEMBL25" />,
    )

    await waitFor(() => {
      expect(screen.getByText('CHEMBL999')).toBeInTheDocument()
    })
    expect(screen.queryByText(/Phase 0/i)).not.toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByText('12 nM')).toBeInTheDocument()
  })
})
