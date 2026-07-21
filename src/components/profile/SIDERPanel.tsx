'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { SIDERSideEffect } from '@/lib/types'
import { alphaSortOptions, compareText } from '@/lib/listControls'
import { isBrokenSourceShellUrl } from '@/lib/deepLinkPolicy'
import { siderSideEffectDeepLink } from '@/lib/api/sider'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

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
  return raw!.trim() || 'Unknown'
}

const BUCKET_RANK: Record<string, number> = {
  'Very frequent': 0,
  Common: 1,
  Frequent: 2,
  Infrequent: 3,
  Occasional: 4,
  Rare: 5,
  'Very rare': 6,
  Unknown: 7,
}

function SideEffectItem({ effect }: { effect: SIDERSideEffect }) {
  // Strict: only real http deep links (SIDER SE / MedGen). Never API-docs shells.
  const candidate = effect.url?.trim() || siderSideEffectDeepLink(effect) || ''
  const href =
    candidate && !isBrokenSourceShellUrl(candidate) && /^https?:\/\//i.test(candidate)
      ? candidate
      : null
  const bucket = frequencyBucket(effect.frequency)

  return (
    <div
      className="py-1.5 border-b border-slate-700/50 last:border-0 flex items-start justify-between gap-2"
      data-testid="sider-side-effect-item"
      data-clickable={href ? 'true' : 'false'}
    >
      <div className="min-w-0">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-200 hover:text-indigo-300 hover:underline"
            data-testid="sider-side-effect-link"
            onClick={() =>
              onDeepLinkClick('other', href, {
                panelId: 'sider',
                label: effect.sideEffectName,
              })
            }
          >
            {effect.sideEffectName}
          </a>
        ) : (
          <span className="text-sm text-slate-200" data-testid="sider-side-effect-plain">
            {effect.sideEffectName}
          </span>
        )}
        {effect.frequency && (
          <p className="text-[10px] text-slate-600 mt-0.5">{effect.frequency}</p>
        )}
        {effect.source && (
          <p className="text-[9px] text-slate-600 mt-0.5">{effect.source}</p>
        )}
      </div>
      <span className="text-[10px] shrink-0 px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
        {bucket}
      </span>
    </div>
  )
}

export const SIDERPanel = memo(function SIDERPanel({
  sideEffects,
  panelId,
  lastFetched,
}: SIDERPanelProps) {
  const list = Array.isArray(sideEffects) ? sideEffects : []
  const isEmpty = list.length === 0
  const title = isEmpty ? 'SIDER' : `SIDER Side Effects (${list.length})`

  const sortOptions = useMemo(
    () => [
      {
        id: 'freq-asc',
        label: 'Most frequent first',
        compare: (a: SIDERSideEffect, b: SIDERSideEffect) => {
          const ra = BUCKET_RANK[frequencyBucket(a.frequency)] ?? 99
          const rb = BUCKET_RANK[frequencyBucket(b.frequency)] ?? 99
          if (ra !== rb) return ra - rb
          return compareText(a.sideEffectName || '', b.sideEffectName || '')
        },
      },
      {
        id: 'freq-desc',
        label: 'Rarest first',
        compare: (a: SIDERSideEffect, b: SIDERSideEffect) => {
          const ra = BUCKET_RANK[frequencyBucket(a.frequency)] ?? 99
          const rb = BUCKET_RANK[frequencyBucket(b.frequency)] ?? 99
          if (ra !== rb) return rb - ra
          return compareText(a.sideEffectName || '', b.sideEffectName || '')
        },
      },
      ...alphaSortOptions<SIDERSideEffect>((e) => e.sideEffectName || ''),
    ],
    [],
  )

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
      {!isEmpty && (
        <FilterablePaginatedList
          items={list}
          getSearchText={(e) =>
            [e.sideEffectName, e.frequency, frequencyBucket(e.frequency)].filter(Boolean).join(' ')
          }
          sortOptions={sortOptions}
          defaultSortId="freq-asc"
          filterPlaceholder="Filter side effects…"
          getKey={(e, i) => `${e.sideEffectName}-${i}`}
          pageSize={10}
          renderItem={(effect) => <SideEffectItem effect={effect} />}
        />
      )}
    </Panel>
  )
})
