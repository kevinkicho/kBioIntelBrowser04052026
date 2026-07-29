'use client'

import type { Project } from '@/lib/domain'
import type { CorePanelEvidenceInput, EvidenceClaim } from '@/lib/evidence'
import {
  saveResearchHypothesis,
  seedResearchHypothesisFromPack,
} from '@/lib/project'
import { PackBuilder } from '@/components/evidence/PackBuilder'
import { MultiPackContrastPicker } from '@/components/evidence/MultiPackContrastPicker'

export function BoardPackSection({
  project,
  boardPanels,
  boardClaims,
  boardLandscapeClaims,
  panelsLoading,
  packWarnings,
  onBanner,
  onRefresh,
}: {
  project: Project
  boardPanels: CorePanelEvidenceInput
  boardClaims: EvidenceClaim[]
  boardLandscapeClaims: EvidenceClaim[]
  panelsLoading: boolean
  packWarnings: string[]
  onBanner: (type: 'ok' | 'err', text: string) => void
  onRefresh: () => void
}) {
  return (
    <section className="mt-8 space-y-4" data-testid="board-pack-section">
      <h2 className="text-lg font-semibold text-slate-100">Evidence packs</h2>
      {project.packIndex && project.packIndex.length > 0 && (
        <ul className="space-y-2">
          {project.packIndex.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm"
            >
              <div>
                <div className="font-medium text-slate-200">{entry.title}</div>
                <div className="text-[11px] text-slate-500">
                  {entry.candidateCount ?? 0} candidates ·{' '}
                  {new Date(entry.createdAt).toLocaleString()} ·{' '}
                  <span className="font-mono">{entry.id}</span>
                </div>
              </div>
              <button
                type="button"
                data-testid={`seed-rh-${entry.id}`}
                className="rounded border border-indigo-800/40 px-2 py-1 text-[10px] text-indigo-300 hover:bg-indigo-900/30"
                onClick={() => {
                  const hyp = seedResearchHypothesisFromPack({
                    projectId: project.id,
                    packId: entry.id,
                    packTitle: entry.title,
                    claimIds: entry.claimIds ?? [],
                    candidateIds: project.candidates.map((c) => c.candidateId),
                    diseaseId: project.disease?.id,
                    targetIds: project.targetIds,
                  })
                  const saved = saveResearchHypothesis(hyp)
                  if (!saved.ok) {
                    onBanner('err', saved.message)
                    return
                  }
                  onRefresh()
                  onBanner(
                    'ok',
                    `Seeded research hypothesis “${hyp.title}”` +
                      (entry.claimIds?.length
                        ? ` (${entry.claimIds.length} claims)`
                        : ' (no claim ids on index — re-export pack)'),
                  )
                }}
              >
                Seed research hypothesis
              </button>
            </li>
          ))}
        </ul>
      )}
      <PackBuilder
        panels={boardPanels}
        claims={boardClaims}
        landscapeClaims={boardLandscapeClaims}
        panelsLoading={panelsLoading}
        densityWarnings={packWarnings}
        candidates={project.candidates}
        disease={project.disease ?? null}
        projectId={project.id}
        defaultTitle={`${project.name} evidence pack`}
        preferencesSnapshot={
          project.preferencesSnapshot?.rubricPreset
            ? {
                rubricPreset: project.preferencesSnapshot.rubricPreset as
                  | 'balanced'
                  | 'repurposing'
                  | 'novel-bioactive'
                  | 'safety-first',
                aeAggressiveness:
                  project.preferencesSnapshot.aeAggressiveness ?? 'soft-flag',
                harvestTiming:
                  project.preferencesSnapshot.harvestTiming ?? 'board-promote',
              }
            : undefined
        }
        onExported={() => onRefresh()}
      />
      <p className="text-[11px] text-slate-600">
        Board packs auto-fetch Core + landscape categories (mechanisms, trials, AE, Open Targets,
        pharma/biologics, grants/orgs) for promoted CIDs with parallel budgets. Pre-extracted
        multi-subject claims (≤200) preserve per-candidate attribution. Toggle Landscape pack mode
        for org · sponsor · biosimilar · jurisdiction claims. Enable “Share links when available” in
        Discover preferences for Share pack.
      </p>
      {(project.packIndex?.length ?? 0) >= 2 && (
        <MultiPackContrastPicker
          project={project}
          onRivalCreated={(id) => {
            onRefresh()
            onBanner(
              'ok',
              `Contrast rival hypothesis created — open from list below (${id.slice(0, 10)}…)`,
            )
          }}
        />
      )}
    </section>
  )
}
