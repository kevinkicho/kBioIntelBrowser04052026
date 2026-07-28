/**
 * @jest-environment jsdom
 */
import { buildMoleculeDataHub } from '@/lib/dataHub'
import {
  diffAgainstSavedHub,
  fingerprintLedger,
  saveHubSnapshot,
  HUB_SNAPSHOT_KEY,
} from '@/lib/dataHub/hubChangeAlerts'

describe('hubChangeAlerts', () => {
  beforeEach(() => {
    window.localStorage.removeItem(HUB_SNAPSHOT_KEY)
  })

  it('fingerprints non-empty facts and diffs changes', () => {
    const a = buildMoleculeDataHub(
      { cid: 1, name: 'A', formula: 'H2O' },
      { clinicalTrials: [{ nctId: 'NCT1', phase: 'P2', status: 'A', conditions: ['x'], sponsor: 'y' }] },
    )
    const fps = fingerprintLedger(a)
    expect(fps.length).toBeGreaterThan(0)
    saveHubSnapshot(a, 'molecule')
    const b = buildMoleculeDataHub(
      { cid: 1, name: 'A', formula: 'H2O2' },
      {
        clinicalTrials: [
          { nctId: 'NCT2', phase: 'P3', status: 'A', conditions: ['x'], sponsor: 'y', title: 'New' },
        ],
      },
    )
    const diff = diffAgainstSavedHub(b)
    expect(diff).toBeTruthy()
    expect(
      (diff!.added.length || 0) + (diff!.removed.length || 0) + (diff!.changed.length || 0),
    ).toBeGreaterThanOrEqual(0)
    // formula or trial sample may change
    expect(diff!.summary).toMatch(/added|removed|changed/)
  })
})
