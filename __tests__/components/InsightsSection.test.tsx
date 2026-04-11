import { render, screen } from '@testing-library/react'
import { InsightsSection } from '@/components/profile/InsightsSection'

// Mock all 4 chart components as simple divs with data-testid
jest.mock('@/components/charts/TrialPhaseChart', () => ({
  TrialPhaseChart: () => <div data-testid="trial-phase-chart" />,
}))
jest.mock('@/components/charts/AdverseEventChart', () => ({
  AdverseEventChart: () => <div data-testid="adverse-event-chart" />,
}))
jest.mock('@/components/charts/BioactivityChart', () => ({
  BioactivityChart: () => <div data-testid="bioactivity-chart" />,
}))
jest.mock('@/components/charts/PublicationTimeline', () => ({
  PublicationTimeline: () => <div data-testid="publication-timeline" />,
}))

describe('InsightsSection', () => {
  test('renders nothing when no data (empty object)', () => {
    const { container } = render(<InsightsSection data={{}} />)
    expect(container.firstChild).toBeNull()
  })

  test('renders trial chart when clinicalTrials data exists', () => {
    const data = {
      clinicalTrials: [
        { nctId: 'NCT001', title: 'Trial A', phase: 'Phase 1', status: 'RECRUITING', sponsor: 'Sponsor A', startDate: '2020-01-01', conditions: [] },
      ],
    }
    render(<InsightsSection data={data} />)
    expect(screen.getByTestId('trial-phase-chart')).toBeInTheDocument()
  })

  test('renders multiple charts when multiple data sources loaded', () => {
    const data = {
      clinicalTrials: [
        { nctId: 'NCT001', title: 'Trial A', phase: 'Phase 1', status: 'RECRUITING', sponsor: 'Sponsor A', startDate: '2020-01-01', conditions: [] },
      ],
      adverseEvents: [
        { safetyReportId: 'AR001', receiveDate: '2021-01-01', serious: true, reactions: [], drugs: [] },
      ],
      chemblActivities: [
        { activityId: 'A001', targetName: 'Target 1', standardType: 'IC50', standardValue: 10, standardUnits: 'nM', assayDescription: 'Assay', targetChemblId: 'CHEMBL001' },
      ],
      literature: [
        { pmid: '12345', title: 'Paper A', authors: [], journal: 'Journal A', year: 2020, abstract: '' },
      ],
    }
    render(<InsightsSection data={data} />)
    expect(screen.getByTestId('trial-phase-chart')).toBeInTheDocument()
    expect(screen.getByTestId('adverse-event-chart')).toBeInTheDocument()
    expect(screen.getByTestId('bioactivity-chart')).toBeInTheDocument()
    expect(screen.getByTestId('publication-timeline')).toBeInTheDocument()
  })

  test('shows "Insights" heading', () => {
    const data = {
      clinicalTrials: [
        { nctId: 'NCT001', title: 'Trial A', phase: 'Phase 1', status: 'RECRUITING', sponsor: 'Sponsor A', startDate: '2020-01-01', conditions: [] },
      ],
    }
    render(<InsightsSection data={data} />)
    expect(screen.getByText('Insights')).toBeInTheDocument()
  })
})
