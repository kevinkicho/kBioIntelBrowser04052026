/**
 * Opt-in live contract smoke tests for critical external API base URLs.
 *
 * Run with:
 *   LIVE_API=1 npm test -- __tests__/live/api-contract.smoke.test.ts
 *
 * Skipped by default so unit CI stays offline and fast.
 */

const LIVE = process.env.LIVE_API === '1' || process.env.LIVE_API === 'true'

const ENDPOINTS: Array<{ id: string; url: string; expectJson?: boolean }> = [
  {
    id: 'pubchem',
    url: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/aspirin/cids/JSON',
    expectJson: true,
  },
  {
    id: 'chembl',
    url: 'https://www.ebi.ac.uk/chembl/api/data/molecule/search.json?q=aspirin&limit=1',
    expectJson: true,
  },
  {
    id: 'iuphar-ligands',
    url: 'https://www.guidetopharmacology.org/services/ligands?search=aspirin',
    expectJson: true,
  },
  {
    id: 'clinicaltrials',
    url: 'https://clinicaltrials.gov/api/v2/studies?query.term=aspirin&pageSize=1',
    expectJson: true,
  },
  {
    id: 'nci-cadsr-host',
    // Documented known-dead host — live run expects failure (DNS or non-JSON)
    url: 'https://cadsrapi.nci.nih.gov/cadsrapi/v1/concepts?q=melanoma',
    expectJson: false,
  },
]

const describeLive = LIVE ? describe : describe.skip

describeLive('live API contract smoke (LIVE_API=1)', () => {
  jest.setTimeout(30000)

  for (const ep of ENDPOINTS) {
    test(`${ep.id}: ${ep.url}`, async () => {
      let res: Response
      try {
        res = await fetch(ep.url, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(20000),
        })
      } catch (err) {
        if (!ep.expectJson) {
          // DNS / network failure is acceptable for known-dead hosts
          expect(err).toBeDefined()
          return
        }
        throw err
      }

      const contentType = (res.headers.get('content-type') || '').toLowerCase()
      if (ep.expectJson) {
        expect(res.ok).toBe(true)
        expect(contentType.includes('html')).toBe(false)
        const text = await res.text()
        expect(text.trimStart().startsWith('<')).toBe(false)
        expect(() => JSON.parse(text)).not.toThrow()
      } else {
        // Known-broken: either non-ok, HTML, or non-JSON
        if (!res.ok || contentType.includes('html')) {
          expect(true).toBe(true)
          return
        }
        const text = await res.text()
        const looksLikeJson = text.trimStart().startsWith('{') || text.trimStart().startsWith('[')
        expect(looksLikeJson).toBe(false)
      }
    })
  }
})
