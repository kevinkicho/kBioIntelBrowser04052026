import React from 'react'
import { render, screen } from '@testing-library/react'
import { ScoreAxisBars } from '@/app/discover/components/ScoreAxisBars'
import {
  createDefaultScoreRubric,
  createEmptyScoreVector,
  type ScoreVector,
} from '@/lib/domain'
import { AXIS_ORDER } from '@/lib/profileMode'

function makeScores(overrides?: Partial<ScoreVector>): ScoreVector {
  const base = createEmptyScoreVector('cheap', createDefaultScoreRubric('balanced'))
  return {
    ...base,
    composite: 0.72,
    axes: {
      efficacy: 0.8,
      clinicalStage: 0.7,
      safety: null,
      novelty: null,
      identityTrust: 0.66,
    },
    axisStatus: {
      efficacy: 'computed',
      clinicalStage: 'computed',
      safety: 'not-retrieved',
      novelty: 'empty',
      identityTrust: 'computed',
    },
    safetyFlags: [
      { kind: 'ae_burden', severity: 'warn', label: 'Elevated AE reports' },
    ],
    ...overrides,
  }
}

describe('ScoreAxisBars', () => {
  it('renders axes in AXIS_ORDER (clinicalStage first)', () => {
    render(<ScoreAxisBars scores={makeScores()} />)
    const rows = screen.getAllByTestId(/^score-axis-row-/)
    expect(rows).toHaveLength(AXIS_ORDER.length)
    expect(rows[0]).toHaveAttribute('data-axis', 'clinicalStage')
    expect(rows.map((r) => r.getAttribute('data-axis'))).toEqual([...AXIS_ORDER])
  })

  it('shows epistemic chip for null axes — never paints zero', () => {
    render(<ScoreAxisBars scores={makeScores()} />)
    const safetyRow = screen.getByTestId('score-axis-row-safety')
    expect(safetyRow).toHaveAttribute('data-missing', 'true')
    const chips = screen.getAllByTestId('score-axis-epistemic')
    expect(chips.length).toBeGreaterThanOrEqual(1)
    expect(chips.some((c) => c.getAttribute('data-status') === 'not-retrieved')).toBe(true)
    expect(chips.some((c) => c.getAttribute('data-status') === 'empty')).toBe(true)
    // No 0% label for missing safety
    expect(safetyRow.textContent).not.toMatch(/^0%$/)
  })

  it('renders safetyFlags as badges', () => {
    render(<ScoreAxisBars scores={makeScores()} />)
    expect(screen.getByTestId('score-axis-safety-flags')).toHaveTextContent(
      'Elevated AE reports',
    )
  })

  it('supports compact mode', () => {
    render(<ScoreAxisBars scores={makeScores()} compact showExplainer={false} />)
    expect(screen.getByTestId('score-axis-bars')).toBeInTheDocument()
    expect(screen.queryByText(/Phase:/)).not.toBeInTheDocument()
  })

  it('exposes rich axis title tooltips with weight and sources', () => {
    render(<ScoreAxisBars scores={makeScores()} showExplainer={false} />)
    const row = screen.getByTestId('score-axis-row-efficacy')
    const labeled = row.querySelector('[title]')
    expect(labeled?.getAttribute('title') || '').toMatch(/Efficacy/i)
    expect(labeled?.getAttribute('title') || '').toMatch(/weight|Open Targets|Sources/i)
  })

  it('renders score explainer toggle when enabled', () => {
    render(<ScoreAxisBars scores={makeScores()} />)
    expect(screen.getByTestId('score-explainer-toggle')).toBeInTheDocument()
  })
})
