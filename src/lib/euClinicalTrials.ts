/**
 * EU Clinical Trials deep links (EudraCT / CTIS) from free public IDs.
 * Prefer ClinicalTrials.gov secondary IDs (no scrape of EU portals).
 */

/** Classic EudraCT number: YYYY-NNNNNN-NN */
const EUDRACT_RE = /^\d{4}-\d{6}-\d{2}$/

/** CTIS-style EU CT number (flexible) */
const EU_CT_RE = /^20\d{2}-\d{6}-\d{2}$|EUCT/i

export function isEudraCtNumber(id: string): boolean {
  return EUDRACT_RE.test(id.trim())
}

/** EU Clinical Trials Register (classic) search / trial deep link */
export function eudraCtRegisterUrl(eudraCt: string): string {
  const id = eudraCt.trim()
  if (!id) return 'https://www.clinicaltrialsregister.eu/ctr-search/search'
  // Direct search by eudraCT works reliably for public register
  return `https://www.clinicaltrialsregister.eu/ctr-search/search?query=${encodeURIComponent(id)}`
}

/** CTIS public search (newer EU portal) */
export function euCtisSearchUrl(query: string): string {
  const q = query.trim()
  return `https://euclinicaltrials.eu/ctis-public/search#searchCriteria={%22containAll%22:%22${encodeURIComponent(q)}%22}`
}

export function parseSecondaryTrialIds(
  secondaryIdInfos: Array<{ id?: string; type?: string }> | undefined,
): { eudraCtNumbers: string[]; other: Array<{ id: string; type: string }> } {
  const eudraCtNumbers: string[] = []
  const other: Array<{ id: string; type: string }> = []
  for (const s of secondaryIdInfos ?? []) {
    const id = String(s.id ?? '').trim()
    const type = String(s.type ?? '').trim()
    if (!id) continue
    if (
      type.toUpperCase().includes('EUDRACT') ||
      isEudraCtNumber(id) ||
      EU_CT_RE.test(id)
    ) {
      if (!eudraCtNumbers.includes(id)) eudraCtNumbers.push(id)
    } else {
      other.push({ id, type: type || 'OTHER' })
    }
  }
  return { eudraCtNumbers, other }
}
