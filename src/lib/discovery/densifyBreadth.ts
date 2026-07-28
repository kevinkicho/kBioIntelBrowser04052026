/**
 * Multi-source free-API breadth densify for Discover shortlist.
 * Complements FAERS + EuropePMC with patents, OpenAlex, BindingDB,
 * Semantic Scholar (+ optional EuropePMC when not already harvested).
 */

import { getPatentsByMoleculeName } from '@/lib/api/patents'
import { getOpenAlexWorksByName } from '@/lib/api/openalex'
import { getBindingAffinitiesByName } from '@/lib/api/bindingdb'
import { getLiteratureHitCount } from '@/lib/api/europepmc'
import { getSemanticPapersByName } from '@/lib/api/semantic-scholar'
import { getNihGrantsByName } from '@/lib/api/nihreporter'

/** Keep low — densify already multiplies free-API sockets server-side. */
export const BREADTH_CONCURRENCY = 2
export const BREADTH_TIMEOUT_MS = 2500

export interface BreadthHarvestOpts {
  /** Skip EuropePMC when densify already harvested novelty hits */
  skipEuropePmc?: boolean
  /** Pre-known EuropePMC hit count from safety/novelty harvest */
  europePmcHits?: number
}

export interface BreadthHarvestRow {
  name: string
  patentCount: number
  openAlexCount: number
  bindingDbCount: number
  semanticCount: number
  nihGrantCount: number
  europePmcHits: number
  /** Combined novelty-ish hit proxy (deterministic, free APIs only) */
  litHitProxy: number
  sources: string[]
  timedOut: boolean
  failed: boolean
}

async function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      p,
      new Promise<T>((resolve) => {
        t = setTimeout(() => resolve(fallback), ms)
      }),
    ])
  } finally {
    if (t) clearTimeout(t)
  }
}

export async function harvestBreadthForName(
  name: string,
  opts?: BreadthHarvestOpts,
): Promise<BreadthHarvestRow> {
  let failed = false
  const sources: string[] = []

  try {
    const [patents, openAlex, binding, semantic, nih, epmc] = await Promise.all([
      withTimeout(
        getPatentsByMoleculeName(name).catch(() => {
          failed = true
          return []
        }),
        BREADTH_TIMEOUT_MS,
        [],
      ),
      withTimeout(
        getOpenAlexWorksByName(name).catch(() => {
          failed = true
          return []
        }),
        BREADTH_TIMEOUT_MS,
        [],
      ),
      withTimeout(
        getBindingAffinitiesByName(name).catch(() => {
          failed = true
          return []
        }),
        BREADTH_TIMEOUT_MS,
        [],
      ),
      withTimeout(
        getSemanticPapersByName(name, 5).catch(() => {
          failed = true
          return []
        }),
        BREADTH_TIMEOUT_MS,
        [],
      ),
      withTimeout(
        getNihGrantsByName(name).catch(() => {
          failed = true
          return []
        }),
        BREADTH_TIMEOUT_MS,
        [],
      ),
      opts?.skipEuropePmc
        ? Promise.resolve(opts.europePmcHits ?? 0)
        : withTimeout(
            getLiteratureHitCount(name).catch(() => {
              failed = true
              return 0
            }),
            BREADTH_TIMEOUT_MS,
            0,
          ),
    ])

    const patentCount = Array.isArray(patents) ? patents.length : 0
    const openAlexCount = Array.isArray(openAlex) ? openAlex.length : 0
    const bindingDbCount = Array.isArray(binding) ? binding.length : 0
    const semanticCount = Array.isArray(semantic) ? semantic.length : 0
    const nihGrantCount = Array.isArray(nih) ? nih.length : 0
    const europePmcHits =
      typeof epmc === 'number'
        ? epmc
        : typeof opts?.europePmcHits === 'number'
          ? opts.europePmcHits
          : 0

    if (patentCount > 0) sources.push('PatentsView')
    if (openAlexCount > 0) sources.push('OpenAlex')
    if (bindingDbCount > 0) sources.push('BindingDB')
    if (semanticCount > 0) sources.push('Semantic Scholar')
    if (nihGrantCount > 0) sources.push('NIH RePORTER')
    if (europePmcHits > 0) sources.push('Europe PMC')

    // Weighted proxy: full-text hit counts dominate; sample APIs contribute modestly
    const litHitProxy = Math.min(
      50_000,
      europePmcHits +
        openAlexCount * 25 +
        semanticCount * 20 +
        patentCount * 8 +
        nihGrantCount * 15 +
        bindingDbCount * 5,
    )

    return {
      name,
      patentCount,
      openAlexCount,
      bindingDbCount,
      semanticCount,
      nihGrantCount,
      europePmcHits,
      litHitProxy,
      sources,
      timedOut: false,
      failed,
    }
  } catch {
    return {
      name,
      patentCount: 0,
      openAlexCount: 0,
      bindingDbCount: 0,
      semanticCount: 0,
      nihGrantCount: 0,
      europePmcHits: opts?.europePmcHits ?? 0,
      litHitProxy: opts?.europePmcHits ?? 0,
      sources: [],
      timedOut: true,
      failed: true,
    }
  }
}

export async function harvestBreadthBatch(
  names: string[],
  concurrency = BREADTH_CONCURRENCY,
  optsByName?: Map<string, BreadthHarvestOpts>,
): Promise<Map<string, BreadthHarvestRow>> {
  const map = new Map<string, BreadthHarvestRow>()
  let i = 0
  async function worker() {
    while (i < names.length) {
      const idx = i++
      const n = names[idx]!
      const key = n.toLowerCase()
      map.set(key, await harvestBreadthForName(n, optsByName?.get(key)))
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(1, names.length)) }, () =>
      worker(),
    ),
  )
  return map
}

/** Pure helper: merge breadth lit proxy into a prior hit count (max). */
export function mergeLitHitProxy(priorHits: number, litHitProxy: number): number {
  return Math.max(Math.max(0, priorHits || 0), Math.max(0, litHitProxy || 0))
}
