import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SourceDirectoryPanel } from '@/components/dataHub/SourceDirectoryPanel'
import { buildMoleculeDataHub, buildSourceDirectory } from '@/lib/dataHub'

describe('SourceDirectoryPanel', () => {
  const ledger = buildMoleculeDataHub(
    { cid: 2244, name: 'Aspirin', formula: 'C9H8O4' },
    {
      clinicalTrials: [{ nctId: 'NCT1' }],
      adverseEvents: [{ reactionName: 'Nausea', count: 2 }],
    },
  )
  const directory = buildSourceDirectory(ledger)

  it('renders multi-column grid of sources with data', () => {
    render(<SourceDirectoryPanel directory={directory} testId="sd" />)
    expect(screen.getByTestId('sd-grid')).toBeInTheDocument()
    expect(screen.getByText(/with data/i)).toBeInTheDocument()
  })

  it('hides empty sources until toggle', async () => {
    const user = userEvent.setup()
    // Directory may only have with-data rows depending on hub builder;
    // when empty entries exist, toggle should appear
    const emptyish = {
      ...directory,
      entries: [
        ...directory.entries,
        {
          id: 'empty-source',
          source: 'Empty API',
          api: 'empty',
          factCount: 0,
          status: 'empty' as const,
          sampleFacts: [],
          panelIds: [],
          categoryIds: [],
          docs: undefined,
        },
      ],
      total: directory.total + 1,
    }
    render(<SourceDirectoryPanel directory={emptyish} testId="sd" />)
    expect(screen.queryByTestId('sd-row-empty-source')).not.toBeInTheDocument()
    const toggle = screen.getByTestId('sd-toggle-empty')
    await user.click(toggle)
    expect(screen.getByTestId('sd-row-empty-source')).toBeInTheDocument()
  })
})
