import { render, screen, fireEvent } from '@testing-library/react'
import { DecisionStrip } from '@/components/profile/DecisionStrip'
import type { EvidenceClaim, ScoreVector } from '@/lib/domain'

const baseProps = {
  moleculeName: 'Aspirin',
  cid: 2244,
  disease: 'type 2 diabetes mellitus',
  scores: null as ScoreVector | null,
  claims: [] as EvidenceClaim[],
  claimsLoading: false,
  coreReady: true,
}

const sampleScores: ScoreVector = {
  composite: 0.72,
  axes: {
    efficacy: 0.8,
    clinicalStage: 0.6,
    safety: 0.5,
    novelty: 0.2,
    identityTrust: 0.9,
  },
  axisStatus: {
    efficacy: 'computed',
    clinicalStage: 'computed',
    safety: 'computed',
    novelty: 'computed',
    identityTrust: 'computed',
  },
  rubricVersion: 1,
  scorePhase: 'full',
  rubricId: 'balanced',
}

const sampleClaim: EvidenceClaim = {
  id: 'clm_test',
  statement: 'Aspirin inhibits Cyclooxygenase-2 (IC50 0.04 uM)',
  claimType: 'binds-target',
  epistemicStatus: 'supported',
  provenance: {
    source: 'ChEMBL',
    retrievedAt: '2026-04-07T12:00:00.000Z',
  },
}

describe('DecisionStrip', () => {
  it('renders strip with empty scores + empty claims and CTAs (anti-cosmetic)', () => {
    render(<DecisionStrip {...baseProps} />)
    expect(screen.getByTestId('decision-strip')).toBeInTheDocument()
    expect(screen.getByTestId('decision-strip-scores-empty')).toBeInTheDocument()
    expect(screen.getByTestId('decision-strip-scores-cta')).toHaveAttribute(
      'href',
      expect.stringContaining('/discover'),
    )
    expect(screen.getByTestId('decision-strip-claims-empty')).toBeInTheDocument()
    expect(screen.getByText(/Empty ≠ absence/i)).toBeInTheDocument()
  })

  it('shows multi-axis scores when ScoreVector has axes', () => {
    render(<DecisionStrip {...baseProps} scores={sampleScores} />)
    expect(screen.getByTestId('decision-strip-composite')).toHaveTextContent('72')
    expect(screen.getByText('Efficacy')).toBeInTheDocument()
    expect(screen.getByText('Clinical stage')).toBeInTheDocument()
    expect(screen.queryByTestId('decision-strip-scores-empty')).not.toBeInTheDocument()
  })

  it('shows composite-only message when axes missing', () => {
    const compositeOnly: ScoreVector = {
      ...sampleScores,
      axes: {
        efficacy: null,
        clinicalStage: null,
        safety: null,
        novelty: null,
        identityTrust: null,
      },
      axisStatus: {
        efficacy: 'not-retrieved',
        clinicalStage: 'not-retrieved',
        safety: 'not-retrieved',
        novelty: 'not-retrieved',
        identityTrust: 'not-retrieved',
      },
      scorePhase: 'cheap',
    }
    render(<DecisionStrip {...baseProps} scores={compositeOnly} />)
    expect(screen.getByTestId('decision-strip-scores-composite-only')).toBeInTheDocument()
  })

  it('lists claims with type badges and provenance', () => {
    render(<DecisionStrip {...baseProps} claims={[sampleClaim]} />)
    expect(screen.getByTestId('decision-strip-claim')).toHaveTextContent(/Cyclooxygenase-2/)
    expect(screen.getByText('binds-target')).toBeInTheDocument()
    expect(screen.getByText('ChEMBL')).toBeInTheDocument()
    expect(screen.queryByTestId('decision-strip-claims-empty')).not.toBeInTheDocument()
  })

  it('shows loading state while claims pending', () => {
    render(
      <DecisionStrip
        {...baseProps}
        claimsLoading
        coreReady={false}
        claims={[]}
      />,
    )
    expect(screen.getByTestId('decision-strip-claims-loading')).toBeInTheDocument()
  })

  it('invokes onLoadCorePanels from empty-claims CTA', () => {
    const onLoad = jest.fn()
    render(
      <DecisionStrip
        {...baseProps}
        coreReady={false}
        claimsLoading={false}
        onLoadCorePanels={onLoad}
      />,
    )
    fireEvent.click(screen.getByTestId('decision-strip-claims-cta'))
    expect(onLoad).toHaveBeenCalledTimes(1)
  })

  it('links project when projectId provided', () => {
    render(
      <DecisionStrip
        {...baseProps}
        projectId="prj_abc"
        projectName="Diabetes shortlist"
      />,
    )
    expect(screen.getByText(/Diabetes shortlist/)).toHaveAttribute(
      'href',
      '/projects/prj_abc',
    )
  })
})
