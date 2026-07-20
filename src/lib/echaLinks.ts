/**
 * ECHA (European Chemicals Agency) deep links — free public portal, no scrape.
 * EPA-adjacent for EU chemical identity / REACH / C&L inventory.
 * Prefer CAS when available (from CompTox / PubChem).
 */

/** Normalize CAS to digits-digits-digit form when possible */
export function normalizeCasNumber(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null
  const m = s.match(/(\d{1,7})-(\d{2})-(\d)/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  // bare digits sometimes stored
  const digits = s.replace(/\D/g, '')
  if (digits.length >= 5) {
    const check = digits.slice(-1)
    const mid = digits.slice(-3, -1)
    const head = digits.slice(0, -3)
    if (head && mid && check) return `${head}-${mid}-${check}`
  }
  return s
}

/** ECHA CHEM search (modern public UI) */
export function echaChemSearchUrl(query: string): string {
  const q = query.trim()
  return `https://chem.echa.europa.eu/search?searchText=${encodeURIComponent(q)}`
}

/** Classic ECHA search-for-chemicals by CAS (portal deep link) */
export function echaCasSearchUrl(cas: string): string {
  const c = normalizeCasNumber(cas) || cas.trim()
  return (
    'https://echa.europa.eu/search-for-chemicals?' +
    'p_p_id=echarevsubstance_WAR_echarevsubstanceportlet&p_p_lifecycle=0&' +
    '_echarevsubstance_WAR_echarevsubstanceportlet_searchType=CAS_NUMBER&' +
    `_echarevsubstance_WAR_echarevsubstanceportlet_searchValue=${encodeURIComponent(c)}`
  )
}

export interface EchaDeepLinks {
  cas: string | null
  chemSearchUrl: string
  casSearchUrl: string | null
}

export function buildEchaDeepLinks(opts: {
  cas?: string | null
  name?: string | null
}): EchaDeepLinks {
  const cas = normalizeCasNumber(opts.cas)
  const name = (opts.name || '').trim()
  const chemQ = cas || name
  return {
    cas,
    chemSearchUrl: chemQ
      ? echaChemSearchUrl(chemQ)
      : 'https://chem.echa.europa.eu/',
    casSearchUrl: cas ? echaCasSearchUrl(cas) : null,
  }
}
