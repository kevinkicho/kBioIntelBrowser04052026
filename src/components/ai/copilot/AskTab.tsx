"use client"

import { useState } from 'react'
import Link from 'next/link'
import type { CopilotMessage } from '@/hooks/useAICopilot'
import { MessageBubble } from './MessageBubble'
import { AiWhyTooltip } from '@/components/ai/AiWhyTooltip'
import { buildAskSuggestionWhy } from '@/lib/ai/aiWhyTooltip'
import { HelperTip } from '@/components/ui/HelperTip'
import {
  COPILOT_MAX_TOOL_STEPS,
  COPILOT_TOOLS,
} from '@/lib/ai/copilot/tools/catalog'

export function AskTab({
  messages,
  isStreaming,
  aiAvailable,
  onAsk,
  previousMolecules,
  isDiseaseContext,
  isGeneContext,
  geneSymbol,
}: {
  messages: CopilotMessage[]
  isStreaming: boolean
  aiAvailable: boolean
  onAsk: (question: string) => void
  previousMolecules: string[]
  isDiseaseContext: boolean
  isGeneContext: boolean
  geneSymbol?: string
}) {
  const [toolsOpen, setToolsOpen] = useState(false)

  const suggestions = isGeneContext
    ? [
        'What is this gene\'s primary therapeutic opportunity?',
        'Which drugs targeting this gene could be repurposed?',
        'What are the key safety concerns for targeting this gene?',
        'What pathways does this gene participate in?',
        'What experiments should a researcher run next?',
      ]
    : isDiseaseContext
      ? [
          'What molecules are most promising for this condition?',
          'What are the key mechanisms across these diseases?',
          'What repurposing opportunities exist?',
          'What are the main therapeutic gaps?',
          'Which gene targets are most druggable?',
        ]
      : [
          'What is the primary mechanism of action?',
          'Could this drug be repurposed for other diseases?',
          'Which adverse events are mechanism-related vs off-target?',
          'What data is missing or empty for this molecule, and should I retry anything?',
          'What experiments should a researcher run next?',
        ]

  if (!isGeneContext && !isDiseaseContext && previousMolecules.length > 0) {
    suggestions.push(`How does this compare to ${previousMolecules[0]}?`)
  }

  const emptyPrompt = isGeneContext
    ? `Ask anything about gene ${geneSymbol}`
    : isDiseaseContext
      ? 'Ask anything about these diseases'
      : 'Ask anything about this molecule'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Ask
        </span>
        <HelperTip
          content={`Agentic Ask can use ${COPILOT_TOOLS.length} evidence tools (max ${COPILOT_MAX_TOOL_STEPS} steps/question) — retrieval snapshot, panel samples, load/retry, pack claims, RH seed. Claim-bound only; never invents Discover ranks. ${emptyPrompt}.`}
          label="About Ask"
          testId="copilot-ask-help"
          maxWidth="18rem"
        />
        <Link
          href="/how-it-works#tools"
          className="ml-auto text-[9px] text-indigo-400/90 hover:text-indigo-300 hover:underline"
          data-testid="copilot-ask-tools-catalog-link"
        >
          All research tools →
        </Link>
      </div>

      {/* Surfaced allowlisted tools so humans know what the agent can do */}
      <div
        className="rounded-lg border border-slate-800/50 bg-slate-900/30"
        data-testid="copilot-ask-tools-surface"
      >
        <button
          type="button"
          onClick={() => setToolsOpen((v) => !v)}
          className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left"
          aria-expanded={toolsOpen}
        >
          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
            Evidence tools
          </span>
          <span className="text-[9px] tabular-nums text-slate-600">
            {COPILOT_TOOLS.length} · ≤{COPILOT_MAX_TOOL_STEPS}/ask
          </span>
          <span
            className={`ml-auto text-[9px] text-slate-600 transition-transform ${
              toolsOpen ? 'rotate-90' : ''
            }`}
          >
            ▸
          </span>
        </button>
        {toolsOpen && (
          <ul className="flex flex-wrap gap-1 border-t border-slate-800/40 px-2 pb-2 pt-1.5">
            {COPILOT_TOOLS.map((t) => (
              <li key={t.name}>
                <HelperTip content={t.description} label={t.name} testId={`copilot-tool-tip-${t.name}`}>
                  <span
                    className="cursor-help rounded border border-slate-700/40 bg-slate-950/50 px-1.5 py-0.5 font-mono text-[9px] text-slate-400"
                    data-testid={`copilot-tool-chip-${t.name}`}
                  >
                    {t.name}
                  </span>
                </HelperTip>
              </li>
            ))}
          </ul>
        )}
      </div>

      {messages.length === 0 && (
        <div className="py-2">
          <div className="space-y-1.5">
            {suggestions.map((s) => (
              <AiWhyTooltip
                key={s}
                why={buildAskSuggestionWhy(s)}
                testId="ask-suggest-why"
                className="w-full"
              >
                <button
                  type="button"
                  onClick={() => onAsk(s)}
                  disabled={!aiAvailable}
                  className="w-full rounded border border-slate-700/20 bg-slate-800/40 text-left text-[10px] text-slate-400 hover:border-indigo-700/40 hover:text-indigo-300 hover:bg-indigo-900/30 px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {s}
                </button>
              </AiWhyTooltip>
            ))}
          </div>
        </div>
      )}

      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} isStreaming={isStreaming && msg === messages[messages.length - 1] && msg.role === 'assistant'} />
      ))}

      {isStreaming && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1].content && (
        <span className="inline-block w-1.5 h-4 bg-indigo-400 animate-pulse rounded-full" />
      )}

      {!aiAvailable && (
        <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg p-3">
          <p className="text-[10px] text-amber-300">AI is not connected. Open Settings to connect.</p>
        </div>
      )}
    </div>
  )
}
