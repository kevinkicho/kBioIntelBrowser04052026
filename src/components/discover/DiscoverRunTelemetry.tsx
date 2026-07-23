'use client'

import Link from 'next/link'
import type { RankResult } from '@/lib/candidateRanker'
import { DISCOVER_PIPELINE_STAGES } from '@/lib/discovery/algorithmGuide'
import { HelperTip } from '@/components/ui/HelperTip'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

interface Props {
  result: RankResult
  /** Client rank cache hit */
  fromCache?: boolean
  harvestStatus?: string
  slowStageMs?: number
  /** Open Discover Preferences (deferred harvest, rubric). */
  onOpenPreferences?: () => void
  /** Scroll to algorithm guide on this page if present. */
  onOpenAlgorithmGuide?: () => void
}

const STAGE_MS_KEYS: {
  key: string
  label: string
  guideId: string
  /** how-it-works hash */
  howHash: string
}[] = [
  { key: 'disease', label: 'Disease', guideId: 'disease', howHash: 'discover_rank' },
  { key: 'targets', label: 'Targets', guideId: 'targets', howHash: 'discover_rank' },
  { key: 'gather', label: 'Gather', guideId: 'gather', howHash: 'discover_rank' },
  { key: 'identity', label: 'Identity', guideId: 'identity', howHash: 'discover_rank' },
  { key: 'cheapScore', label: 'Score', guideId: 'score', howHash: 'discover_rank' },
  { key: 'safetyHarvest', label: 'Harvest', guideId: 'harvest', howHash: 'discover_rank' },
  { key: 'total', label: 'Total', guideId: 'score', howHash: 'discover_rank' },
]

