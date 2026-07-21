/**
 * @jest-environment node
 */

import {
  mergeStickySignalRows,
  projectSignalsMembershipKey,
  type CandidateSignalRow,
} from '../projectSignals'
import type { Project } from '@/lib/domain'

function row(
  partial: Partial<CandidateSignalRow> & { candidateId: string },
): CandidateSignalRow {
  return {
    name: partial.name ?? partial.candidateId,
    cid: partial.cid ?? 1,
    signals: partial.signals ?? [],
    snapshotAge: partial.snapshotAge ?? null,
    status: partial.status ?? 'ready',
    error: partial.error,
    candidateId: partial.candidateId,
  }
}

describe('projectSignalsMembershipKey', () => {
  it('ignores boardStatus and updatedAt', () => {
    const base = {
      id: 'p1',
      candidates: [
        {
          candidateId: 'c1',
          identity: { name: 'A', pubchemCid: 10 },
          boardStatus: 'promote',
        },
      ],
    } as unknown as Project
    const a = projectSignalsMembershipKey(base)
    const b = projectSignalsMembershipKey({
      ...base,
      candidates: [
        {
          ...base.candidates[0],
          boardStatus: 'kill',
        },
      ],
      updatedAt: '2099-01-01',
    } as unknown as Project)
    expect(a).toBe(b)
  })

  it('changes when candidate set changes', () => {
    const a = projectSignalsMembershipKey({
      id: 'p1',
      candidates: [{ candidateId: 'c1', identity: { pubchemCid: 1 } }],
    } as unknown as Project)
    const b = projectSignalsMembershipKey({
      id: 'p1',
      candidates: [
        { candidateId: 'c1', identity: { pubchemCid: 1 } },
        { candidateId: 'c2', identity: { pubchemCid: 2 } },
      ],
    } as unknown as Project)
    expect(a).not.toBe(b)
  })
})

describe('mergeStickySignalRows', () => {
  it('keeps prior non-empty signals when next row is empty (triage re-load)', () => {
    const prev = [
      row({
        candidateId: 'c1',
        cid: 99,
        signals: [
          {
            key: 'trials',
            label: 'Trials',
            type: 'new',
            count: 2,
            panelId: 'clinical-trials',
            category: 'Clinical',
            href: '/molecule/99#clinical-trials',
          },
        ],
        status: 'ready',
      }),
    ]
    const next = [row({ candidateId: 'c1', cid: 99, signals: [], status: 'baseline' })]
    const merged = mergeStickySignalRows(prev, next, new Set(['c1']))
    expect(merged[0].signals).toHaveLength(1)
    expect(merged[0].signals[0].label).toBe('Trials')
    expect(merged[0].status).toBe('ready')
  })

  it('drops sticky when candidate removed from board', () => {
    const prev = [
      row({
        candidateId: 'c1',
        signals: [
          {
            key: 'x',
            label: 'X',
            type: 'new',
            count: 1,
            panelId: 'clinical-trials',
            category: 'Clinical',
            href: '#',
          },
        ],
      }),
    ]
    const next = [row({ candidateId: 'c1', signals: prev[0].signals })]
    const merged = mergeStickySignalRows(prev, next, new Set(['c2']))
    expect(merged).toHaveLength(0)
  })

  it('prefers fresh non-empty signals over sticky', () => {
    const prev = [
      row({
        candidateId: 'c1',
        signals: [
          {
            key: 'old',
            label: 'Old',
            type: 'new',
            count: 1,
            panelId: 'clinical-trials',
            category: 'Clinical',
            href: '#',
          },
        ],
      }),
    ]
    const next = [
      row({
        candidateId: 'c1',
        signals: [
          {
            key: 'new',
            label: 'New',
            type: 'new',
            count: 3,
            panelId: 'adverse-events',
            category: 'Clinical',
            href: '#',
          },
        ],
      }),
    ]
    const merged = mergeStickySignalRows(prev, next, new Set(['c1']))
    expect(merged[0].signals[0].label).toBe('New')
  })
})
