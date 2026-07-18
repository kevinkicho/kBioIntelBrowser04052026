import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import type { SIDERSideEffect } from '@/lib/types'

interface SIDERPanelProps {
  sideEffects?: SIDERSideEffect[]
  panelId?: string
  lastFetched?: Date
}

/**
 * Normalize free-text frequency buckets from openFDA-derived SIDER-compatible rows
 * (e.g. "common (~12 reports)") into display groups.
 */
function frequencyBucket(raw: string | undefined): string {
  const s = (raw || 'unknown').toLowerCase()
  if (s.includes('very frequent') || s.includes('very common')) return 'Very frequent'
  if (s.includes('frequent') || s.includes('common')) return 'Common'
  if (s.includes('occasional') || s.includes('infrequent')) return 'Infrequent'
  if (s.includes('very rare')) return 'Very rare'
  if (s.includes('rare')) return 'Rare'
  if (s.includes('unknown') || !raw) return 'Unknown'
  // Keep custom label (e.g. "common (~12 reports)") as its own bucket if unmatched
  return raw!.trim() || 'Unknown'
}

const BUCKET_ORDER = [
  'Very frequent',
  'Common',
  'Frequent',
  'Infrequent',
  'Occasional',
  'Rare',
  'Very rare',
  'Unknown',
]

export const SIDERPanel = memo(function SIDERPanel({
  sideEffects,
  panelId,
  lastFetched,
}: SIDERPanelProps) {
  const list = Array.isArray(sideEffects) ? sideEffects : []
  const isEmpty = list.length === 0
  const title = isEmpty ? 'SIDER' : `SIDER Side Effects (${list.length})`

  return (
    <Panel
      title={title}
      panelId={panelId}
      lastFetched={lastFetched}
      empty={
        isEmpty
          ? 'No side-effect labels found (openFDA FAERS reactions for this name).'
          : undefined
      }
    >
      {!isEmpty &&
        (() => {
          const groupedByFrequency = list.reduce(
            (acc, effect) => {
              const freq = frequencyBucket(effect.frequency)
              if (!acc[freq]) acc[freq] = []
              acc[freq].push(effect)
              return acc
            },
            {} as Record<string, SIDERSideEffect[]>,
          )

          // Known buckets first, then any leftover keys alphabetically
          const keys = [
            ...BUCKET_ORDER.filter((k) => (groupedByFrequency[k]?.length ?? 0) > 0),
            ...Object.keys(groupedByFrequency)
              .filter((k) => !BUCKET_ORDER.includes(k))
              .sort(),
          ]

          return (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {keys.map((freq) => {
                const effects = groupedByFrequency[freq]
                if (!effects?.length) return null

                return (
                  <div key={freq}>
                    <h4 className="text-xs font-medium text-slate-300 mb-1 flex items-center gap-2">
                      {freq}
                      <span className="text-xs px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">
                        {effects.length}
                      </span>
                    </h4>
                    <ul className="space-y-0.5 pl-2">
                      {effects.slice(0, 15).map((effect, idx) => {
                        const href =
                          effect.url ||
                          (effect.sideEffectName
                            ? `https://www.ncbi.nlm.nih.gov/medgen/?term=${encodeURIComponent(effect.sideEffectName)}`
                            : undefined)
                        return (
                          <li key={`${effect.sideEffectName}-${idx}`} className="text-xs text-slate-400">
                            <span className="text-slate-500">• </span>
                            {href ? (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-300 hover:text-indigo-300 hover:underline"
                              >
                                {effect.sideEffectName}
                              </a>
                            ) : (
                              effect.sideEffectName
                            )}
                            {effect.frequency && (
                              <span className="text-slate-600 ml-1 text-[10px]">
                                ({effect.frequency})
                              </span>
                            )}
                          </li>
                        )
                      })}
                      {effects.length > 15 && (
                        <li className="text-xs text-slate-500">
                          +{effects.length - 15} more in this bucket
                        </li>
                      )}
                    </ul>
                  </div>
                )
              })}
            </div>
          )
        })()}
    </Panel>
  )
})
