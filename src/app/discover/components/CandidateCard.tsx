'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import type { CandidateMolecule } from '@/lib/candidateRanker'
import {
  mapLegacyCandidateToMoleculeCandidate,
  type MoleculeCandidate,
  type ScoreRubric,
} from '@/lib/domain'
import { AlternateCids, IdentityTrustBadge } from '@/components/identity'
import {
  SaveToProjectButton,
  type SaveProjectContext,
} from '@/components/projects/SaveToProjectButton'
import { buildMoleculeLinkUrl } from '@/lib/profileMode'
import { DataPoint } from '@/components/ui/DataPoint'
import { StyledTooltip } from '@/components/ui/StyledTooltip'
import { originSourceDeepLink } from '@/lib/originDeepLinks'
import { ScoreExplainer } from '@/components/score/ScoreExplainer'
import { ConfidenceBadge } from './DiscoveryProgress'
import { ScoreAxisBars } from './ScoreAxisBars'
import { buildCandidateWhy } from '@/lib/discovery/candidateWhy'

/** Map Discover source pill labels → provenance keys */
function discoverSourceKey(source: string): string {
  const s = source.trim().toLowerCase()
  if (s.includes('dgidb')) return 'dgidb'
  if (s.includes('clinical')) return 'clinical-trials'
  if (s.includes('chembl')) return 'chembl'
  if (s.includes('open targets')) return 'opentargets'
  if (s.includes('disgenet')) return 'disgenet'
  if (s.includes('orphanet')) return 'orphanet'
  if (s.includes('pubchem')) return 'pubchem'
  return s.replace(/\s+/g, '-')
}

export { buildMoleculeLinkUrl }

interface Props {
  candidate: CandidateMolecule
  rank: number
  diseaseName: string
  topCandidates: CandidateMolecule[]
  diseaseGenes?: { symbol: string; score: number }[]
  /**
   * Resolved domain candidate from RankResult.v2 (InChIKey + ScoreVector).
   * Falls back to mapping the legacy DTO when omitted.
   */
  domainCandidate?: MoleculeCandidate
  /** Live scoring rubric (weights for explainer). */
  rubric?: ScoreRubric
  /** Stamp disease/targets/rubric on board save (V2-03). */
  projectContext?: SaveProjectContext
  /** When rank result was generated or restored from cache (ISO). */
  rankedAt?: string | null
}

const PHASE_LABELS: Record<number, string> = {
  1: 'Phase I',
  2: 'Phase II',
  3: 'Phase III',
  4: 'Approved',
}

function sourceRecordUrl(
  source: string,
  query?: string,
  cid?: number | null,
  chemblId?: string | null,
): string | null {
  return originSourceDeepLink(source, {
    name: query,
    diseaseName: query,
    cid,
    chemblId,
  }).href
}

function SourcePill({
  source,
  query,
  cid,
  chemblId,
}: {
  source: string
  query?: string
  cid?: number | null
  chemblId?: string | null
}) {
  const colors: Record<string, string> = {
    DGIdb: 'bg-purple-900/30 text-purple-300 border-purple-700/50',
    ClinicalTrials: 'bg-blue-900/30 text-blue-300 border-blue-700/50',
    ChEMBL: 'bg-emerald-900/30 text-emerald-300 border-emerald-700/50',
    'Open Targets': 'bg-cyan-900/30 text-cyan-300 border-cyan-700/50',
    DisGeNET: 'bg-amber-900/30 text-amber-300 border-amber-700/50',
    Orphanet: 'bg-rose-900/30 text-rose-300 border-rose-700/50',
    PubChem: 'bg-orange-900/30 text-orange-300 border-orange-700/50',
  }

  const link = originSourceDeepLink(source, {
    name: query,
    diseaseName: query,
    cid,
    chemblId,
  })
  const colorClass = colors[source] ?? 'bg-slate-700/50 text-slate-400 border-slate-600/50'

  if (link.href) {
    return (
      <StyledTooltip content={link.title}>
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-[9px] px-1.5 py-0.5 rounded border hover:brightness-125 transition-colors ${colorClass}`}
        >
          {source} ↗
        </a>
      </StyledTooltip>
    )
  }

  return (
    <StyledTooltip content={link.title}>
      <span className={`text-[9px] px-1.5 py-0.5 rounded border ${colorClass}`}>{source}</span>
    </StyledTooltip>
  )
}

// ScoreExplainer lives in @/components/score/ScoreExplainer (shared polish)

function CompositeScoreRing({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference
  const color = pct >= 70 ? 'text-emerald-400' : pct >= 40 ? 'text-amber-400' : 'text-slate-400'
  const strokeColor = pct >= 70 ? '#34d399' : pct >= 40 ? '#fbbf24' : '#94a3b8'

  return (
    <div className="flex-shrink-0 relative w-16 h-16" data-testid="composite-score-ring">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="#1e293b" strokeWidth="4" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-bold ${color}`}>{pct}</span>
      </div>
    </div>
  )
}

