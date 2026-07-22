/**
 * @jest-environment node
 */

import {
  extractClaimsFromDrugsFda,
  extractClaimsFromOpenFdaLabelSections,
  extractClaimsFromNsfAwards,
  DRUGS_FDA_SOURCE,
  OPENFDA_LABEL_SECTIONS_SOURCE,
  NSF_AWARDS_SOURCE,
} from '../supporting'

const ctx = {
  retrievedAt: '2026-04-05T00:00:00.000Z',
  moleculeName: 'tenofovir',
  subjectCandidateId: 'cid:1',
}

describe('supporting extractors — Drugs@FDA / openFDA labels / NSF', () => {
  it('extracts Drugs@FDA application claims', () => {
    const claims = extractClaimsFromDrugsFda(
      [
        {
          applicationNumber: 'NDA021875',
          sponsorName: 'Gilead',
          brandName: 'Viread',
          genericName: 'tenofovir',
          submissionType: 'ORIG',
          drugsAtFdaUrl: 'https://example.com/daf',
        },
      ],
      ctx,
    )
    expect(claims).toHaveLength(1)
    expect(claims[0].provenance.source).toBe(DRUGS_FDA_SOURCE)
    expect(claims[0].statement).toMatch(/NDA021875/)
    expect(claims[0].statement).toMatch(/not treatment advice/i)
    expect(claims[0].provenance.sourceUrl).toContain('example.com')
  })

  it('extracts openFDA label section claims with safety facet for AE sections', () => {
    const claims = extractClaimsFromOpenFdaLabelSections(
      [
        {
          id: 'l1',
          brandName: 'Viread',
          setId: 'set-1',
          dailyMedUrl: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=set-1',
          sections: [
            { key: 'boxed_warning', label: 'Boxed warning', text: 'Lactic acidosis risk…' },
            {
              key: 'indications_and_usage',
              label: 'Indications & usage',
              text: 'Indicated for HIV-1…',
            },
          ],
        },
      ],
      { ...ctx, limit: 12 },
    )
    expect(claims.length).toBe(2)
    expect(claims.every((c) => c.provenance.source === OPENFDA_LABEL_SECTIONS_SOURCE)).toBe(
      true,
    )
    const boxed = claims.find((c) => c.statement.includes('Boxed warning'))
    expect(boxed?.claimType).toBe('safety')
    const ind = claims.find((c) => c.statement.includes('Indications'))
    expect(ind?.claimType).toBe('other')
  })

  it('extracts NSF award literature claims', () => {
    const claims = extractClaimsFromNsfAwards(
      [
        {
          id: '123',
          title: 'Protein folding markers',
          piName: 'Ada Lovelace',
          organization: 'Example U',
          amount: 100000,
          awardUrl: 'https://www.nsf.gov/awardsearch/showAward?AWD_ID=123',
        },
      ],
      ctx,
    )
    expect(claims).toHaveLength(1)
    expect(claims[0].provenance.source).toBe(NSF_AWARDS_SOURCE)
    expect(claims[0].claimType).toBe('literature')
    expect(claims[0].statement).toMatch(/Funding context only/i)
    expect(claims[0].statement).toMatch(/Example U/)
  })
})
