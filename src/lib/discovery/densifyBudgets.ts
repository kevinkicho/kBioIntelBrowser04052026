/**
 * Environment-aware densify budgets — keep App Hosting rank within free-API latency walls.
 * Local/dev can run denser; managed Cloud Run uses tighter K / concurrency / timeouts.
 */

import { isCloudRunRuntime } from '@/lib/runtimeEnv'

export type DensifyBudgetProfile = 'local' | 'cloud' | 'test'

export interface DensifyBudgets {
  profile: DensifyBudgetProfile
  /** Top-K always densified at rank */
  densifyK: number
  /** Rare-disease densify K */
  densifyKRare: number
  /** Harvest concurrency (FAERS + novelty) */
  harvestConcurrency: number
  /** Safety harvest soft timeout ms */
  safetyTimeoutMs: number
  /** Novelty harvest soft timeout ms */
  noveltyTimeoutMs: number
  /** Multi-source breadth concurrency */
  breadthConcurrency: number
  /** Breadth per-API soft timeout ms */
  breadthTimeoutMs: number
  /** Rank-path similarity expand overall timeout ms */
  similarityTimeoutMs: number
  /** When true, skip multi-source breadth (cloud default for latency) */
  skipBreadthByDefault: boolean
  /** Server rank wall ms (API Promise.race) */
  rankServerTimeoutMs: number
}

const LOCAL: DensifyBudgets = {
  profile: 'local',
  densifyK: 10,
  densifyKRare: 6,
  harvestConcurrency: 4,
  safetyTimeoutMs: 3500,
  noveltyTimeoutMs: 2500,
  breadthConcurrency: 2,
  breadthTimeoutMs: 2500,
  similarityTimeoutMs: 12_000,
  skipBreadthByDefault: false,
  rankServerTimeoutMs: 50_000,
}

const CLOUD: DensifyBudgets = {
  profile: 'cloud',
  densifyK: 8,
  densifyKRare: 5,
  harvestConcurrency: 3,
  safetyTimeoutMs: 3000,
  noveltyTimeoutMs: 2200,
  breadthConcurrency: 2,
  breadthTimeoutMs: 2000,
  similarityTimeoutMs: 8_000,
  // Breadth multiplies free-API fan-out — optional on cloud for rank SLA
  skipBreadthByDefault: true,
  rankServerTimeoutMs: 45_000,
}

const TEST: DensifyBudgets = {
  profile: 'test',
  densifyK: 10,
  densifyKRare: 6,
  harvestConcurrency: 4,
  safetyTimeoutMs: 3500,
  noveltyTimeoutMs: 2500,
  breadthConcurrency: 2,
  breadthTimeoutMs: 2500,
  similarityTimeoutMs: 5_000,
  skipBreadthByDefault: false,
  rankServerTimeoutMs: 30_000,
}

/**
 * Resolve densify budgets for this process.
 * Overrides:
 * - DENSIFY_BUDGET_PROFILE=local|cloud|test
 * - DENSIFY_SKIP_BREADTH=1 force skip breadth
 * - DENSIFY_ENABLE_BREADTH=1 force enable breadth even on cloud
 */
export function resolveDensifyBudgets(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >,
): DensifyBudgets {
  const forced = (env.DENSIFY_BUDGET_PROFILE || '').toLowerCase()
  let base: DensifyBudgets
  if (forced === 'cloud') base = { ...CLOUD }
  else if (forced === 'local') base = { ...LOCAL }
  else if (forced === 'test' || env.NODE_ENV === 'test' || env.JEST_WORKER_ID) {
    base = { ...TEST }
  } else if (
    // Prefer explicit cloud signals without importing env when testing
    env.K_SERVICE ||
    env.K_REVISION ||
    env.NODE_ENV === 'production' ||
    (typeof process !== 'undefined' && isCloudRunRuntime())
  ) {
    base = { ...CLOUD }
  } else {
    base = { ...LOCAL }
  }

  const skipFlag = (env.DENSIFY_SKIP_BREADTH || '').toLowerCase()
  const enableFlag = (env.DENSIFY_ENABLE_BREADTH || '').toLowerCase()
  if (skipFlag === '1' || skipFlag === 'true') base.skipBreadthByDefault = true
  if (enableFlag === '1' || enableFlag === 'true') base.skipBreadthByDefault = false

  return base
}

/** Memoized for process lifetime (budgets are env-static). */
let cached: DensifyBudgets | null = null

export function getDensifyBudgets(): DensifyBudgets {
  if (!cached) cached = resolveDensifyBudgets()
  return cached
}

/** Test helper */
export function resetDensifyBudgetsCacheForTests(): void {
  cached = null
}