export function CandidateCard({
  candidate,
  rank,
  diseaseName,
  domainCandidate: domainCandidateProp,
  rubric,
  projectContext,
  rankedAt,
}: Props) {
  const phaseLabel =
    PHASE_LABELS[candidate.clinicalPhaseRaw] ??
    (candidate.clinicalPhaseRaw > 0 ? `Phase ${candidate.clinicalPhaseRaw}` : 'Preclinical')
  const hasCid = candidate.cid !== null && candidate.cid !== undefined

  const domainCandidate = useMemo(
    () =>
      domainCandidateProp ??
      mapLegacyCandidateToMoleculeCandidate(candidate, rubric ? { rubric } : undefined),
    [domainCandidateProp, candidate, rubric],
  )

  const identity = domainCandidate.identity
  const scores = domainCandidate.scores
  const compositeScore = scores?.composite ?? candidate.compositeScore

  const identityKeys = useMemo(
    () => ({
      inchiKey: identity.inchiKey,
      chemblId: identity.chemblId,
      cid: identity.pubchemCid,
      name: identity.name,
      smiles: identity.smiles,
      chebiId: identity.chebiId,
      drugbankId: identity.drugbankId,
      alternateCids: identity.alternateCids,
    }),
    [identity],
  )

  const profileHref = hasCid
    ? buildMoleculeLinkUrl({
        cid: candidate.cid!,
        rank,
        diseaseName,
        score: compositeScore,
        scores: scores ?? null,
      })
    : null

  const cardContent = (
    <>
      <div className="flex items-start gap-3">
        <CompositeScoreRing score={compositeScore} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono text-slate-500">#{rank}</span>
            <h3 className="text-base font-semibold text-slate-100 truncate">{candidate.name}</h3>
            {hasCid && (
              <span className="text-[10px] text-slate-500 shrink-0">CID {candidate.cid}</span>
            )}
            <div className="ml-auto shrink-0">
              <SaveToProjectButton
                candidate={domainCandidate}
                defaultProjectName={diseaseName ? `${diseaseName} board` : undefined}
                projectContext={projectContext}
                compact
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <IdentityTrustBadge level={identity.identityTrust} keys={identityKeys} />
            <ConfidenceBadge confidence={candidate.confidence} />
            {candidate.clinicalPhaseRaw > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-900/30 text-indigo-300 border border-indigo-700/50 font-medium">
                {phaseLabel}
              </span>
            )}
          </div>
          {identity.inchiKey && (
            <StyledTooltip content={identity.inchiKey}>
              <p className="mb-1.5 max-w-full truncate font-mono text-[10px] text-slate-600">
                InChIKey {identity.inchiKey}
              </p>
            </StyledTooltip>
          )}
          <AlternateCids
            primaryCid={identity.pubchemCid ?? candidate.cid}
            alternateCids={identity.alternateCids}
            className="mb-2"
          />
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-medium text-slate-400">Score breakdown</span>
            <ScoreExplainer rubric={rubric} scores={scores} />
          </div>
          {scores ? (
            <div className="mb-2">
              {/* Explainer is above; bars keep per-axis hover flyouts without a second ? icon */}
              <ScoreAxisBars scores={scores} rubric={rubric} showExplainer={false} />
            </div>
          ) : (
            <p className="text-[10px] text-slate-600 mb-2">No multi-axis scores available.</p>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            {candidate.sources.map((s) => {
              const recordUrl =
                sourceRecordUrl(
                  s,
                  candidate.name || diseaseName,
                  candidate.cid,
                  identity.chemblId,
                ) ||
                (hasCid
                  ? `https://pubchem.ncbi.nlm.nih.gov/compound/${candidate.cid}`
                  : undefined)
              return (
                <div key={s} className="inline-flex items-center gap-1">
                  <SourcePill
                    source={s}
                    query={candidate.name || diseaseName}
                    cid={candidate.cid}
                    chemblId={identity.chemblId}
                  />
                  <DataPoint
                    sourceKey={discoverSourceKey(s)}
                    label={`${candidate.name} · ${s}`}
                    recordUrl={recordUrl || undefined}
                    fetchedAt={rankedAt || undefined}
                    className="!gap-0.5"
                  >
                    <span className="sr-only">Provenance for {s}</span>
                  </DataPoint>
                </div>
              )
            })}
            {candidate.trialCountRaw > 0 && (
              <span className="text-[10px] text-slate-500">
                {candidate.trialCountRaw} trial{candidate.trialCountRaw !== 1 ? 's' : ''}
              </span>
            )}
            {candidate.sharedTargetCountRaw > 0 && (
              <span className="text-[10px] text-slate-500">
                {candidate.sharedTargetCountRaw} target
                {candidate.sharedTargetCountRaw !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <StyledTooltip content={buildCandidateWhy(candidate, diseaseName)}>
            <p
              className="mt-2 text-[11px] text-slate-500 leading-snug border-t border-slate-800/80 pt-2"
              data-testid="candidate-why"
            >
              <span className="text-slate-600 font-medium">Why this row: </span>
              {buildCandidateWhy(candidate, diseaseName)}
            </p>
          </StyledTooltip>
        </div>
      </div>
    </>
  )

  return (
    <div
      className={`bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 transition-colors ${
        hasCid ? 'hover:border-indigo-600/50' : 'opacity-80'
      }`}
      data-testid="candidate-card"
    >
      {cardContent}
      {profileHref ? (
        <Link
          href={profileHref}
          className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
        >
          View full profile
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      ) : (
        <p className="mt-2 text-[10px] text-slate-600">No PubChem CID — limited data available</p>
      )}
    </div>
  )
}
