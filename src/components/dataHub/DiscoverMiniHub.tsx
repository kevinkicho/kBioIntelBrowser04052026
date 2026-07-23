'use client'

/**
 * Compact research fact table on Discover candidate cards.
 */

import { useMemo } from 'react'
import {
  buildDiscoverMiniHub,
  type DiscoverMiniHubInput,
  isDataHubValueEmpty,
} from '@/lib/dataHub'
import { emptyDataClass } from '@/lib/summaryEmpty'
import { isBrokenSourceShellUrl } from '@/lib/deepLinkPolicy'
import { onDeepLinkClick } from '@/lib/trackDeepLink'
import { HelperTip } from '@/components/ui/HelperTip'

export interface DiscoverMiniHubProps {
  input: DiscoverMiniHubInput
  className?: string
  testId?: string
}

export function DiscoverMiniHub({
  input,
  className = '',
  testId = 'discover-mini-hub',
}: DiscoverMiniHubProps) {
  const ledger = useMemo(() => buildDiscoverMiniHub(input), [input])
  const rows = useMemo(
    () => ledger.rows.filter((r) => !isDataHubValueEmpty(r.value)),
    [ledger.rows],
  )

  if (rows.length === 0) return null

  return (
    <div
      className={`rounded-lg border border-slate-800/80 bg-slate-950/40 ${className}`}
      data-testid={testId}
      data-source-count={ledger.sourceCount}
    >
      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-800/60 px-2 py-1">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-semibold text-slate-300">Research facts</span>
          <HelperTip
            content={[
              'Gather-time public facts for this shortlist row.',
              'Does not change of-record Discover scores.',
              'Open the molecule profile Data hub for full multi-panel records.',
            ].join('\n\n')}
            label="About mini data hub"
            testId={`${testId}-help`}
          />
        </div>
        <span className="text-[9px] tabular-nums text-slate-500">
          {rows.length} facts · {ledger.sourceCount} sources
        </span>
      </div>
      <table className="w-full text-left">
        <tbody>
          {rows.map((r) => {
            const link =
              r.sourceUrl &&
              /^https?:\/\//i.test(r.sourceUrl) &&
              !isBrokenSourceShellUrl(r.sourceUrl)
                ? r.sourceUrl
                : null
            return (
              <tr
                key={r.id}
                data-testid={`${testId}-row-${r.id}`}
                className={`border-t border-slate-800/40 ${emptyDataClass(false)}`}
              >
                <td className="px-2 py-0.5 text-[9px] text-slate-500 w-[28%] align-top">
                  {r.fact}
                </td>
                <td className="px-2 py-0.5 text-[10px] text-slate-200 align-top">
                  <span className="break-words">{r.value}</span>
                </td>
                <td className="px-2 py-0.5 text-[9px] text-slate-500 w-[22%] align-top">
                  {r.source}
                </td>
                <td className="px-2 py-0.5 text-[9px] w-12 align-top">
                  {link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        onDeepLinkClick(r.source, link, { label: r.fact })
                      }
                      className="text-emerald-400 hover:underline"
                    >
                      ↗
                    </a>
                  ) : (
                    <span className="text-slate-700">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
