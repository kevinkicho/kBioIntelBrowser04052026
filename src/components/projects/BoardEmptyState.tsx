'use client'

import Link from 'next/link'
import { ResearchPlaybookTips } from '@/components/research/ResearchPlaybookTips'

/** Empty board + research playbook tips (Discover → save loop). */
export function BoardEmptyState() {
  return (
    <div
      className="rounded-xl border border-dashed border-slate-700 px-6 py-10"
      data-testid="board-empty-state"
    >
      <div className="mb-6 text-center">
        <h2 className="text-lg font-semibold text-slate-300 mb-2">Board is empty</h2>
        <p className="text-sm text-slate-500 mb-4">
          Save candidates from Discover with “Save to project”, then promote → pack → RH.
        </p>
        <Link
          href="/discover"
          className="inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white hover:bg-emerald-600"
        >
          Go to Discover
        </Link>
      </div>
      <div className="mx-auto max-w-3xl">
        <ResearchPlaybookTips surface="board-empty" />
      </div>
    </div>
  )
}
