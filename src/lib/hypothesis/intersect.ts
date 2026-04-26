import type { MoleculeMatch, IntersectedMatch } from './types'

/**
 * Pure intersection of per-filter molecule matches.
 *
 * A molecule appears in the result iff it appears in EVERY input array
 * (matched by `cid`). Reasons from each filter are aggregated, deduped while
 * preserving order, and the molecule's name is taken from the first match
 * (filters that share a CID typically agree on the name).
 *
 * Edge cases:
 * - Empty input array → empty result (no filters means nothing to intersect).
 * - Any inner array is empty → empty result (one filter matched nothing).
 * - Single filter → all its matches with their single reason.
 */
export function intersectMatches(perFilterMatches: MoleculeMatch[][]): IntersectedMatch[] {
  if (perFilterMatches.length === 0) return []
  if (perFilterMatches.some(arr => arr.length === 0)) return []

  // Find the smallest filter result to drive the intersection (cheapest path).
  const sorted = [...perFilterMatches].sort((a, b) => a.length - b.length)
  const [seed, ...rest] = sorted

  // Build CID-set lookup for each remaining filter.
  const restSets = rest.map(arr => new Set(arr.map(m => m.cid)))

  const result: IntersectedMatch[] = []
  const seen = new Set<number>()

  for (const seedMatch of seed) {
    if (seen.has(seedMatch.cid)) continue
    if (!restSets.every(set => set.has(seedMatch.cid))) continue

    // Aggregate reasons from every filter for this CID, preserving order.
    const reasons: string[] = []
    const reasonSet = new Set<string>()
    let name = seedMatch.name

    for (const filterMatches of perFilterMatches) {
      for (const m of filterMatches) {
        if (m.cid !== seedMatch.cid) continue
        if (!reasonSet.has(m.reason)) {
          reasons.push(m.reason)
          reasonSet.add(m.reason)
        }
        if (!name && m.name) name = m.name
      }
    }

    seen.add(seedMatch.cid)
    result.push({ cid: seedMatch.cid, name, reasons })
  }

  return result
}
