'use client'

/**
 * Standard AI content provenance strip for every generative surface:
 * Prompt · Regenerate · paginated past runs.
 */

import { useState } from 'react'
import type { AiGeneratedRecord } from '@/lib/firebase/aiDataSync'
import {
  formatAiProvenanceLabel,
  hasAiPrompt,
  type AiContentProvenanceMeta,
} from '@/lib/ai/aiProvenance'
import { AiPromptReveal } from './AiPromptReveal'
import { AiRegenerateModal } from './AiRegenerateModal'
import { AiRunNavigator } from './AiRunNavigator'
import { HelperTip } from '@/components/ui/HelperTip'

export interface AiContentProvenanceProps {
  meta: AiContentProvenanceMeta
  /** Enable regenerate (needs onRegenerate) */
  onRegenerate?: (opts: {
    system: string
    user: string
    userOverrode: boolean
  }) => void | Promise<void>
  onLoadEntry?: (entry: AiGeneratedRecord) => void
  busy?: boolean
  allowOverrideSystem?: boolean
  className?: string
  testId?: string
  /** Compact: only prompt + regen; full: + navigator */
  density?: 'compact' | 'full'
  title?: string
}

export function AiContentProvenance({
  meta,
  onRegenerate,
  onLoadEntry,
  busy = false,
  allowOverrideSystem = false,
  className = '',
  testId = 'ai-content-provenance',
  density = 'full',
  title = 'AI provenance',
}: AiContentProvenanceProps) {
  const [regenOpen, setRegenOpen] = useState(false)
  const canPrompt = hasAiPrompt(meta)
  const canRegen = Boolean(onRegenerate) && canPrompt && !meta.deterministic

  return (
    <div
      className={`rounded-lg border border-slate-800/80 bg-slate-950/40 px-2 py-1.5 ${className}`}
      data-testid={testId}
      data-kind={meta.kind}
      data-mode={meta.mode}
      data-deterministic={meta.deterministic ? 'true' : 'false'}
    >
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </span>
        <HelperTip
          content="AI is non-of-record. Prompt shows exact text sent to your model. Regenerate reviews prompts and past runs. Paginate prior generations to load answers. Verify free public sources before wet-lab use."
          label="About AI provenance"
          testId={`${testId}-help`}
        />
        <span className="text-[9px] text-slate-600">{formatAiProvenanceLabel(meta)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canPrompt && (
          <AiPromptReveal
            system={meta.promptSystem}
            user={meta.promptUser}
            mode={meta.mode}
            version={meta.version || undefined}
            testId={`${testId}-prompt`}
          />
        )}
        {canRegen && (
          <button
            type="button"
            className="rounded border border-indigo-800/40 bg-indigo-950/30 px-1.5 py-0.5 text-[10px] text-indigo-300 hover:border-indigo-600/50 disabled:opacity-50"
            disabled={busy}
            data-testid={`${testId}-regen-open`}
            onClick={() => setRegenOpen(true)}
          >
            Regenerate…
          </button>
        )}
        {meta.deterministic && (
          <span className="text-[9px] text-emerald-600/90">Built from free-API bags · no model</span>
        )}
      </div>

      {density === 'full' && onLoadEntry && (
        <div className="mt-2">
          <AiRunNavigator
            kind={meta.kind}
            mode={meta.mode}
            contextKey={meta.contextKey || undefined}
            refreshKey={meta.historyRefreshKey ?? 0}
            activeId={meta.activeGenId}
            onSelect={onLoadEntry}
            testId={`${testId}-nav`}
            pageSize={8}
          />
        </div>
      )}

      {canRegen && onRegenerate && (
        <AiRegenerateModal
          open={regenOpen}
          onClose={() => setRegenOpen(false)}
          kind={meta.kind}
          mode={meta.mode}
          systemPrompt={meta.promptSystem || ''}
          userPrompt={meta.promptUser || ''}
          contextKey={meta.contextKey || undefined}
          busy={busy}
          allowOverrideSystem={allowOverrideSystem}
          onRegenerate={async (opts) => {
            await onRegenerate(opts)
            setRegenOpen(false)
          }}
          onLoadEntry={(entry) => {
            onLoadEntry?.(entry)
          }}
          testId={`${testId}-regen-modal`}
        />
      )}
    </div>
  )
}
