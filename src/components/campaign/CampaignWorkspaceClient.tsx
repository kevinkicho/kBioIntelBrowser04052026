'use client'

/**
 * Campaign workspace UI (v3 G1) — stage checklist from CAMPAIGN_TEMPLATES.
 * Solo local default; does not change of-record Discover rank.
 */

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CAMPAIGN_TEMPLATES,
  type CampaignPersona,
  type CampaignStageId,
  type CampaignWorkspaceTemplate,
  campaignTemplatesByPersona,
} from '@/lib/campaign/campaignWorkspace'
import { researchPlaybookById } from '@/lib/methods/researchToolCatalog'
const PERSONA_LABELS: Record<CampaignPersona, string> = {
  repurposing: 'Repurposing triage',
  'rare-disease': 'Rare-disease lab',
  competitive: 'Competitive landscape',
  'lab-affiliation': 'Lab / site context',
}

const DONE_KEY = 'biointel-campaign-done-v1'

function loadDoneMap(): Record<string, CampaignStageId[]> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(DONE_KEY)
    if (!raw) return {}
    const o = JSON.parse(raw) as unknown
    if (!o || typeof o !== 'object') return {}
    return o as Record<string, CampaignStageId[]>
  } catch {
    return {}
  }
}

function saveDoneMap(map: Record<string, CampaignStageId[]>) {
  try {
    localStorage.setItem(DONE_KEY, JSON.stringify(map))
  } catch {
    /* quota */
  }
}

export function CampaignWorkspaceClient() {
  const [persona, setPersona] = useState<CampaignPersona>('repurposing')
  const templates = useMemo(() => campaignTemplatesByPersona(persona), [persona])
  const [templateId, setTemplateId] = useState(templates[0]?.id || CAMPAIGN_TEMPLATES[0]!.id)
  const template: CampaignWorkspaceTemplate =
    templates.find((t) => t.id === templateId) || templates[0] || CAMPAIGN_TEMPLATES[0]!

  const [doneMap, setDoneMap] = useState<Record<string, CampaignStageId[]>>(() => loadDoneMap())
  const done = useMemo(() => new Set(doneMap[template.id] || []), [doneMap, template.id])

  const toggleStage = useCallback(
    (stageId: CampaignStageId) => {
      setDoneMap((prev) => {
        const cur = new Set(prev[template.id] || [])
        if (cur.has(stageId)) cur.delete(stageId)
        else cur.add(stageId)
        const next = { ...prev, [template.id]: Array.from(cur) }
        saveDoneMap(next)
        return next
      })
    },
    [template.id],
  )

  const progress = template.stages.length
    ? Math.round((done.size / template.stages.length) * 100)
    : 0

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100" data-testid="campaign-workspace">
      <div className="mx-auto max-w-3xl">
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-300">
            Home
          </Link>
          <span>/</span>
          <span className="text-slate-300">Campaign</span>
        </nav>

        <header className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h1 className="text-2xl font-bold text-slate-50">Campaign workspace</h1>
          <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
            Multi-stage scientific loop: shortlist → pack → hypothesis → Monday work. Of-record Discover
            rank stays <strong className="text-slate-300">deterministic</strong> (no LLM). Free public APIs
            only. Not clinical or regulatory decision support.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(Object.keys(PERSONA_LABELS) as CampaignPersona[]).map((p) => (
              <button
                key={p}
                type="button"
                data-testid={`campaign-persona-${p}`}
                onClick={() => {
                  setPersona(p)
                  const list = campaignTemplatesByPersona(p)
                  if (list[0]) setTemplateId(list[0].id)
                }}
                className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                  persona === p
                    ? 'border-emerald-600/60 bg-emerald-950/50 text-emerald-200'
                    : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600'
                }`}
              >
                {PERSONA_LABELS[p]}
              </button>
            ))}
          </div>
        </header>

        <section className="mb-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-100">{template.title}</h2>
            <span className="text-[10px] tabular-nums text-slate-500" data-testid="campaign-progress">
              {progress}% · {done.size}/{template.stages.length} stages
            </span>
          </div>
          <p className="mb-3 text-[11px] text-slate-400">{template.description}</p>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-600/80 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <ol className="space-y-2" data-testid="campaign-stages">
            {template.stages.map((stage, i) => {
              const isDone = done.has(stage.id)
              const pb = stage.playbookId ? researchPlaybookById(stage.playbookId) : undefined
              return (
                <li
                  key={stage.id}
                  className={`rounded-lg border px-3 py-2.5 ${
                    isDone
                      ? 'border-emerald-900/50 bg-emerald-950/20'
                      : 'border-slate-800 bg-slate-950/40'
                  }`}
                  data-testid={`campaign-stage-${stage.id}`}
                >
                  <div className="flex flex-wrap items-start gap-2">
                    <button
                      type="button"
                      onClick={() => toggleStage(stage.id)}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] ${
                        isDone
                          ? 'border-emerald-600 bg-emerald-800 text-white'
                          : 'border-slate-600 bg-slate-900 text-slate-500'
                      }`}
                      aria-pressed={isDone}
                      data-testid={`campaign-stage-toggle-${stage.id}`}
                    >
                      {isDone ? '✓' : i + 1}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-medium text-slate-200">{stage.title}</div>
                      <p className="mt-0.5 text-[10px] text-slate-500">{stage.doneHint}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Link
                          href={stage.href}
                          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-medium text-emerald-300 hover:border-emerald-700"
                          data-testid={`campaign-stage-open-${stage.id}`}
                        >
                          Open
                        </Link>
                        {pb && (
                          <Link
                            href={`/how-it-works#tools`}
                            className="rounded-md border border-slate-800 px-2 py-1 text-[10px] text-slate-400 hover:text-slate-300"
                            title={pb.title}
                          >
                            Playbook: {pb.id}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>

          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
            <p className="text-[10px] font-medium text-slate-400">Product law</p>
            <ul className="mt-1 list-inside list-disc text-[10px] text-slate-500">
              {template.lawReminders.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        </section>

        <p className="text-[10px] text-slate-600">
          Design: <code className="text-slate-500">docs/design/discovery-workbench-v3.md</code> · templates in{' '}
          <code className="text-slate-500">campaignWorkspace.ts</code>
        </p>
      </div>
    </main>
  )
}
