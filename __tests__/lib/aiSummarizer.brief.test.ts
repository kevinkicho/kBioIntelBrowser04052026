import { buildStructuredBrief } from '@/lib/aiSummarizer'

describe('buildStructuredBrief HTML + indication formatting', () => {
  test('strips highlighting HTML from pathway names', () => {
    const brief = buildStructuredBrief(
      {
        reactomePathways: [
          {
            name: '<span class="highlighting" >Lysine</span> catabolism',
            species: 'Homo sapiens',
          },
        ],
        clinicalTrials: [
          {
            nctId: 'NCT03943199',
            phase: 'NA',
            conditions: ['Pain'],
          },
        ],
        chemblIndications: [
          { condition: '', maxPhase: -1, meshHeading: '' },
          { meshHeading: 'Low Back Pain', maxPhaseForIndication: 3 },
          { condition: 'Pain', maxPhase: 2 },
        ],
        atcClassifications: [
          { name: 'Clonixin' },
          { name: 'Clonixin' },
          { name: 'Lysine' },
        ],
        literature: [{ title: 'Test paper about drug', journal: 'J Test', year: 2021 }],
      },
      'Lysine clonixinate',
    )

    const text = brief.sections.flatMap((s) => s.bullets).join('\n')
    expect(text).not.toMatch(/<span/)
    expect(text).not.toMatch(/highlighting/)
    expect(text).toMatch(/Lysine catabolism/)
    expect(text).not.toMatch(/\(phase \?\)/)
    expect(text).toMatch(/Low Back Pain \(phase 3\)/)
    // ATC de-duplicated
    const atcLine = text.split('\n').find((l) => l.includes('ATC:'))
    expect(atcLine).toBeTruthy()
    expect(atcLine!.match(/Clonixin/g)?.length).toBe(1)
  })
})
