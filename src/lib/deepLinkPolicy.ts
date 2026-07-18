/**
 * Product rule: list-item deep links must open a *source record*, not a homepage SPA shell.
 * Prefer source-specific builders (chemblLinks, unichemMappingDeepLink, atcDeepLink, …).
 */

/** True for URLs that dump users on a source homepage or broken SPA hash shell. */
export function isBrokenSourceShellUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return true
  const u = url.trim()
  if (!/^https?:\/\//i.test(u)) return true

  // ChEMBL legacy SPA hash browse/search
  if (/ebi\.ac\.uk\/chembl\/g\/#/i.test(u)) return true
  // Bare ChEMBL homepage
  if (/ebi\.ac\.uk\/chembl\/?$/i.test(u.replace(/[?#].*$/, ''))) return true

  // UniChem SPA hash search
  if (/ebi\.ac\.uk\/unichem\/?#/i.test(u)) return true
  if (/ebi\.ac\.uk\/unichem\/?$/i.test(u.replace(/[?#].*$/, ''))) return true

  // DGIdb gene pages keyed by symbol alone often 404 client-side (need conceptId)
  // Keep results? and genes with conceptId (e.g. hgnc:9605) as OK
  const dgidbGene = u.match(/dgidb\.org\/genes\/([^/?#]+)/i)
  if (dgidbGene && !dgidbGene[1].includes(':')) return true

  return false
}

/** Prefer candidate if stable; else fallback (never empty string). */
export function preferStableDeepLink(
  candidate: string | null | undefined,
  fallback: string,
): string {
  if (candidate && !isBrokenSourceShellUrl(candidate)) return candidate
  return fallback
}
