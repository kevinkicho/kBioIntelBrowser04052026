import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ScoreMathTooltip, ScoreValueWithMath } from '@/components/score/ScoreMathTooltip'
import {
  createDefaultScoreRubric,
  createEmptyScoreVector,
} from '@/lib/domain'

describe('ScoreMathTooltip', () => {
  it('shows composite formula on hover', () => {
    const scores = createEmptyScoreVector('full', createDefaultScoreRubric('balanced'))
    scores.composite = 0.55
    scores.axes.efficacy = 0.8
    scores.axisStatus.efficacy = 'computed'

    render(
      <ScoreMathTooltip composite scores={scores} testId="math-comp">
        <span>55</span>
      </ScoreMathTooltip>,
    )
    fireEvent.mouseEnter(screen.getByTestId('math-comp'))
    const panel = screen.getByTestId('math-comp-panel')
    expect(panel.textContent).toMatch(/Composite|Σ|weighted/i)
    expect(panel.textContent).toMatch(/Investigation priority/i)
  })

  it('shows safety math on axis hover', () => {
    render(
      <ScoreMathTooltip axis="safety" testId="math-safety">
        <span>S</span>
      </ScoreMathTooltip>,
    )
    fireEvent.mouseEnter(screen.getByTestId('math-safety'))
    const panel = screen.getByTestId('math-safety-panel')
    expect(panel.textContent).toMatch(/FAERS|aeRisk|1\s*[−\-]/i)
  })

  it('ScoreValueWithMath marks dotted underline value', () => {
    render(
      <ScoreValueWithMath composite legacyComposite={0.4}>
        40%
      </ScoreValueWithMath>,
    )
    expect(screen.getByTestId('score-value-with-math')).toHaveTextContent('40%')
  })
})
