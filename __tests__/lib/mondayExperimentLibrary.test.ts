import {
  MONDAY_EXPERIMENT_LIBRARY,
  mondayLibraryAgenda,
  mondayTemplatesForPersona,
} from '@/lib/dataHub/mondayExperimentLibrary'
import { buildMondayPackAgenda } from '@/lib/dataHub/mondayPack'
import type { DataHubLedger } from '@/lib/dataHub/types'

describe('mondayExperimentLibrary (v3 A6)', () => {
  it('has curated free-API templates with law reminders', () => {
    expect(MONDAY_EXPERIMENT_LIBRARY.length).toBeGreaterThanOrEqual(5)
    for (const t of MONDAY_EXPERIMENT_LIBRARY) {
      expect(t.freeApiSurfaces.length).toBeGreaterThan(0)
      expect(t.lawReminder.length).toBeGreaterThan(8)
    }
  })

  it('persona templates differ for rare vs competitive', () => {
    const rare = mondayTemplatesForPersona('rare-disease').map((t) => t.id)
    const comp = mondayTemplatesForPersona('competitive').map((t) => t.id)
    expect(rare).toContain('mon-rare-pin')
    expect(comp).toContain('mon-competitive')
  })

  it('agenda lines feed Monday pack builder', () => {
    const lines = mondayLibraryAgenda('repurposing', 3)
    expect(lines.length).toBe(3)
    const ledger = {
      subjectId: '2244',
      subjectLabel: 'Aspirin',
      subjectKind: 'molecule',
      empty: false,
      sourceCount: 2,
      rows: [{ fact: 'x', value: 'y', source: 'PubChem', domain: 'other' }],
      sections: [],
    } as unknown as DataHubLedger
    const agenda = buildMondayPackAgenda(ledger, [], 'repurposing')
    expect(agenda.some((a) => a.startsWith('Library ·'))).toBe(true)
  })
})
