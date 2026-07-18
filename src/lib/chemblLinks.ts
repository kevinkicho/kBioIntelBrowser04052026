/**
 * Stable ChEMBL UI deep links (report cards — not SPA hash routes that fail to open).
 * Prefer compound / target / assay report cards over /g/#search or bare chembl homepage.
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

export function chemblCompoundUrl(chemblId: string | null | undefined): string | null {
  const id = normalizeChemblId(chemblId)
  return id ? `${CHEMBL_WEB}/compound_report_card/${id}/` : null
}

/** Compound card + Drug Indications section anchor when supported by ChEMBL UI. */
export function chemblCompoundIndicationsUrl(chemblId: string | null | undefined): string | null {
  const base = chemblCompoundUrl(chemblId)
  return base ? `${base}#DrugIndications` : null
}

export function chemblTargetUrl(targetChemblId: string | null | undefined): string | null {
  const id = normalizeChemblId(targetChemblId)
  return id ? `${CHEMBL_WEB}/target_report_card/${id}/` : null
}

export function chemblAssayUrl(assayChemblId: string | null | undefined): string | null {
  const id = normalizeChemblId(assayChemblId)
  return id ? `${CHEMBL_WEB}/assay_report_card/${id}/` : null
}

export function chemblDocumentUrl(documentChemblId: string | null | undefined): string | null {
  const id = normalizeChemblId(documentChemblId)
  return id ? `${CHEMBL_WEB}/document_report_card/${id}/` : null
}

/** Free-text / CID search when no structured ChEMBL id is available. */
export function chemblSearchUrl(query: string | number | null | undefined): string | null {
  if (query == null) return null
  const q = String(query).trim()
  if (!q) return null
  return `${CHEMBL_WEB}/g/#search_results/all/query=${encodeURIComponent(q)}`
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
    `${CHEMBL_WEB}/`
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
    `${CHEMBL_WEB}/`
  )
}

/**
 * Indication row: molecule DrugIndications section, else MeSH/EFO external, else search.
 */
export function chemblIndicationDeepLink(input: {
  moleculeChemblId?: string | null
  meshId?: string | null
  efoId?: string | null
  condition?: string | null
}): string {
  const compoundInd = chemblCompoundIndicationsUrl(input.moleculeChemblId)
  if (compoundInd) return compoundInd
  const mesh = input.meshId?.trim()
  if (mesh) {
    // MeSH browser (direct record when D#####)
    const meshClean = mesh.replace(/^MESH:/i, '')
    return `https://meshb.nlm.nih.gov/record/ui?ui=${encodeURIComponent(meshClean)}`
  }
  const efo = input.efoId?.trim()
  if (efo) {
    const efoIri = efo.includes('http')
      ? efo
      : `http://www.ebi.ac.uk/efo/${efo.replace(':', '_')}`
    return `https://www.ebi.ac.uk/ols4/ontologies/efo/terms?iri=${encodeURIComponent(efoIri)}`
  }
  return chemblSearchUrl(input.condition) || `${CHEMBL_WEB}/`
}
