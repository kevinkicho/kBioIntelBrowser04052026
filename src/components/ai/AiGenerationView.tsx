'use client'

/**
 * Renders a stored AI generation as structured UI — never raw JSON dumps.
 */

import {
  formatAiGeneration,
  type FormattedAiGeneration,
} from '@/lib/ai/formatAiGeneration'
import type { AiGeneratedRecord } from '@/lib/firebase/aiDataSync'

export interface AiGenerationViewProps {
  entry?: Pick<AiGeneratedRecord, 'content' | 'error' | 'task' | 'kind' | 'mode'> | null
  /** Precomputed format (optional) */
  formatted?: FormattedAiGeneration | null
  /** compact = list preview; full = expanded body */
  density?: 'compact' | 'full'
  className?: string
  testId?: string
}

export function AiGenerationView({
  entry,
  formatted: pre,
  density = 'full',
  className = '',
  testId = 'ai-generation-view',
}: AiGenerationViewProps) {
  const f =
    pre ??
    (entry
      ? formatAiGeneration(entry)
      : ({ kind: 'empty', preview: '(empty)', wasJson: false } as FormattedAiGeneration))

  if (density === 'compact') {
    return (
      <p
        className={`text-[11px] leading-snug text-slate-400 line-clamp-3 ${className}`}
        data-testid={testId}
        data-format={f.kind}
      >
        {f.preview}
      </p>
    )
  }

  return (
    <div
      className={`space-y-2 text-[11px] text-slate-300 ${className}`}
      data-testid={testId}
      data-format={f.kind}
    >
      {f.kind === 'error' && (
        <p className="text-red-400/90 whitespace-pre-wrap">{f.summary || f.preview}</p>
      )}

      {f.kind === 'empty' && <p className="text-slate-600">{f.preview}</p>}

      {f.refused && (
        <p className="rounded border border-amber-800/40 bg-amber-950/30 px-2 py-1.5 text-amber-200/90">
          Model refused{f.refuseReason ? `: ${f.refuseReason}` : ''}
        </p>
      )}

      {f.kind === 'ai_rank' && f.ranking && f.ranking.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Suggested review order
          </p>
          <ol className="space-y-1.5 list-decimal list-inside">
            {f.ranking.map((row) => (
              <li key={`${row.rank}-${row.key || row.name}`} className="leading-snug">
                <span className="font-medium text-slate-100">{row.name}</span>
                {row.reasons[0] && (
                  <span className="block ml-4 text-[10px] text-slate-500 mt-0.5">
                    {row.reasons[0]}
                  </span>
                )}
                {row.reasons.length > 1 && (
                  <ul className="ml-4 mt-0.5 list-disc list-inside text-[10px] text-slate-600">
                    {row.reasons.slice(1, 4).map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {(f.kind === 'structured_insight' ||
        f.kind === 'rh_insight' ||
        f.kind === 'prose') &&
        f.summary && (
          <div>
            {(f.kind === 'structured_insight' || f.kind === 'rh_insight') && (
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Summary
              </p>
            )}
            <p className="leading-relaxed whitespace-pre-wrap text-slate-200">{f.summary}</p>
          </div>
        )}

      {f.sections?.workingClaim && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Working claim
          </p>
          <p className="text-emerald-200/90 leading-relaxed">{f.sections.workingClaim}</p>
        </div>
      )}

      {f.sections?.supporting && f.sections.supporting.length > 0 && (
        <BulletBlock title="Supporting" items={f.sections.supporting} tone="slate" />
      )}
      {f.sections?.killCriteria && f.sections.killCriteria.length > 0 && (
        <BulletBlock title="Kill criteria" items={f.sections.killCriteria} tone="rose" />
      )}
      {f.sections?.openQuestions && f.sections.openQuestions.length > 0 && (
        <BulletBlock title="Open questions" items={f.sections.openQuestions} tone="amber" />
      )}
      {f.sections?.falsifiers && f.sections.falsifiers.length > 0 && (
        <BulletBlock title="Falsifiers" items={f.sections.falsifiers} tone="amber" />
      )}

      {f.rivals && f.rivals.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Rival hypotheses
          </p>
          <ul className="space-y-1.5">
            {f.rivals.map((r) => (
              <li
                key={`${r.role}-${r.title}`}
                className="rounded border border-slate-800 bg-slate-950/40 px-2 py-1.5"
              >
                <span className="text-[9px] uppercase text-violet-300/90">{r.role}</span>
                <span className="ml-1.5 font-medium text-slate-100">{r.title}</span>
                {r.thesis && (
                  <p className="mt-0.5 text-[10px] text-slate-400 leading-snug">{r.thesis}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {f.experiments && f.experiments.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Experiments
          </p>
          <ol className="space-y-1.5 list-decimal list-inside">
            {f.experiments.map((e) => (
              <li key={e.description} className="leading-snug">
                <span className="text-slate-100">{e.description}</span>
                {e.priority && (
                  <span className="ml-1 text-[9px] text-slate-500">({e.priority})</span>
                )}
                {e.rationale && (
                  <span className="block ml-4 text-[10px] text-slate-500">{e.rationale}</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {f.gaps && f.gaps.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Evidence gaps
          </p>
          <ul className="space-y-1.5">
            {f.gaps.map((g) => (
              <li
                key={`${g.facet}-${g.message}`}
                className="rounded border border-slate-800 px-2 py-1.5"
              >
                <span className="font-medium text-amber-200/90">{g.facet}</span>
                <span className="block text-slate-300">{g.message}</span>
                {g.suggestedAction && (
                  <span className="block text-[10px] text-emerald-400/80 mt-0.5">
                    → {g.suggestedAction}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {f.nextSteps && f.nextSteps.length > 0 && (
        <BulletBlock title="Next steps" items={f.nextSteps} tone="emerald" />
      )}
      {f.risks && f.risks.length > 0 && (
        <BulletBlock title="Risks / caveats" items={f.risks} tone="amber" />
      )}
      {f.caveats && f.caveats.length > 0 && (
        <BulletBlock title="Caveats" items={f.caveats} tone="amber" />
      )}
      {f.overclaims && f.overclaims.length > 0 && (
        <BulletBlock title="Overclaims to avoid" items={f.overclaims} tone="rose" />
      )}

      {f.claimIds && f.claimIds.length > 0 && (
        <p className="text-[9px] text-slate-600 font-mono">
          Grounded claims: {f.claimIds.slice(0, 8).join(', ')}
          {f.claimIds.length > 8 ? ` +${f.claimIds.length - 8}` : ''}
        </p>
      )}
    </div>
  )
}

function BulletBlock({
  title,
  items,
  tone,
}: {
  title: string
  items: string[]
  tone: 'slate' | 'emerald' | 'amber' | 'rose'
}) {
  const color =
    tone === 'emerald'
      ? 'text-emerald-300/90'
      : tone === 'amber'
        ? 'text-amber-200/90'
        : tone === 'rose'
          ? 'text-rose-200/90'
          : 'text-slate-300'
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
        {title}
      </p>
      <ul className={`space-y-1 list-disc list-inside ${color}`}>
        {items.map((s) => (
          <li key={s} className="leading-snug">
            {s}
          </li>
        ))}
      </ul>
    </div>
  )
}
