'use client'

import { useMemo } from 'react'
import type { ResearchLabDossier } from '@/lib/researchLabs'
import { researchLabDossierToEvidencePack } from '@/lib/researchLabs'
import { ResearchLabAiPanel } from '@/components/orgs/ResearchLabAiPanel'
import { ResearchLabDossierBagsList } from '@/components/orgs/ResearchLabDossierBagsList'
import { CrossSourceStrip } from '@/components/crossSource/CrossSourceStrip'
import { DataHubLedgerView } from '@/components/dataHub/DataHubLedger'
import { HelperTip } from '@/components/ui/HelperTip'
import { buildOrgDossierCrossSource } from '@/lib/crossSource'
import { buildOrgDataHub } from '@/lib/dataHub'
import { packToJson, packToMarkdown, packExportFilename } from '@/lib/evidence'
import { downloadFile } from '@/lib/exportData'

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
  const orgCross = useMemo(
    () =>
      buildOrgDossierCrossSource({
        id: dossier.query || dossier.name,
        name: dossier.name,
        rorCount: dossier.stats.rorCount,
        openAlexCount: dossier.stats.openAlexCount,
        collegeCount: dossier.stats.collegeCount,
        hospitalCount: dossier.stats.hospitalCount,
        grantCount: dossier.stats.grantCount,
        affiliationEdgeCount: dossier.stats.edgeCount,
        literatureCount: dossier.stats.openAireCount + dossier.stats.totalWorksHint,
      }),
    [dossier],
  )

  const orgDataHub = useMemo(() => {
    const ror0 = dossier.rorOrgs[0]
    const college0 = dossier.colleges[0]
    const hospital0 = dossier.hospitals[0]
    const grant0 = dossier.grants[0]
    return buildOrgDataHub({
      id: dossier.query || dossier.name,
      name: dossier.name,
      kind: dossier.kind,
      query: dossier.query,
      builtAt: dossier.builtAt,
      rorCount: dossier.stats.rorCount,
      openAlexCount: dossier.stats.openAlexCount,
      collegeCount: dossier.stats.collegeCount,
      hospitalCount: dossier.stats.hospitalCount,
      grantCount: dossier.stats.grantCount,
      openAireCount: dossier.stats.openAireCount,
      edgeCount: dossier.stats.edgeCount,
      worksHint: dossier.stats.totalWorksHint,
      sampleRorName: ror0?.name || null,
      sampleRorId: ror0?.rorId || null,
      sampleCollege: college0?.name || null,
      sampleHospital: hospital0?.facilityName || null,
      sampleGrant: grant0?.title || null,
      notes: dossier.notes,
    })
  }, [dossier])

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
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-100">{dossier.name}</h2>
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] ${
                  KIND_STYLE[dossier.kind] || KIND_STYLE.other
                }`}
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

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
          ).map(([label, n]) => {
            const empty = n == null || n === 0
            return (
              <div
                key={label}
                className={`rounded-lg border border-slate-800 bg-slate-900/40 px-2 py-1.5 text-center ${
                  empty ? 'opacity-30' : ''
                }`}
                data-empty={empty ? 'true' : undefined}
              >
                <p className="text-sm font-semibold tabular-nums text-slate-100">
                  {n == null ? '—' : n}
                </p>
                <p className="text-[9px] text-slate-500">{label}</p>
              </div>
            )
          })}
        </div>

        {dossier.notes.map((n) => (
          <p key={n} className="mt-2 text-[10px] text-amber-500/85">
            {n}
          </p>
        ))}
      </header>

      <DataHubLedgerView
        ledger={orgDataHub}
        testId="research-lab-data-hub"
        density="full"
      />

      <CrossSourceStrip
        bundle={orgCross}
        testId="research-lab-cross-source"
        title="Source coverage (counts)"
      />

      <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3" data-testid="org-derived-assistive">
        <p className="mb-2 text-[10px] uppercase tracking-wide text-slate-500">
          Derived assistive · not of-record
        </p>
        <ResearchLabAiPanel pack={pack} />
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Dossier bags
          </h3>
          <HelperTip
            content="Unified list of free-API rows in this dossier. Search, filter by bag, sort — expand a row for ids and deep links. Affiliation context only."
            label="About dossier bags"
            testId="research-lab-bags-help"
          />
        </div>
        <ResearchLabDossierBagsList dossier={dossier} />
      </section>
    </div>
  )
}