function formatMs(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`
}

/**
 * Post-rank “this run” strip: timing, phase, cache, identity trust counts.
 * Stage chips jump to on-page algorithm guide anchors or how-it-works.
 */
export function DiscoverRunTelemetry({
  result,
  fromCache,
  harvestStatus,
  slowStageMs = 8000,
  onOpenPreferences,
  onOpenAlgorithmGuide,
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
    (s) =>
      s.key !== 'total' &&
      typeof timing[s.key] === 'number' &&
      (timing[s.key] as number) >= slowStageMs,
  )

  function goToStage(guideId: string) {
    if (typeof document === 'undefined') {
      onOpenAlgorithmGuide?.()
      return
    }
    // Expand hero “How ranking works” accordion if present, then scroll to stage.
    const guideRoot = document.querySelector('[data-testid="discover-algorithm-guide"]')
    const expandBtn = guideRoot?.querySelector(
      'button[aria-expanded="false"]',
    ) as HTMLButtonElement | null
    expandBtn?.click()
    onOpenAlgorithmGuide?.()

    const tryScroll = (attempt: number) => {
      const el = document.getElementById(`discover-pipeline-${guideId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('ring-2', 'ring-indigo-500/50')
        window.setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500/50'), 1600)
        return
      }
      if (attempt < 8) {
        window.setTimeout(() => tryScroll(attempt + 1), 50)
      } else {
        window.location.href = `/how-it-works#discover_rank`
      }
    }
    window.setTimeout(() => tryScroll(0), expandBtn ? 80 : 0)
  }

  return (
    <div
      className="mb-4 rounded-xl border border-slate-800 bg-slate-900/50 p-3"
      data-testid="discover-run-telemetry"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="min-w-0 flex flex-wrap items-center gap-1.5">
          <p className="text-[11px] font-semibold text-slate-200">This run</p>
          {fromCache ? (
            <span className="rounded-full border border-amber-800/50 bg-amber-950/30 px-2 py-0.5 text-[9px] text-amber-300">
              cached
            </span>
          ) : (
            <span className="rounded-full border border-emerald-800/50 bg-emerald-950/30 px-2 py-0.5 text-[9px] text-emerald-300">
              live
            </span>
          )}
          <HelperTip
            content="Wall-clock stages for the last rank. Click a stage for what it does; open Preferences to switch deferred harvest (faster first paint)."
            label="About this run"
            testId="discover-telemetry-help"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onOpenPreferences && (
            <button
              type="button"
              onClick={onOpenPreferences}
              className="rounded-lg border border-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:border-indigo-600 hover:text-indigo-300"
              data-testid="discover-telemetry-prefs"
            >
              Preferences
            </button>
          )}
          <Link
            href="/how-it-works#discover_rank"
            className="rounded-lg border border-indigo-800/40 bg-indigo-950/30 px-2 py-1 text-[10px] text-indigo-300 hover:bg-indigo-900/40"
            data-testid="discover-telemetry-how"
          >
            How ranking works
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span>
          Phase:{' '}
          <StyledTooltip
            content={
              phase === 'cheap'
                ? 'Cheap score only — safety/novelty axes empty until harvest or promote-time load.'
                : 'Full score includes safety/novelty harvest axes.'
            }
          >
            <button
              type="button"
              className="text-slate-300 underline decoration-dotted decoration-slate-600 underline-offset-2"
              onClick={() => goToStage('score')}
            >
              {phase}
            </button>
          </StyledTooltip>
        </span>
        {totalMs != null && (
          <span>
            Wall:{' '}
            <span className="font-mono text-slate-300 tabular-nums">{formatMs(totalMs)}</span>
          </span>
        )}
        <span>
          Identity high-trust:{' '}
          <StyledTooltip content="How many shortlist molecules resolved to high-trust PubChem identity (InChIKey). Click to jump to identity stage notes.">
            <button
              type="button"
              className="text-slate-300 tabular-nums underline decoration-dotted decoration-slate-600 underline-offset-2"
              onClick={() => goToStage('identity')}
            >
              {highTrust}/{totalDomain}
            </button>
          </StyledTooltip>
        </span>
        {harvestStatus && harvestStatus !== 'idle' && (
          <span>
            Harvest: <span className="text-slate-300">{harvestStatus}</span>
          </span>
        )}
        {result.generatedAt && (
          <StyledTooltip content={result.generatedAt}>
            <span className="text-slate-600">
              At {new Date(result.generatedAt).toLocaleString()}
            </span>
          </StyledTooltip>
        )}
      </div>

      {stages.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {stages.map((s) => {
            const ms = timing[s.key] as number | undefined
            const isSlow = s.key !== 'total' && ms != null && ms >= slowStageMs
            const guide = DISCOVER_PIPELINE_STAGES.find((g) => g.id === s.guideId)
            const tip = isSlow
              ? `${s.label} took ${formatMs(ms!)} — free-API latency. ${
                  s.key === 'gather' || s.key === 'safetyHarvest'
                    ? 'Open Preferences → deferred harvest for faster first paint.'
                    : ''
                }\n${guide?.short ?? ''}`
              : `${guide?.title ?? s.label}: ${guide?.short ?? 'Pipeline stage'}\nClick for on-page guide · or How ranking works for full catalog.`
            return (
              <StyledTooltip key={s.key} content={tip}>
                <button
                  type="button"
                  onClick={() => {
                    if (s.key === 'total') {
                      window.location.href = `/how-it-works#${s.howHash}`
                      return
                    }
                    goToStage(s.guideId)
                  }}
                  className={`rounded-full border px-2 py-0.5 text-[9px] tabular-nums transition-colors ${
                    isSlow
                      ? 'border-amber-700/50 bg-amber-950/30 text-amber-200 hover:bg-amber-900/40'
                      : 'border-slate-700 text-slate-400 hover:border-indigo-600/50 hover:text-indigo-300'
                  }`}
                  data-testid={`discover-telemetry-stage-${s.key}`}
                >
                  {s.label}
                  {ms != null && <> · {formatMs(ms)}</>}
                </button>
              </StyledTooltip>
            )
          })}
        </div>
      )}

      {slow.length > 0 && (
        <p className="mt-2 text-[10px] text-amber-400/90" data-testid="discover-slow-stage-warn">
          Slow stage{slow.length > 1 ? 's' : ''}: {slow.map((s) => s.label).join(', ')} — free
          public APIs can lag.{' '}
          {onOpenPreferences ? (
            <button
              type="button"
              onClick={onOpenPreferences}
              className="underline decoration-dotted underline-offset-2 hover:text-amber-200"
            >
              Open Preferences → deferred harvest
            </button>
          ) : (
            <span>Preferences → deferred harvest speeds first paint.</span>
          )}
        </p>
      )}
    </div>
  )
}
