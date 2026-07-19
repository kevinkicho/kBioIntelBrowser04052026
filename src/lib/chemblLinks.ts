/**
 * Stable ChEMBL UI deep links.
 *
 * ChEMBL v33+ UI uses `/explore/{entity}/{id}` (legacy `*_report_card` redirects).
 * Avoid `/g/#…` SPA hashes and bare `chembl/` homepage — those dump users on the main page.
 */

const CHEMBL_WEB = 'https://www.ebi.ac.uk/chembl'

/** Normalize to CHEMBL##### (uppercase). Returns null if unusable. */
export function normalizeChemblId(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const t = String(raw).trim()
  if (!t) return null
  const upper = t.toUpperCase()
  if (upper.startsWith('CHEMBL')) {
    const rest = upper.slice(6).replace(/\D/g, '')
    return rest ? `CHEMBL${rest}` : null
  }
  // bare numeric id
  if (/^\d+$/.test(t)) return `CHEMBL${t}`
  // CHEMBL with junk
  const m = upper.match(/CHEMBL\s*(\d+)/i)
  if (m) return `CHEMBL${m[1]}`
  return null
}

/** Extract first CHEMBL id from a free-form string/URL. */
export function extractChemblId(raw: string | null | undefined): string | null {
  if (!raw) return null
  const m = String(raw).match(/CHEMBL\s*(\d+)/i)
  return m ? `CHEMBL${m[1]}` : null
}

/**
 * True only for stable entity deep links (not homepage, not /g/# SPA shells).
 */
export function isStableChemblDeepLink(url: string | null | undefined): boolean {
  if (!url?.trim()) return false
  const u = url.trim()
  if (!/ebi\.ac\.uk\/chembl/i.test(u) && !/chembl/i.test(u)) return false
  if (/\/g\/#/i.test(u)) return false
  // Bare homepage e.g. https://www.ebi.ac.uk/chembl/ or /chembl
  const pathOnly = u.replace(/[?#].*$/, '').replace(/\/+$/, '')
  if (/\/chembl$/i.test(pathOnly)) return false
  return (
    /\/explore\/(compound|target|assay|document|drug_indications|drug_mechanisms)\//i.test(u) ||
    /\/(compound|target|assay|document)_report_card\//i.test(u) ||
    /\/embed\/report_cards\//i.test(u)
  )
}

export function chemblCompoundUrl(chemblId: string | null | undefined): string | null {
  const id = normalizeChemblId(chemblId)
  // Modern explore UI (no extra redirect hop from legacy report_card paths)
  return id ? `${CHEMBL_WEB}/explore/compound/${id}` : null
}

/**
 * Compound explore page focused on Drug Indications (user-facing navigation).
 * Prefer this over embed/* — embed URLs are iframe shells and feel “weird” in a new tab.
 */
export function chemblCompoundIndicationsUrl(chemblId: string | null | undefined): string | null {
  const id = normalizeChemblId(chemblId)
  if (!id) return null
  return `${CHEMBL_WEB}/explore/compound/${id}#DrugIndications`
}

/**
 * @deprecated Prefer chemblCompoundIndicationsUrl (same destination now).
 * Kept for callers that want an explicit “section” name.
 */
export function chemblCompoundIndicationsSectionUrl(
  chemblId: string | null | undefined,
): string | null {
  return chemblCompoundIndicationsUrl(chemblId)
}

/**
 * Embed-only indications table (iframe). Prefer chemblCompoundIndicationsUrl for deep links.
 */
export function chemblCompoundIndicationsEmbedUrl(
  chemblId: string | null | undefined,
): string | null {
  const id = normalizeChemblId(chemblId)
  if (!id) return null
  return `${CHEMBL_WEB}/embed/report_cards/compound/sections/drug_indications/${id}`
}

export function chemblTargetUrl(targetChemblId: string | null | undefined): string | null {
  const id = normalizeChemblId(targetChemblId)
  return id ? `${CHEMBL_WEB}/explore/target/${id}` : null
}

export function chemblAssayUrl(assayChemblId: string | null | undefined): string | null {
  const id = normalizeChemblId(assayChemblId)
  return id ? `${CHEMBL_WEB}/explore/assay/${id}` : null
}

export function chemblDocumentUrl(documentChemblId: string | null | undefined): string | null {
  const id = normalizeChemblId(documentChemblId)
  return id ? `${CHEMBL_WEB}/explore/document/${id}` : null
}

/** Free-text search when no structured ChEMBL id is available. */
export function chemblSearchUrl(query: string | number | null | undefined): string | null {
  if (query == null) return null
  const q = String(query).trim()
  if (!q) return null
  // Explore compounds browser with query (more reliable than /g/#search shells)
  return `${CHEMBL_WEB}/explore/compounds/QUERYSTRING:${encodeURIComponent(q)}`
}

/**
 * Best direct link for a bioactivity row: target card → assay → molecule → search.
 */
export function chemblActivityDeepLink(input: {
  targetChemblId?: string | null
  assayChemblId?: string | null
  moleculeChemblId?: string | null
  chemblId?: string | null
  activityId?: string | null
}): string {
  return (
    chemblTargetUrl(input.targetChemblId) ||
    chemblAssayUrl(input.assayChemblId) ||
    chemblCompoundUrl(input.moleculeChemblId || input.chemblId) ||
    chemblSearchUrl(input.activityId || input.chemblId || 'chembl') ||
    `${CHEMBL_WEB}/explore/compounds/`
  )
}

/**
 * Mechanism row: prefer target, fall back to molecule compound card.
 */
export function chemblMechanismDeepLink(input: {
  targetChemblId?: string | null
  moleculeChemblId?: string | null
}): string {
  return (
    chemblTargetUrl(input.targetChemblId) ||
    chemblCompoundUrl(input.moleculeChemblId) ||
    `${CHEMBL_WEB}/explore/compounds/`
  )
}

/**
 * Indication list-item deep link (user opens in a new tab).
 *
 * Prefer **condition-specific** ontology pages when we have MeSH/EFO ids —
 * those match the row the user clicked. Fall back to the molecule’s ChEMBL
 * compound card (#DrugIndications). Never use embed/* or /g/# SPA shells.
 */
export function chemblIndicationDeepLink(input: {
  moleculeChemblId?: string | null
  meshId?: string | null
  efoId?: string | null
  condition?: string | null
}): string {
  const mesh = input.meshId?.trim()
  if (mesh) {
    const meshClean = mesh.replace(/^MESH:/i, '')
    return `https://meshb.nlm.nih.gov/record/ui?ui=${encodeURIComponent(meshClean)}`
  }
  const efo = input.efoId?.trim()
  if (efo) {
    // OLS4 term page — stable for EFO_##### and full IRIs
    const efoIri = efo.includes('http')
      ? efo
      : `http://www.ebi.ac.uk/efo/${efo.replace(/:/g, '_')}`
    return `https://www.ebi.ac.uk/ols4/ontologies/efo/terms?iri=${encodeURIComponent(efoIri)}`
  }
  const compoundInd = chemblCompoundIndicationsUrl(input.moleculeChemblId)
  if (compoundInd) return compoundInd
  return (
    chemblSearchUrl(input.condition) || `${CHEMBL_WEB}/explore/drug_indications/`
  )
}
