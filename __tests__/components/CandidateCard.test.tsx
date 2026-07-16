import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { CandidateCard } from '@/app/discover/components/CandidateCard'
import type { CandidateMolecule } from '@/lib/candidateRanker'
import {
  createDefaultScoreRubric,
  createEmptyScoreVector,
  type MoleculeCandidate,
} from '@/lib/domain'
import { AXIS_ORDER } from '@/lib/profileMode'

jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) {
    return <a href={href}>{children}</a>
  }
})

jest.mock('@/components/projects/SaveToProjectButton', () => ({
  SaveToProjectButton: ({ candidate }: { candidate: MoleculeCandidate }) => (
    <button type="button" data-testid="save-to-project" data-cid={candidate.candidateId}>
      Save
    </button>
  ),
}))

const legacy: CandidateMolecule = {
  name: 'Aspirin',
  cid: 2244,
  clinicalPhase: 0.75,
  geneAssociationScore: 0.8,
  sharedTargetRatio: 0.5,
  trialCountNorm: 0.4,
  clinicalPhaseRaw: 3,
  sharedTargetCountRaw: 2,
  trialCountRaw: 5,
  geneScoreRaw: 0.8,
  sources: ['DGIdb', 'ChEMBL'],
  confidence: 'high',
  compositeScore: 0.72,
}

function domainCandidate(): MoleculeCandidate {
  const empty = createEmptyScoreVector('cheap', createDefaultScoreRubric('balanced'))
  return {
    candidateId: 'cid:2244',
    identity: {
      name: 'Aspirin',
      synonyms: [],
      pubchemCid: 2244,
      identityTrust: 'high',
      inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
    },
    origins: ['dgidb'],
    evidenceBreadthSources: ['DGIdb'],
    links: [],
    scores: {
      ...empty,
      composite: 0.81,
      axes: {
        efficacy: 0.8,
        clinicalStage: 0.75,
        safety: null,
        novelty: null,
        identityTrust: 1,
      },
      axisStatus: {
        efficacy: 'computed',
        clinicalStage: 'computed',
        safety: 'not-retrieved',
        novelty: 'not-retrieved',
        identityTrust: 'computed',
      },
      weights: createDefaultScoreRubric('balanced').weights,
    },
  }
}

describe('CandidateCard', () => {
  it('does not render free-form Why AI / Why ranked UI', () => {
    render(
      <CandidateCard
        candidate={legacy}
        rank={1}
        diseaseName="ATTR"
        topCandidates={[legacy]}
        domainCandidate={domainCandidate()}
        rubric={createDefaultScoreRubric('balanced')}
      />,
    )
    expect(screen.queryByText(/Why ranked/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Analyzing/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Connect Ollama/i)).not.toBeInTheDocument()
  })

  it('shows multi-axis ScoreAxisBars when domainCandidate has scores', () => {
    render(
      <CandidateCard
        candidate={legacy}
        rank={1}
        diseaseName="ATTR"
        topCandidates={[legacy]}
        domainCandidate={domainCandidate()}
        rubric={createDefaultScoreRubric('balanced')}
      />,
    )
    expect(screen.getByTestId('score-axis-bars')).toBeInTheDocument()
    const rows = screen.getAllByTestId(/^score-axis-row-/)
    expect(rows[0]).toHaveAttribute('data-axis', AXIS_ORDER[0])
    expect(screen.getByText('Clinical stage')).toBeInTheDocument()
    expect(screen.getByText('Efficacy')).toBeInTheDocument()
    // Legacy bars gone
    expect(screen.queryByText('Gene Score')).not.toBeInTheDocument()
    expect(screen.queryByText('Target Match')).not.toBeInTheDocument()
    expect(screen.queryByText('Trial Volume')).not.toBeInTheDocument()
  })

  it('composite ring uses domainCandidate.scores.composite', () => {
    render(
      <CandidateCard
        candidate={legacy}
        rank={1}
        diseaseName="ATTR"
        topCandidates={[legacy]}
        domainCandidate={domainCandidate()}
      />,
    )
    // 0.81 → 81
    expect(screen.getByTestId('composite-score-ring')).toHaveTextContent('81')
  })

  it('passes domain candidate to SaveToProjectButton', () => {
    render(
      <CandidateCard
        candidate={legacy}
        rank={1}
        diseaseName="ATTR"
        topCandidates={[legacy]}
        domainCandidate={domainCandidate()}
      />,
    )
    expect(screen.getByTestId('save-to-project')).toHaveAttribute('data-cid', 'cid:2244')
  })

  it('does not use legacy 35/25/20/20 explainer weights', () => {
    render(
      <CandidateCard
        candidate={legacy}
        rank={1}
        diseaseName="ATTR"
        topCandidates={[legacy]}
        domainCandidate={domainCandidate()}
        rubric={createDefaultScoreRubric('balanced')}
      />,
    )
    fireEvent.click(screen.getByTestId('score-explainer-toggle'))
    const panel = screen.getByTestId('score-explainer-panel')
    expect(panel.textContent).not.toMatch(/35%/)
    expect(panel.textContent).not.toMatch(/Gene Association/)
    expect(panel.textContent).toMatch(/Clinical stage/)
    expect(panel.textContent).toMatch(/Efficacy/)
  })
})
