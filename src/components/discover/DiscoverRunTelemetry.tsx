'use client'

import Link from 'next/link'
import type { RankResult } from '@/lib/candidateRanker'
import { DISCOVER_PIPELINE_STAGES } from '@/lib/discovery/algorithmGuide'

interface Props {
  result: RankResult
  /** Client rank cache hit */
  fromCache?: boolean
  harvestStatus?: string
  slowStageMs?: number
}

const STAGE_MS_KEYS: { key: string; label: string; guideId: string }[] = [
  { key: 'disease', label: 'Disease', guideId: 'disease' },
  { key: 'targets', label: 'Targets', guideId: 'targets' },
  { key: 'gather', label: 'Gather', guideId: 'gather' },
  { key: 'identity', label: 'Identity', guideId: 'identity' },
  { key: 'cheapScore', label: 'Score', guideId: 'score' },
  { key: 'safetyHarvest', label: 'Harvest', guideId: 'harvest' },
  { key: 'total', label: 'Total', guideId: 'score' },
]

/**
 * Post-rank “this run” strip: timing, phase, cache, identity trust counts.
 */
export function DiscoverRunTelemetry({
  result,
  fromCache,
  harvestStatus,
  slowStageMs = 8000,
}: Props) {
  const timing = (result.v2?.timingMs ?? {}) as Record<string, number | undefined>
  const highTrust =
    result.v2?.candidates?.filter((c) => c.identity?.identityTrust === 'high').length ?? 0
  const totalDomain = result.v2?.candidates?.length ?? result.candidates.length
  const phase = result.v2?.scorePhase ?? 'cheap'
  const totalMs = typeof timing.total === 'number' ? timing.total : null

  const stages = STAGE_MS_KEYS.filter(
    (s) => s.key === 'total' || typeof timing[s.key] === 'number',
  )

  const slow = stages.filter(
    (s) => s.key !== 'total' && typeof timing[s.key] === 'number' && (timing[s.key] as number) >= slowStageMs,
  )

  return (
    <div
      className="mb-4 rounded-xl border border-slate-800 bg-slate-900/50 p-3"
      data-testid="discover-run-telemetry"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p className="text-[11px] font-semibold text-slate-300">
          This run
          {fromCache ? (
            <span className="ml-2 rounded-full border border-amber-800/50 bg-amber-950/30 px-2 py-0.5 text-[9px] text-amber-300">
              cached
            </span>
          ) : (
            <span className="ml-2 rounded-full border border-emerald-800/50 bg-emerald-950/30 px-2 py-0.5 text-[9px] text-emerald-300">
              live
            </span>
          )}
        </p>
        <Link
          href="/how-it-works#discover_rank"
          className="text-[10px] text-indigo-400 hover:underline"
        >
          How ranking works →
        </Link>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span>
          Phase:{' '}
          <span className="text-slate-300">{phase}</span>
        </span>
        {totalMs != null && (
          <span>
            Wall:{' '}
            <span className="font-mono text-slate-300 tabular-nums">
              {totalMs < 1000 ? `${Math.round(totalMs)}ms` : `${(totalMs / 1000).toFixed(1)}s`}
            </span>
          </span>
        )}
        <span>
          Identity high-trust:{' '}
          <span className="text-slate-300 tabular-nums">
            {highTrust}/{totalDomain}
          </span>
        </span>
        {harvestStatus && harvestStatus !== 'idle' && (
          <span>
            Harvest: <span className="text-slate-300">{harvestStatus}</span>
          </span>
        )}
        {result.generatedAt && (
          <span className="text-slate-600" title={result.generatedAt}>
            At {new Date(result.generatedAt).toLocaleString()}
          </span>
        )}
      </div>

      {stages.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {stages.map((s) => {
            const ms = timing[s.key] as number | undefined
            const isSlow = s.key !== 'total' && ms != null && ms >= slowStageMs
            return (
              <Link
                key={s.key}
                href={`/how-it-works#discover_rank`}
                className={`rounded-full border px-2 py-0.5 text-[9px] tabular-nums ${
                  isSlow
                    ? 'border-amber-700/50 bg-amber-950/30 text-amber-200'
                    : 'border-slate-800 text-slate-500 hover:text-slate-300'
                }`}
                title={
                  isSlow
                    ? `${s.label} took ${(ms! / 1000).toFixed(1)}s — usually free-API latency; try deferred harvest if this is harvest.`
                    : DISCOVER_PIPELINE_STAGES.find((g) => g.id === s.guideId)?.short
                }
              >
                {s.label}
                {ms != null && (
                  <> · {ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`}</>
                )}
              </Link>
            )
          })}
        </div>
      )}

      {slow.length > 0 && (
        <p className="mt-2 text-[10px] text-amber-400/90" data-testid="discover-slow-stage-warn">
          Slow stage{slow.length > 1 ? 's' : ''}:{' '}
          {slow.map((s) => s.label).join(', ')} — free public APIs can lag; Preferences → deferred
          harvest speeds first paint.
        </p>
      )}
    </div>
  )
}
