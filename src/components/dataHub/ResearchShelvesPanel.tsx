'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  addToResearchShelf,
  createResearchShelf,
  deleteResearchShelf,
  loadResearchShelves,
  RESEARCH_SHELVES_EVENT,
  type ResearchShelf,
  type ResearchShelfEntityType,
} from '@/lib/researchShelves'
import { HelperTip } from '@/components/ui/HelperTip'

export function ResearchShelvesPanel({
  entityType,
  entityId,
  entityLabel,
  href,
  className = '',
  testId = 'research-shelves',
}: {
  entityType: ResearchShelfEntityType
  entityId: string
  entityLabel: string
  href?: string
  className?: string
  testId?: string
}) {
  const [shelves, setShelves] = useState<ResearchShelf[]>([])
  const [name, setName] = useState('')

  useEffect(() => {
    setShelves(loadResearchShelves())
    const on = () => setShelves(loadResearchShelves())
    window.addEventListener(RESEARCH_SHELVES_EVENT, on)
    return () => window.removeEventListener(RESEARCH_SHELVES_EVENT, on)
  }, [])

  return (
    <section
      className={`rounded-xl border border-slate-800 bg-slate-950/40 p-3 ${className}`}
      data-testid={testId}
    >
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <h3 className="text-xs font-semibold text-slate-100">Research shelves</h3>
        <HelperTip
          content="Solo-local named lists of molecules/genes (this browser only). Track last kit export time. Not multi-tenant cloud."
          label="About research shelves"
        />
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New shelf name"
          className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
          data-testid={`${testId}-name`}
        />
        <button
          type="button"
          className="rounded border border-slate-600 px-2 py-1 text-[10px] text-slate-300"
          data-testid={`${testId}-create`}
          onClick={() => {
            createResearchShelf(name || 'Research shelf')
            setName('')
            setShelves(loadResearchShelves())
          }}
        >
          Create shelf
        </button>
      </div>
      {shelves.length === 0 ? (
        <p className="text-[10px] text-slate-500">No shelves yet — create one to pin this entity.</p>
      ) : (
        <ul className="space-y-1.5">
          {shelves.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800/80 px-2 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-slate-200">{s.name}</p>
                <p className="text-[9px] text-slate-600">
                  {s.items.length} items · updated {s.updatedAt.slice(0, 10)}
                </p>
              </div>
              <button
                type="button"
                className="rounded border border-emerald-800/40 px-1.5 py-0.5 text-[10px] text-emerald-300"
                data-testid={`${testId}-add-${s.id}`}
                onClick={() => {
                  addToResearchShelf(s.id, {
                    entityType,
                    id: entityId,
                    label: entityLabel,
                    href,
                  })
                  setShelves(loadResearchShelves())
                }}
              >
                Add here
              </button>
              <button
                type="button"
                className="text-[10px] text-slate-600 hover:text-rose-400"
                onClick={() => {
                  deleteResearchShelf(s.id)
                  setShelves(loadResearchShelves())
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      {shelves.some((s) => s.items.length > 0) && (
        <div className="mt-2 border-t border-slate-800 pt-2">
          <p className="mb-1 text-[9px] uppercase tracking-wide text-slate-600">Recent pins</p>
          <ul className="space-y-0.5 text-[10px] text-slate-400">
            {shelves
              .flatMap((s) => s.items.map((i) => ({ ...i, shelf: s.name })))
              .slice(0, 8)
              .map((i, idx) => (
                <li key={idx}>
                  {i.href ? (
                    <Link href={i.href} className="text-indigo-300 hover:underline">
                      {i.label}
                    </Link>
                  ) : (
                    i.label
                  )}
                  <span className="text-slate-600">
                    {' '}
                    · {i.shelf}
                    {i.lastKitExportedAt
                      ? ` · kit ${i.lastKitExportedAt.slice(0, 10)}`
                      : ''}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </section>
  )
}
