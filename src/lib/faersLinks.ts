/**
 * Direct source links for openFDA / FAERS adverse-event rows.
 * Avoid open.fda.gov/apis/... docs pages — those are not usable data views.
 */

const API = 'https://api.fda.gov/drug/event.json'
const FAERS_DASHBOARD =
  'https://fis.fda.gov/sense/app/95239e26-e0be-42d9-a960-9a5f7f1c25ee/sheet/7a47a261-d58b-4203-a8aa-6d3021737452/state/analysis'

/**
 * openFDA drug event JSON for a MedDRA reaction (± drug product filter).
 * This is the same API that powers the Adverse Events panel.
 */
export function faersApiSearchUrl(input: {
  reaction?: string | null
  drugName?: string | null
  limit?: number
}): string {
  const reaction = (input.reaction || '').trim()
  const drug = (input.drugName || '').trim()
  const limit = input.limit ?? 10
  const parts: string[] = []
  if (reaction) {
    parts.push(`patient.reaction.reactionmeddrapt.exact:"${reaction.replace(/"/g, '')}"`)
  }
  if (drug) {
    const d = drug.replace(/"/g, '')
    parts.push(
      `(patient.drug.openfda.generic_name:"${d}"+OR+patient.drug.openfda.brand_name:"${d}"+OR+patient.drug.medicinalproduct:"${d}")`,
    )
  }
  if (parts.length === 0) {
    return `${API}?limit=${limit}`
  }
  return `${API}?search=${parts.join('+AND+')}&limit=${limit}`
}

/**
 * Best *human* deep link for an AE list row → FDA FAERS Public Dashboard.
 * Raw openFDA JSON is available via `faersApiSearchUrl` / `faersEvidenceApiUrl`.
 */
export function faersRowDeepLink(input: {
  reactionName?: string | null
  reaction?: string | null
  drugName?: string | null
  moleculeName?: string | null
}): string {
  // Dashboard is the human-readable view. openFDA does not offer a stable
  // reaction-filtered HTML UI; label still carries reaction+drug for tooltips.
  void input
  return FAERS_DASHBOARD
}

/** Same as row deep link (dashboard) — explicit name for call sites. */
export function faersDashboardUrl(): string {
  return FAERS_DASHBOARD
}

/**
 * Evidence API URL (JSON) for the same reaction ± drug the panel used.
 * Prefer as secondary “API query ↗”, not the primary row click target.
 */
export function faersEvidenceApiUrl(input: {
  reactionName?: string | null
  reaction?: string | null
  drugName?: string | null
  moleculeName?: string | null
  limit?: number
}): string {
  const reaction = (input.reactionName || input.reaction || '').trim()
  const drug = (input.drugName || input.moleculeName || '').trim()
  return faersApiSearchUrl({
    reaction: reaction || null,
    drugName: drug || null,
    limit: input.limit ?? 10,
  })
}

/** openFDA API overview (docs) — only as last-resort label link. */
export function faersDocsUrl(): string {
  return 'https://open.fda.gov/apis/drug/event/'
}

export function faersSearchTitle(reaction: string, drug?: string): string {
  if (reaction && drug) return `FDA FAERS Dashboard (${reaction} + ${drug})`
  if (reaction) return `FDA FAERS Dashboard (${reaction})`
  if (drug) return `FDA FAERS Dashboard (${drug})`
  return 'FDA FAERS Public Dashboard'
}

export function faersApiLinkTitle(reaction: string, drug?: string): string {
  if (reaction && drug) return `openFDA API query: ${reaction} + ${drug}`
  if (reaction) return `openFDA API query: ${reaction}`
  if (drug) return `openFDA API query: ${drug}`
  return 'openFDA drug event API'
}
