import fs from 'fs'
import path from 'path'
import {
  buildResearchCatalogExport,
  RESEARCH_GOALS,
  suggestResearchForGoal,
} from '@/lib/methods/researchToolCatalog'

const OUT = path.join(
  process.cwd(),
  'src',
  'lib',
  'methods',
  'researchPlaybooks.json',
)

describe('exportResearchCatalog', () => {
  test('buildResearchCatalogExport emits runnable suggestCommands per goal', () => {
    // Sanity: live suggest still produces CLIs (guards circular-init bugs)
    const sample = suggestResearchForGoal('discover', {
      limit: 3,
      vars: { q: '{{q}}', targets: '{{targets}}', cid: '{{cid}}' },
    })
    expect(sample.actions.some((a) => Boolean(a.cli))).toBe(true)

    const exp = buildResearchCatalogExport()
    expect(exp.version).toBe(1)
    expect(exp.copilotTools.length).toBeGreaterThanOrEqual(10)
    expect(Object.keys(exp.suggestCommands).length).toBe(RESEARCH_GOALS.length)
    for (const g of RESEARCH_GOALS) {
      const exported = exp.suggestCommands[g] || []
      expect(exported.length).toBeGreaterThan(0)
      for (const bare of exported) {
        expect(bare.length).toBeGreaterThan(2)
        expect(bare.toLowerCase()).not.toMatch(/^ask /)
        // Should look like a biointel subcommand, not free-form prose
        expect(bare).toMatch(
          /^(discover|molecule|research|orphanet|logs|health|gate|e2e|tools|api)\b/i,
        )
      }
    }
  })

  test('researchPlaybooks.json is not stale vs TS export', () => {
    const exp = buildResearchCatalogExport()
    const disk = JSON.parse(fs.readFileSync(OUT, 'utf8'))
    // Compare structural keys that agents depend on
    expect(disk.goalMap).toEqual(exp.goalMap)
    expect(disk.copilotTools).toEqual(exp.copilotTools)
    expect(Object.keys(disk.suggestCommands || {}).sort()).toEqual(
      Object.keys(exp.suggestCommands).sort(),
    )
    for (const g of RESEARCH_GOALS) {
      expect(disk.suggestCommands[g]).toEqual(exp.suggestCommands[g])
    }
    expect((disk.playbooks || []).map((p: { id: string }) => p.id).sort()).toEqual(
      exp.playbooks.map((p) => p.id).sort(),
    )
  })

  test('writes researchPlaybooks.json', () => {
    if (process.env.UPDATE_RESEARCH_CATALOG !== '1') {
      // Always run equality above; write only when exporting
      expect(true).toBe(true)
      return
    }
    const exp = buildResearchCatalogExport()
    fs.writeFileSync(OUT, JSON.stringify(exp, null, 2) + '\n', 'utf8')
    expect(fs.existsSync(OUT)).toBe(true)
  })
})
