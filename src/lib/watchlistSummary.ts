/**
 * Pure helpers for watchlist density metrics (free public category bags).
 * Not clinical monitoring advice.
 */

export interface WatchlistDensitySummary {
  approvedProducts: number
  activeTrials: number
  adverseEvents: number
  patents: number
  publications: number
  /** BLA / licensed biologic rows */
  blaCount: number
  /** Purple Book product rows */
  purpleBookCount: number
  /** Biosimilar-role rows (heuristic or Purple Book) */
  biosimilarCount: number
  /** Unique trial sponsors */
  sponsorCount: number
  /** ROR org rows (clinical + lit) */
  rorCount: number
  /** NIH RePORTER grant rows */
  grantCount: number
  /** Health Canada DPD rows */
  healthCanadaCount: number
  /** EMA bulk / search rows */
  emaCount: number
}

export function emptyWatchlistDensity(): WatchlistDensitySummary {
  return {
    approvedProducts: 0,
    activeTrials: 0,
    adverseEvents: 0,
    patents: 0,
    publications: 0,
    blaCount: 0,
    purpleBookCount: 0,
    biosimilarCount: 0,
    sponsorCount: 0,
    rorCount: 0,
    grantCount: 0,
    healthCanadaCount: 0,
    emaCount: 0,
  }
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

/**
 * Build density summary from pharmaceutical + clinical + research category JSON.
 */
export function buildWatchlistDensity(input: {
  pharma?: Record<string, unknown> | null
  clinical?: Record<string, unknown> | null
  research?: Record<string, unknown> | null
}): WatchlistDensitySummary {
  const pharma = input.pharma ?? {}
  const clinical = input.clinical ?? {}
  const research = input.research ?? {}

  const trials = arr(clinical.clinicalTrials) as Array<{ sponsor?: string }>
  const sponsors = new Set<string>()
  for (const t of trials) {
    const s = t.sponsor?.trim()
    if (s && !/^unknown$/i.test(s)) sponsors.add(s)
  }

  const bla = arr(pharma.biologicsLicensed) as Array<{ roleGuess?: string }>
  const purple = arr(pharma.purpleBookProducts) as Array<{ licenseType?: string }>
  const family = pharma.biosimilarFamily as
    | { biosimilars?: unknown[]; interchangeables?: unknown[] }
    | null
    | undefined

  let biosimilarCount = 0
  if (family && Array.isArray(family.biosimilars)) {
    biosimilarCount =
      family.biosimilars.length +
      (Array.isArray(family.interchangeables) ? family.interchangeables.length : 0)
  } else {
    biosimilarCount =
      bla.filter((p) => p.roleGuess === 'likely_biosimilar').length +
      purple.filter((p) => /351\s*\(\s*k\s*\)|biosimilar|interchangeable/i.test(p.licenseType || ''))
        .length
  }

  const ror =
    arr(clinical.researchOrgs).length +
    arr(research.researchOrgsLit).length +
    arr(research.euResearchOrgs).length

  return {
    approvedProducts: arr(pharma.companies).length,
    activeTrials: trials.length,
    adverseEvents: arr(clinical.adverseEvents).length,
    patents: arr(research.patents).length,
    publications: Math.max(
      arr(research.literature).length,
      arr(research.semanticPapers).length,
      arr(research.pubmedArticles).length,
      arr(research.openAlexWorks).length,
    ),
    blaCount: bla.length,
    purpleBookCount: purple.length,
    biosimilarCount,
    sponsorCount: sponsors.size,
    rorCount: ror,
    grantCount: arr(research.nihGrants).length,
    healthCanadaCount: arr(pharma.healthCanadaProducts).length,
    emaCount: arr(pharma.emaBulkMedicines).length + arr(pharma.emaMedicines).length,
  }
}

/** CSV for watchlist density export (solo file default). */
export function watchlistDensityToCsv(
  rows: Array<{ cid: number; name: string; summary?: WatchlistDensitySummary | null }>,
): string {
  const headers = [
    'cid',
    'name',
    'companies',
    'trials',
    'sponsors',
    'adverse_events',
    'patents',
    'publications',
    'bla',
    'purple_book',
    'biosimilar_rows',
    'ror_orgs',
    'nih_grants',
    'health_canada',
    'ema',
  ]
  const lines = [headers.join(',')]
  for (const r of rows) {
    const s = r.summary
    const cells = [
      r.cid,
      csvEscape(r.name),
      s?.approvedProducts ?? '',
      s?.activeTrials ?? '',
      s?.sponsorCount ?? '',
      s?.adverseEvents ?? '',
      s?.patents ?? '',
      s?.publications ?? '',
      s?.blaCount ?? '',
      s?.purpleBookCount ?? '',
      s?.biosimilarCount ?? '',
      s?.rorCount ?? '',
      s?.grantCount ?? '',
      s?.healthCanadaCount ?? '',
      s?.emaCount ?? '',
    ]
    lines.push(cells.join(','))
  }
  return lines.join('\n')
}

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}
