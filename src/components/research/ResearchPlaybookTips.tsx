'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  playbookTipsForSurface,
  researchGoalLabel,
  type PlaybookRunActionId,
  type PlaybookTipSurface,
} from '@/lib/methods/researchToolCatalog'
import { HelperTip } from '@/components/ui/HelperTip'
import { emitProductEvent } from '@/lib/productEvents'

function defaultRunAction(id: PlaybookRunActionId, router: ReturnType<typeof useRouter>) {
  switch (id) {
    case 'focus_discover_search': {
      const el =
        document.querySelector<HTMLInputElement>('[data-testid="discover-search-input"]') ||
        document.querySelector<HTMLInputElement>('input[type="search"]') ||
        document.querySelector<HTMLInputElement>('input[name="q"]')
      el?.focus()
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      break
    }
    case 'open_projects':
      router.push('/projects')
      break
    case 'open_compare':
      router.push('/compare')
      break
    case 'open_discover':
      router.push('/discover')
      break
    case 'open_methodology_kit_diff':
      router.push('/methodology#kit-diff')
      break
    case 'scroll_pack_section': {
      const el =
        document.querySelector<HTMLElement>('[data-testid="board-pack-section"]') ||
        document.querySelector<HTMLElement>('#board-pack-section')
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      break
    }
    default:
      break
  }
}

export function ResearchPlaybookTips({
  surface,
  className = '',
  compact = false,
  onRunAction,
}: {
  surface: PlaybookTipSurface
  className?: string
  /** Tighter layout for strips under results */
  compact?: boolean
  /** Optional override for in-app run actions */
  onRunAction?: (id: PlaybookRunActionId) => void
}) {
  const router = useRouter()
  const tips = playbookTipsForSurface(surface)
  if (tips.length === 0) return null

  return (
    <div
      className={`rounded-xl border border-slate-800/80 bg-slate-900/40 ${
        compact ? 'px-3 py-2.5' : 'px-4 py-3'
      } ${className}`}
      data-testid={`research-playbook-tips-${surface}`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Research loops
        </span>
        <HelperTip
          content="One-click playbooks that combine free-API tools for scientific work. Of-record Discover rank stays deterministic; AI is claim-bound and non-of-record. Use Run next to jump into the next product step."
          label="About research loops"
          testId={`playbook-tips-help-${surface}`}
          maxWidth="20rem"
        />
        <Link
          href="/how-it-works#tools"
          className="ml-auto text-[10px] text-indigo-400/90 hover:text-indigo-300 hover:underline"
          data-testid={`playbook-tips-catalog-${surface}`}
          onClick={() =>
            emitProductEvent('preference_tooltip_opened', {
              key: `playbook_tips_catalog_${surface}`,
            })
          }
        >
          All tools →
        </Link>
      </div>
      <ul className={`grid gap-2 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2'}`}>
        {tips.map((tip) => (
          <li
            key={`${tip.surface}-${tip.playbookId}`}
            className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-2.5"
            data-testid={`playbook-tip-${tip.playbookId}`}
          >
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-[12px] font-medium text-slate-100">{tip.title}</span>
              <span className="rounded border border-indigo-900/40 px-1 py-px text-[9px] text-indigo-400/90">
                {researchGoalLabel(tip.goal)}
              </span>
              <span className="font-mono text-[9px] text-slate-600">{tip.playbookId}</span>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-slate-500">{tip.summary}</p>
            <p className="mt-1 text-[11px] text-slate-400">{tip.humanCta}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tip.runActionId && tip.runActionLabel && (
                <button
                  type="button"
                  className="rounded border border-emerald-700/50 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-medium text-emerald-200 hover:bg-emerald-900/40"
                  data-testid={`playbook-tip-run-${tip.playbookId}`}
                  onClick={() => {
                    emitProductEvent('preference_tooltip_opened', {
                      key: `playbook_run_${tip.runActionId}`,
                    })
                    if (onRunAction) onRunAction(tip.runActionId!)
                    else defaultRunAction(tip.runActionId!, router)
                  }}
                >
                  {tip.runActionLabel}
                </button>
              )}
              <Link
                href={tip.href}
                className="rounded border border-indigo-800/40 bg-indigo-950/30 px-2 py-0.5 text-[10px] text-indigo-300 hover:bg-indigo-900/40"
                data-testid={`playbook-tip-open-${tip.playbookId}`}
                onClick={() =>
                  emitProductEvent('preference_tooltip_opened', {
                    key: `playbook_tip_${tip.playbookId}`,
                  })
                }
              >
                Open playbook
              </Link>
              {tip.actionHref && tip.actionLabel && (
                <Link
                  href={tip.actionHref}
                  className="rounded border border-slate-700/60 bg-slate-900/40 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800/50"
                  data-testid={`playbook-tip-action-${tip.playbookId}`}
                >
                  {tip.actionLabel}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
