import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataHubLedgerView } from '@/components/dataHub/DataHubLedger'
import { buildMoleculeDataHub } from '@/lib/dataHub'

// Prefs / localStorage hooks
beforeEach(() => {
  Storage.prototype.getItem = jest.fn(() => null)
  Storage.prototype.setItem = jest.fn()
})

describe('DataHubLedgerView', () => {
  const ledger = buildMoleculeDataHub(
    {
      cid: 2244,
      name: 'Aspirin',
      formula: 'C9H8O4',
      molecularWeight: 180.16,
      inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
      cas: '50-78-2',
    },
    {
      clinicalTrials: [
        {
          nctId: 'NCT00000001',
          phase: 'PHASE3',
          status: 'COMPLETED',
          conditions: ['Pain'],
          sponsor: 'Acme',
        },
      ],
      drugGeneInteractions: [{ geneSymbol: 'PTGS2', interactionType: 'inhibitor' }],
    },
  )

  it('renders data hub with identity facts and section layout', () => {
    render(
      <DataHubLedgerView
        ledger={ledger}
        testId="hub"
        showPrefsBar={false}
        showShelves={false}
        showResearchKit={false}
      />,
    )
    expect(screen.getByTestId('hub')).toBeInTheDocument()
    expect(screen.getByText('Data hub')).toBeInTheDocument()
    expect(screen.getByTestId('hub-counts')).toHaveTextContent(/facts/)
    // Identity row values
    expect(screen.getByText('Aspirin')).toBeInTheDocument()
    expect(screen.getByText('2244')).toBeInTheDocument()
  })

  it('exposes section test ids for multi-source groups', () => {
    render(
      <DataHubLedgerView
        ledger={ledger}
        testId="hub"
        showPrefsBar={false}
        showShelves={false}
        showResearchKit={false}
      />,
    )
    expect(screen.getByTestId('hub-section-identity')).toBeInTheDocument()
  })

  it('renders source directory under full density', () => {
    render(
      <DataHubLedgerView
        ledger={ledger}
        density="full"
        testId="hub"
        showPrefsBar={false}
        showShelves={false}
        showResearchKit={false}
      />,
    )
    expect(screen.getByTestId('hub-sources')).toBeInTheDocument()
  })

  it('toggles hide empty without crashing', async () => {
    const user = userEvent.setup()
    render(
      <DataHubLedgerView
        ledger={ledger}
        testId="hub"
        showPrefsBar={false}
        showShelves={false}
        showResearchKit={false}
      />,
    )
    const btn = screen.getByTestId('hub-toggle-empty')
    await user.click(btn)
    expect(btn).toBeInTheDocument()
  })

  it('export CSV button is present', () => {
    render(
      <DataHubLedgerView
        ledger={ledger}
        testId="hub"
        showPrefsBar={false}
        showShelves={false}
        showResearchKit={false}
      />,
    )
    expect(screen.getByTestId('hub-export-csv')).toBeInTheDocument()
    expect(screen.getByTestId('hub-export-tsv')).toBeInTheDocument()
  })
})
