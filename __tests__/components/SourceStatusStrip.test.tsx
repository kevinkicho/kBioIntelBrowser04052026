import React from 'react'
import { render, screen } from '@testing-library/react'
import {
  SourceStatusStrip,
  bucketForStatus,
  countSourceStatuses,
} from '@/app/discover/components/SourceStatusStrip'
import type { SourceFetchStatus } from '@/lib/dataStatus'
import { emitProductEvent } from '@/lib/productEvents'

jest.mock('@/lib/productEvents', () => ({
  emitProductEvent: jest.fn(),
}))

const mockedEmit = emitProductEvent as jest.MockedFunction<typeof emitProductEvent>

function status(
  source: string,
  st: SourceFetchStatus['status'],
  opts?: Partial<SourceFetchStatus>,
): SourceFetchStatus {
  return {
    source,
    status: st,
    has_data: st === 'loaded',
    ...opts,
  }
}

describe('bucketForStatus / countSourceStatuses', () => {
  it('maps loaded → ok, empty → empty, error/timeout/disabled → issue', () => {
    expect(bucketForStatus('loaded')).toBe('ok')
    expect(bucketForStatus('empty')).toBe('empty')
    expect(bucketForStatus('error')).toBe('issue')
    expect(bucketForStatus('timeout')).toBe('issue')
    expect(bucketForStatus('disabled')).toBe('issue')
  })

  it('aggregates ternary counts', () => {
    const counts = countSourceStatuses([
      status('DGIdb', 'loaded'),
      status('Open Targets', 'loaded'),
      status('DisGeNET', 'empty'),
      status('ChEMBL', 'error', { error: 'fail', has_data: false }),
      status('ClinicalTrials', 'timeout', { has_data: false }),
      status('PubChem', 'disabled', { has_data: false }),
    ])
    expect(counts).toEqual({ ok: 2, empty: 1, issue: 3, total: 6 })
  })
})

describe('SourceStatusStrip', () => {
  beforeEach(() => {
    mockedEmit.mockClear()
  })

  it('renders nothing when sourceStatuses is empty', () => {
    const { container } = render(<SourceStatusStrip sourceStatuses={[]} />)
    expect(container.querySelector('[data-testid="source-status-strip"]')).toBeNull()
    expect(mockedEmit).not.toHaveBeenCalled()
  })

  it('shows ternary counts for ok / empty / issue', () => {
    render(
      <SourceStatusStrip
        emitEvent={false}
        sourceStatuses={[
          status('DGIdb', 'loaded'),
          status('DisGeNET', 'empty'),
          status('ChEMBL', 'error', { error: '500', has_data: false }),
          status('Trials', 'timeout', { has_data: false }),
        ]}
      />,
    )

    expect(screen.getByTestId('source-status-strip')).toBeInTheDocument()
    expect(screen.getByTestId('source-status-count-ok')).toHaveAttribute('data-count', '1')
    expect(screen.getByTestId('source-status-count-empty')).toHaveAttribute('data-count', '1')
    expect(screen.getByTestId('source-status-count-issue')).toHaveAttribute('data-count', '2')
    expect(screen.getByTestId('source-status-total')).toHaveTextContent('4 sources')
  })

  it('shows epistemic disclaimers', () => {
    render(
      <SourceStatusStrip
        emitEvent={false}
        sourceStatuses={[status('DGIdb', 'loaded')]}
      />,
    )
    const disclaimer = screen.getByTestId('source-status-disclaimer')
    expect(disclaimer.textContent).toMatch(/investigation priority aids/i)
    expect(disclaimer.textContent).toMatch(/Empty ≠\s*absence of biology/i)
    expect(disclaimer.textContent).toMatch(/empty safety ≠ safe/i)
  })

  it('lists individual sources under details when empty or issue present', () => {
    render(
      <SourceStatusStrip
        emitEvent={false}
        sourceStatuses={[
          status('DGIdb', 'loaded'),
          status('DisGeNET', 'empty'),
          status('ChEMBL', 'error', { error: 'network', has_data: false }),
        ]}
      />,
    )
    expect(screen.getByTestId('source-status-details')).toBeInTheDocument()
    const rows = screen.getAllByTestId('source-status-row')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveAttribute('data-source', 'DGIdb')
    expect(rows[0]).toHaveAttribute('data-bucket', 'ok')
    expect(rows[2]).toHaveAttribute('data-status', 'error')
  })

  it('emits source_status_shown once per status set', () => {
    const statuses = [
      status('DGIdb', 'loaded'),
      status('DisGeNET', 'empty'),
    ]
    const { rerender } = render(<SourceStatusStrip sourceStatuses={statuses} />)
    expect(mockedEmit).toHaveBeenCalledTimes(1)
    expect(mockedEmit).toHaveBeenCalledWith('source_status_shown', {
      count: 2,
      ok: 1,
      empty: 1,
      issue: 0,
    })

    // Same set → no re-emit
    rerender(<SourceStatusStrip sourceStatuses={statuses} />)
    expect(mockedEmit).toHaveBeenCalledTimes(1)

    // Different set → emit again
    rerender(
      <SourceStatusStrip
        sourceStatuses={[status('DGIdb', 'loaded'), status('ChEMBL', 'error', { has_data: false })]}
      />,
    )
    expect(mockedEmit).toHaveBeenCalledTimes(2)
    expect(mockedEmit).toHaveBeenLastCalledWith('source_status_shown', {
      count: 2,
      ok: 1,
      empty: 0,
      issue: 1,
    })
  })

  it('skips emit when emitEvent is false', () => {
    render(
      <SourceStatusStrip emitEvent={false} sourceStatuses={[status('DGIdb', 'loaded')]} />,
    )
    expect(mockedEmit).not.toHaveBeenCalled()
  })
})
