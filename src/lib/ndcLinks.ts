/**
 * Deep links for FDA NDC Directory products (openFDA drug/ndc).
 */

const OPENFDA_NDC = 'https://api.fda.gov/drug/ndc.json'
const DAILYMED = 'https://dailymed.nlm.nih.gov/dailymed'
const FDA_NDC_DIR = 'https://www.accessdata.fda.gov/scripts/cder/ndc/index.cfm'

/** Normalize product NDC (keep hyphen form when present). */
export function normalizeProductNdc(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  const t = raw.trim()
  // 4-4, 5-3, 5-4 product NDC styles
  if (/^\d{4,5}-\d{3,4}$/.test(t)) return t
  // digits only → leave as-is for API search
  if (/^\d{7,11}$/.test(t)) return t
  if (/^[\d-]+$/.test(t) && t.length >= 5) return t
  return t || null
}

/**
 * Exact openFDA NDC JSON record — source of truth for panel data.
 * Opens in browser as readable JSON (same API we query).
 */
export function openFdaNdcApiUrl(productNdc: string | null | undefined): string | null {
  const ndc = normalizeProductNdc(productNdc)
  if (!ndc) return null
  return `${OPENFDA_NDC}?search=product_ndc:"${encodeURIComponent(ndc)}"&limit=1`
}

/** DailyMed label search by NDC (human-readable labels when available). */
export function dailyMedNdcSearchUrl(productNdc: string | null | undefined): string | null {
  const ndc = normalizeProductNdc(productNdc)
  if (!ndc) return null
  return `${DAILYMED}/search.cfm?labeltype=all&query=${encodeURIComponent(ndc)}`
}

/** DailyMed search by brand/generic name. */
export function dailyMedNameSearchUrl(name: string | null | undefined): string | null {
  const q = name?.trim()
  if (!q) return null
  return `${DAILYMED}/search.cfm?labeltype=all&query=${encodeURIComponent(q)}`
}

/**
 * Best user-facing deep link for an NDC list row:
 * 1) openFDA exact product_ndc record
 * 2) DailyMed NDC search
 * 3) DailyMed brand/generic search
 * 4) FDA NDC Directory home
 */
export function ndcProductDeepLink(input: {
  productNdc?: string | null
  brandName?: string | null
  genericName?: string | null
  url?: string | null
}): string {
  // Prefer rebuilding from productNdc — stored urls may be weak DailyMed queries
  const api = openFdaNdcApiUrl(input.productNdc)
  if (api) return api

  if (input.url?.trim()) {
    const u = input.url.trim()
    // Reject empty or bare homepage
    if (/dailymed\.nlm\.nih\.gov/i.test(u) && /query=[\d-]+/.test(u)) return u
    if (/api\.fda\.gov\/drug\/ndc/i.test(u)) return u
  }

  return (
    dailyMedNdcSearchUrl(input.productNdc) ||
    dailyMedNameSearchUrl(input.brandName || input.genericName) ||
    FDA_NDC_DIR
  )
}

/** Secondary link: DailyMed labels for the NDC (when primary is openFDA JSON). */
export function ndcSecondaryLabelLink(input: {
  productNdc?: string | null
  brandName?: string | null
  genericName?: string | null
}): string | null {
  return (
    dailyMedNdcSearchUrl(input.productNdc) ||
    dailyMedNameSearchUrl(input.brandName || input.genericName)
  )
}

export function ndcRowTitle(input: {
  productNdc?: string | null
  brandName?: string | null
  genericName?: string | null
}): string {
  const name = input.brandName || input.genericName || 'product'
  const ndc = normalizeProductNdc(input.productNdc)
  if (ndc) return `FDA NDC ${ndc}: ${name}`
  return `FDA NDC: ${name}`
}
