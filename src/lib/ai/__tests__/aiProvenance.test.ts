import {
  AI_PROVENANCE_HONESTY,
  formatAiProvenanceLabel,
  hasAiPrompt,
} from '@/lib/ai/aiProvenance'
import {
  API_PROVENANCE_HONESTY,
  buildApiContentProvenance,
} from '@/lib/provenance/apiContent'
import { buildMondayPack } from '@/lib/dataHub/mondayPack'
import { buildMoleculeDataHub } from '@/lib/dataHub'

describe('AI provenance contract', () => {
  it('detects prompts and labels deterministic runs', () => {
    expect(hasAiPrompt({ promptSystem: 'sys', promptUser: 'user' })).toBe(true)
    expect(hasAiPrompt({ promptSystem: '', promptUser: '' })).toBe(false)
    expect(
      formatAiProvenanceLabel({
        kind: 'copilot',
        mode: 'safety_memo',
        deterministic: true,
      }),
    ).toMatch(/Deterministic/)
    expect(AI_PROVENANCE_HONESTY.length).toBeGreaterThan(2)
  })
})

describe('API content provenance', () => {
  it('resolves chembl-ish keys without inventing paid sources', () => {
    const p = buildApiContentProvenance('chembl', {
      sourceUrl: 'https://www.ebi.ac.uk/chembl/',
    })
    expect(p.sourceKey).toBeTruthy()
    expect(p.sourceLabel).toBeTruthy()
    expect(API_PROVENANCE_HONESTY.some((h) => /free public/i.test(h))).toBe(true)
  })
})

describe('Monday pack v2 provenance', () => {
  it('embeds API + AI honesty and open links', () => {
    const ledger = buildMoleculeDataHub(
      { cid: 2244, name: 'Aspirin', formula: 'C9H8O4' },
      { clinicalTrials: [{ nctId: 'NCT1', phase: 'P3', status: 'C', conditions: ['x'], sponsor: 'y' }] },
    )
    const pack = buildMondayPack({ ledger, asOf: '2026-07-28T00:00:00.000Z' })
    expect(pack.schemaVersion).toBe(2)
    expect(pack.provenance?.api.factCount).toBeGreaterThan(0)
    expect(pack.provenance?.ai.honesty.length).toBeGreaterThan(0)
    expect(pack.openLinks?.some((l) => /methodology/i.test(l.href))).toBe(true)
  })
})
