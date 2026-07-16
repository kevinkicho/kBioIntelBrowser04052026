/**
 * Deep-link helpers for `/discover?q=&diseaseId=&targets=`.
 * Used by disease/gene CTAs (PR7) so entry points share one URL contract.
 */

export const MAX_DISCOVER_TARGETS = 10

export interface DiscoverDeepLinkParams {
  /** Disease / phenotype query text */
  q?: string | null
  /** Hard-pin disease registry id (skips multi-hit picker) */
  diseaseId?: string | null
  /** Gene symbols to pin as targets (comma-joined in URL) */
  targets?: string | string[] | null
}

/**
 * Parse `targets` search param: comma, plus, or pipe separated gene symbols.
 * Dedupes (case-insensitive first-wins) and caps at MAX_DISCOVER_TARGETS.
 */
export function parseTargetsParam(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(/[,+|]/)) {
    const symbol = part.trim()
    if (!symbol) continue
    const key = symbol.toUpperCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(symbol)
    if (out.length >= MAX_DISCOVER_TARGETS) break
  }
  return out
}

function normalizeTargets(targets?: string | string[] | null): string[] {
  if (!targets) return []
  if (typeof targets === 'string') return parseTargetsParam(targets)
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of targets) {
    const symbol = String(t ?? '').trim()
    if (!symbol) continue
    const key = symbol.toUpperCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(symbol)
    if (out.length >= MAX_DISCOVER_TARGETS) break
  }
  return out
}

/**
 * Merge Orphanet rare-disease gene symbols into existing pins.
 * Existing pins keep priority; case-insensitive dedupe; cap at max.
 */
export function mergeOrphanetGenesIntoTargets(
  existing: string[],
  orphanetGenes: string[],
  max: number = MAX_DISCOVER_TARGETS,
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of [...existing, ...orphanetGenes]) {
    const symbol = String(raw ?? '').trim()
    if (!symbol) continue
    const key = symbol.toUpperCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(symbol)
    if (out.length >= max) break
  }
  return out
}

/**
 * Build a discover workbench href from disease/gene context.
 * Empty params → `/discover`.
 */
export function buildDiscoverHref(params: DiscoverDeepLinkParams = {}): string {
  const sp = new URLSearchParams()
  const q = params.q?.trim()
  if (q) sp.set('q', q)

  const diseaseId = params.diseaseId?.trim()
  if (diseaseId) sp.set('diseaseId', diseaseId)

  const targets = normalizeTargets(params.targets)
  if (targets.length > 0) sp.set('targets', targets.join(','))

  const qs = sp.toString()
  return qs ? `/discover?${qs}` : '/discover'
}
