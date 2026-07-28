'use client'

/**
 * Local hub change alerts: compare current of-record ledger to last saved snapshot.
 */

import { useMemo, useState } from 'react'
import type { DataHubLedger } from '@/lib/dataHub'
import {
  diffAgainstSavedHub,
  saveHubSnapshot,
  type HubChangeDiff,
  type HubSnapshot,
} from '@/lib/dataHub/hubChangeAlerts'
import { HelperTip } from '@/components/ui/HelperTip'

export function HubChangeAlertsPanel({
  ledger,
  entityType = 'molecule',
  className = '',
  testId = 'hub-change-alerts',
}: {
  ledger: DataHubLedger
  entityType?: HubSnapshot['entityType']
  className?: string
  testId?: string
}) {
  const [diff, setDiff] = useState<HubChangeDiff | null>(() =>
    typeof window !== 'undefined' ? diffAgainstSavedHub(ledger) : null,
  )
  const [savedFlash, setSavedFlash] = useState(false)

  const hasChanges = useMemo(
    () =>
      Boolean(
        diff &&
          (diff.added.length > 0 ||
            diff.removed.length > 0 ||
            diff.changed.length > 0),
      ),
    [diff],
  )

  return (
    <div
      className={`rounded-lg border border-slate-800/80 bg-slate-950/40 p-2.5 ${className}`}
      data-testid={testId}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Local change alerts
        </p>
        <HelperTip
          content="Solo-local only: saves a fingerprint of of-record hub facts in this browser. Reopen later to see added/removed/changed values. Not multi-tenant cloud."
          label="About hub change alerts"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded border border-slate-700 bg-slate-900/80 px-2 py-1 text-[10px] text-slate-300 hover:border-slate-500"
          data-testid={`${testId}-save`}
          onClick={() => {
            saveHubSnapshot(ledger, entityType)
            setDiff(null)
            setSavedFlash(true)
            window.setTimeout(() => setSavedFlash(false), 1500)
          }}
        >
          {savedFlash ? 'Saved baseline' : 'Save baseline'}
        </button>
        <button
          type="button"
          className="rounded border border-indigo-800/40 bg-indigo-950/30 px-2 py-1 text-[10px] text-indigo-300 hover:border-indigo-600/50"
          data-testid={`${testId}-diff`}
          onClick={() => setDiff(diffAgainstSavedHub(ledger))}
        >
          Diff vs baseline
        </button>
      </div>
      {!diff && (
        <p className="mt-1.5 text-[10px] text-slate-600">
          No baseline yet — save after a clean load, refresh, then diff.
        </p>
      )}
      {diff && !hasChanges && (
        <p className="mt-1.5 text-[10px] text-emerald-600/90" data-testid={`${testId}-same`}>
          No of-record fact changes vs baseline ({new Date(diff.previousAt).toLocaleString()}).
        </p>
      )}
      {diff && hasChanges && (
        <div className="mt-2 space-y-1 text-[10px] text-slate-400" data-testid={`${testId}-result`}>
          <p className="text-slate-300">{diff.summary}</p>
          <p className="text-slate-600">
            Baseline {new Date(diff.previousAt).toLocaleString()} · session samples only
          </p>
          {diff.changed.slice(0, 8).map((c) => (
            <p key={c.id}>
              <span className="text-amber-300/90">~</span> {c.fact}: {c.before} → {c.after}
            </p>
          ))}
          {diff.added.slice(0, 5).map((a) => (
            <p key={a.id}>
              <span className="text-emerald-400">+</span> {a.fact}: {a.value}
            </p>
          ))}
          {diff.removed.slice(0, 5).map((r) => (
            <p key={r.id}>
              <span className="text-rose-400">−</span> {r.fact}: {r.value}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
