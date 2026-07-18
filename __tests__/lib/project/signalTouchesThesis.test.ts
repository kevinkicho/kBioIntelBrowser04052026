import {
  appendSignalNotesToThesis,
  collectThesisSignalTouches,
  signalTouchesThesis,
} from '@/lib/project/signalTouchesThesis'
import type { EvidenceClaim } from '@/lib/domain'
import type { CandidateSignalRow } from '@/lib/signals'

const claim = (type: EvidenceClaim['claimType']): EvidenceClaim => ({
  id: `ec:${type}`,
  claimType: type,
  statement: `${type} statement`,
  epistemicStatus: 'supported',
  provenance: { source: 'test', retrievedAt: '2026-04-07T00:00:00.000Z' },
})

describe('signalTouchesThesis', () => {
  it('flags safety AE panel for linked candidate', () => {
    const touch = signalTouchesThesis(
      {
        key: 'adverseEvents',
        panelId: 'adverse-events',
        category: 'Safety',
        label: 'adverse events',
        type: 'new',
        count: 12,
        href: '/molecule/2244#panel-adverse-events',
      },
      {
        title: 'Aspirin for pain',
        thesis: 'Working claim with safety kill criteria.',
        claimIds: ['ec:safety'],
      },
      [claim('safety')],
      { candidateId: 'c1', name: 'Aspirin', cid: 2244 },
    )
    expect(touch).not.toBeNull()
    expect(touch!.relevance).toBe('safety')
    expect(touch!.suggestedNote).toContain('Aspirin')
    expect(touch!.claimTypesTouched).toContain('safety')
  })

  it('collects and ranks touches from signal rows', () => {
    const rows: CandidateSignalRow[] = [
      {
        candidateId: 'c1',
        name: 'Aspirin',
        cid: 2244,
        status: 'ready',
        snapshotAge: '1d',
        signals: [
          {
            key: 'literature',
            panelId: 'literature',
            category: 'Research',
            label: 'publications',
            type: 'changed',
            count: 3,
            href: '/m#literature',
          },
          {
            key: 'adverseEvents',
            panelId: 'adverse-events',
            category: 'Safety',
            label: 'adverse events',
            type: 'new',
            count: 5,
            href: '/m#ae',
          },
        ],
      },
    ]
    const touches = collectThesisSignalTouches(
      {
        title: 'T',
        thesis: 'safety and trial plan',
        claimIds: [],
        candidateIds: ['c1'],
      },
      [claim('safety')],
      rows,
    )
    expect(touches.length).toBeGreaterThanOrEqual(1)
    expect(touches[0].relevance).toBe('safety')
  })

  it('appendSignalNotesToThesis adds section once', () => {
    const touch = signalTouchesThesis(
      {
        key: 'clinicalTrials',
        panelId: 'clinical-trials',
        category: 'Clinical',
        label: 'clinical trials',
        type: 'new',
        count: 2,
        href: '/x',
      },
      { title: 'T', thesis: 'Base thesis', claimIds: [] },
      [],
      { candidateId: 'c1', name: 'Drug', cid: 1 },
    )!
    const once = appendSignalNotesToThesis('Base thesis', [touch])
    expect(once).toContain('## Signal review (auto)')
    const twice = appendSignalNotesToThesis(once, [touch])
    expect(twice.match(/## Signal review \(auto\)/g)?.length).toBe(1)
  })
})
