'use client'

import { useMemo, type ReactNode } from 'react'
import type { ResearchLabDossier } from '@/lib/researchLabs'
import {
  researchLabDossierToEvidencePack,
} from '@/lib/researchLabs'
import { ResearchLabAiPanel } from '@/components/orgs/ResearchLabAiPanel'
import { packToJson, packToMarkdown, packExportFilename } from '@/lib/evidence'
import { downloadFile } from '@/lib/exportData'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

const KIND_STYLE: Record<string, string> = {
  university: 'border-indigo-800/40 bg-indigo-950/40 text-indigo-200',
  college: 'border-sky-800/40 bg-sky-950/40 text-sky-200',
  'research-lab': 'border-violet-800/40 bg-violet-950/40 text-violet-200',
  healthcare: 'border-rose-800/40 bg-rose-950/40 text-rose-200',
  funder: 'border-amber-800/40 bg-amber-950/40 text-amber-200',
  facility: 'border-cyan-800/40 bg-cyan-950/40 text-cyan-200',
  other: 'border-slate-700 text-slate-300',
}

export function ResearchLabDossierView({ dossier }: { dossier: ResearchLabDossier }) {
  const pack = useMemo(() => researchLabDossierToEvidencePack(dossier), [dossier])

  const exportPack = (format: 'json' | 'md') => {
    const body = format === 'json' ? packToJson(pack) : packToMarkdown(pack)
    const mime = format === 'json' ? 'application/json' : 'text/markdown'
    downloadFile(body, packExportFilename(pack, format), mime)
  }

  return (
    <div className="space-y-4" data-testid="research-lab-dossier">
      <header className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-slate-100">{dossier.name}</h2>
              <span
                className={`text-[10px] rounded border px-1.5 py-0.5 ${KIND_STYLE[dossier.kind] || KIND_STYLE.other}`}
              >
                {dossier.kind}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Query “{dossier.query}” · {new Date(dossier.builtAt).toLocaleString()} ·{' '}
              {pack.claimCount} claim-bound facts
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => exportPack('json')}
              className="rounded-lg border border-emerald-800/40 bg-emerald-900/20 px-2 py-1 text-[11px] text-emerald-300"
            >
              Export pack JSON
            </button>
            <button
              type="button"
              onClick={() => exportPack('md')}
              className="rounded-lg border border-emerald-800/40 bg-emerald-900/20 px-2 py-1 text-[11px] text-emerald-300"
            >
              Export pack MD
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              ['ROR', dossier.stats.rorCount],
              ['OpenAlex', dossier.stats.openAlexCount],
              ['Colleges', dossier.stats.collegeCount],
              ['Hospitals', dossier.stats.hospitalCount],
              ['NIH grants', dossier.stats.grantCount],
              ['OpenAIRE', dossier.stats.openAireCount],
              ['Joins', dossier.stats.edgeCount],
              ['Works hint', dossier.stats.totalWorksHint],
            ] as const
          ).map(([label, n]) => (
            <div
              key={label}
              className="rounded-lg border border-slate-800 bg-slate-900/40 px-2 py-1.5 text-center"
            >
              <p className="text-sm font-semibold text-slate-100 tabular-nums">{n}</p>
              <p className="text-[9px] text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        {dossier.notes.map((n) => (
          <p key={n} className="mt-2 text-[10px] text-amber-500/85">
            {n}
          </p>
        ))}
      </header>

      <ResearchLabAiPanel pack={pack} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={`ROR (${dossier.rorOrgs.length})`}>
          {dossier.rorOrgs.length === 0 ? (
            <Empty />
          ) : (
            <ul className="space-y-2">
              {dossier.rorOrgs.slice(0, 12).map((o) => (
                <li key={o.rorId} className="text-sm">
                  <a
                    href={`https://ror.org/${o.rorId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-300 hover:underline font-medium"
                    onClick={() =>
                      onDeepLinkClick('other', `https://ror.org/${o.rorId}`, {
                        panelId: 'research-lab-dossier',
                        label: 'ror',
                      })
                    }
                  >
                    {o.name}
                  </a>
                  <p className="text-[10px] text-slate-500">
                    {[o.city, o.countryName, o.types.slice(0, 3).join('/')].filter(Boolean).join(' · ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={`OpenAlex institutions (${dossier.openAlexInstitutions.length})`}>
          {dossier.openAlexInstitutions.length === 0 ? (
            <Empty />
          ) : (
            <ul className="space-y-2">
              {dossier.openAlexInstitutions.slice(0, 12).map((i) => (
                <li key={i.openAlexId} className="text-sm">
                  <a
                    href={i.openAlexUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-300 hover:underline font-medium"
                  >
                    {i.name}
                  </a>
                  <p className="text-[10px] text-slate-500">
                    {[i.type, i.city, i.countryCode, i.worksCount != null ? `${i.worksCount} works` : '']
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={`US colleges (${dossier.colleges.length})`}>
          {dossier.colleges.length === 0 ? (
            <Empty />
          ) : (
            <ul className="space-y-2">
              {dossier.colleges.slice(0, 10).map((c) => (
                <li key={c.id} className="text-sm">
                  <a
                    href={c.scorecardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-300 hover:underline font-medium"
                  >
                    {c.name}
                  </a>
                  <p className="text-[10px] text-slate-500">
                    {[c.city, c.state, c.ownership, c.source].filter(Boolean).join(' · ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={`NIH grants (${dossier.grants.length})`}>
          {dossier.grants.length === 0 ? (
            <Empty />
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {dossier.grants.slice(0, 12).map((g) => (
                <li key={g.projectNumber || g.title} className="text-sm">
                  <p className="text-slate-100 font-medium text-[13px] leading-snug">{g.title}</p>
                  <p className="text-[10px] text-slate-500">
                    {[g.projectNumber, g.piName, g.institute].filter(Boolean).join(' · ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {dossier.affiliationEdges.length > 0 && (
        <Section title={`Affiliation joins (${dossier.affiliationEdges.length})`}>
          <ul className="space-y-1.5">
            {dossier.affiliationEdges.slice(0, 15).map((e) => (
              <li key={e.id} className="text-[11px] text-slate-300">
                <span className="text-slate-500">{e.kind}</span> · {e.leftLabel} ↔ {e.rightLabel}{' '}
                <span className="font-mono text-slate-600">
                  {(e.score * 100).toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {dossier.deepLinks.length > 0 && (
        <Section title="Deep links">
          <ul className="flex flex-wrap gap-2">
            {dossier.deepLinks.map((l) => (
              <li key={l.url + l.label}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded border border-slate-700 px-2 py-1 text-[10px] text-indigo-300 hover:border-indigo-700"
                >
                  {l.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
      <h3 className="text-xs font-semibold text-slate-200 mb-2">{title}</h3>
      {children}
    </section>
  )
}

function Empty() {
  return <p className="text-[11px] text-slate-500">No rows in this bag.</p>
}
