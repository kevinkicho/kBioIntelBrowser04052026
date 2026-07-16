'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { NextExperiment, ResearchHypothesis } from '@/lib/domain'
import {
  appendNextExperiment,
  getResearchHypothesis,
  saveResearchHypothesis,
  updateResearchHypothesis,
} from '@/lib/project'
import { emitProductEvent } from '@/lib/productEvents'

export default function ResearchHypothesisEditorPage() {
  const params = useParams()
  const projectId =
    typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : ''
  const hypId =
    typeof params?.hid === 'string' ? params.hid : Array.isArray(params?.hid) ? params.hid[0] : ''

  const [hyp, setHyp] = useState<ResearchHypothesis | null | undefined>(undefined)
  const [title, setTitle] = useState('')
  const [thesis, setThesis] = useState('')
  const [expText, setExpText] = useState('')
  const [banner, setBanner] = useState<string | null>(null)

  useEffect(() => {
    if (!hypId) {
      setHyp(null)
      return
    }
    const res = getResearchHypothesis(hypId)
    if (!res.ok) {
      setHyp(null)
      return
    }
    setHyp(res.value)
    setTitle(res.value.title)
    setThesis(res.value.thesis)
    emitProductEvent('research_hypothesis_opened', { hypId, projectId: res.value.projectId })
  }, [hypId, projectId])

  const flash = (msg: string) => {
    setBanner(msg)
    window.setTimeout(() => setBanner(null), 3000)
  }

  const handleSave = useCallback(() => {
    if (!hyp) return
    const next = updateResearchHypothesis(hyp, { title, thesis })
    const saved = saveResearchHypothesis(next)
    if (!saved.ok) {
      flash(saved.message)
      return
    }
    setHyp(saved.value)
    flash('Saved')
  }, [hyp, title, thesis])

  const handleAddExperiment = useCallback(() => {
    if (!hyp || !expText.trim()) return
    const next = appendNextExperiment(hyp, {
      description: expText.trim(),
      priority: 'medium',
      relatedClaimIds: hyp.claimIds.slice(0, 5),
    })
    const saved = saveResearchHypothesis(next)
    if (!saved.ok) {
      flash(saved.message)
      return
    }
    setHyp(saved.value)
    setExpText('')
    flash('Experiment added')
  }, [hyp, expText])

  if (hyp === undefined) {
    return (
      <main className="min-h-screen bg-[#0f1117] px-4 py-12 text-center text-slate-500">
        Loading…
      </main>
    )
  }

  if (!hyp) {
    return (
      <main className="min-h-screen bg-[#0f1117] px-4 py-12 text-center">
        <h1 className="mb-2 text-xl font-semibold text-slate-200">Hypothesis not found</h1>
        <Link href={`/projects/${projectId}`} className="text-sm text-emerald-400">
          ← Back to project
        </Link>
      </main>
    )
  }

  const experiments: NextExperiment[] = hyp.nextExperiments ?? []

  return (
    <main className="min-h-screen bg-[#0f1117] text-slate-200">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href={`/projects/${hyp.projectId}`}
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          ← Project board
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-slate-100">Research hypothesis</h1>
        <p className="mt-1 text-[11px] text-slate-500">
          Narrative thesis under a project (not set-ops filters). v{hyp.version} ·{' '}
          {hyp.claimIds.length} claim ids
        </p>

        {banner && (
          <div className="mt-3 rounded-lg border border-emerald-800/40 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200">
            {banner}
          </div>
        )}

        <label className="mt-6 block">
          <span className="mb-1 block text-[11px] font-medium text-slate-400">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-700 focus:outline-none"
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-1 block text-[11px] font-medium text-slate-400">Thesis</span>
          <textarea
            value={thesis}
            onChange={(e) => setThesis(e.target.value)}
            rows={12}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm leading-relaxed text-slate-100 focus:border-emerald-700 focus:outline-none"
          />
        </label>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-600"
          >
            Save
          </button>
        </div>

        {hyp.claimIds.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-slate-200">Linked claim ids</h2>
            <p className="mt-1 text-[11px] text-slate-500">
              Seeded from pack export index. Full claim statements rehydrate when pack cache is
              available (download pack after seed for density).
            </p>
            <ul className="mt-2 max-h-32 space-y-0.5 overflow-y-auto font-mono text-[10px] text-slate-500">
              {hyp.claimIds.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-slate-200">Next experiments</h2>
          {experiments.length === 0 ? (
            <p className="mt-1 text-xs text-slate-600">None yet — add one below or use Pack AI.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {experiments.map((e) => (
                <li
                  key={e.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm"
                >
                  <span className="text-[10px] uppercase text-slate-500">{e.priority ?? 'medium'}</span>
                  <p className="text-slate-200">{e.description}</p>
                  {e.rationale && (
                    <p className="mt-1 text-[11px] text-slate-500">{e.rationale}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={expText}
              onChange={(e) => setExpText(e.target.value)}
              placeholder="e.g. Run CETSA on TTR with candidate X…"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-emerald-700 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddExperiment}
              disabled={!expText.trim()}
              className="rounded-lg border border-indigo-800/50 bg-indigo-950/40 px-3 py-2 text-xs text-indigo-200 hover:bg-indigo-900/40 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
