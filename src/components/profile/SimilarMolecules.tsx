'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { clientFetch } from '@/lib/clientFetch'
import type { SimilarMolecule } from '@/lib/api/pubchem-similar'
import {
  getProfileClientCacheAsync,
  profileCacheKey,
  setProfileClientCache,
} from '@/lib/profileClientCache'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

interface TargetRelatedMolecule {
  name: string
  sharedTargets: string[]
  interactionTypes: string[]
  sources: string[]
}

interface SimilarResponse {
  structural: SimilarMolecule[]
  targetRelated: TargetRelatedMolecule[]
}

/** Per-card reason for structural similarity (PubChem 2D fingerprint). */
function structuralReason(mol: SimilarMolecule): string {
  const mw =
    mol.molecularWeight > 0
      ? ` · MW ${Math.round(mol.molecularWeight)}`
      : ''
  return `PubChem 2D fingerprint similarity ≥ 90% to this molecule (fastsimilarity_2d; top neighbors excluding self)${mw}. Structure lookalikes — not the same as shared biology or approved indication.`
}

/** Per-card reason for DGIdb target co-occurrence. */
function targetRelatedReason(mol: TargetRelatedMolecule): string {
  const genes = mol.sharedTargets.slice(0, 4).join(', ')
  const more =
    mol.sharedTargets.length > 4 ? ` +${mol.sharedTargets.length - 4} more` : ''
  const types =
    mol.interactionTypes.length > 0
      ? ` Interaction types: ${mol.interactionTypes.slice(0, 3).join(', ')}.`
      : ''
  const dbs =
    mol.sources.length > 0
      ? ` Evidence DBs: ${mol.sources.slice(0, 3).join(', ')}.`
      : ''
  return `Also interacts with ${mol.sharedTargets.length} gene target${
    mol.sharedTargets.length === 1 ? '' : 's'
  } of this molecule via DGIdb (${genes}${more}).${types}${dbs} Shared targets ≠ same mechanism or safety.`
}

export function SimilarMolecules({ cid }: { cid: number }) {
  const [data, setData] = useState<SimilarResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const cacheKey = profileCacheKey('similar', cid)
      try {
        const cached = await getProfileClientCacheAsync<SimilarResponse>(cacheKey)
        if (cached && !cancelled) {
          setData(cached)
          setLoading(false)
          return
        }
        const res = await clientFetch(`/api/molecule/${cid}/similar`, undefined, {
          retries: 1,
          retryDelayMs: 400,
        })
        const json = res.ok ? await res.json() : null
        let next: SimilarResponse | null = null
        if (json && typeof json === 'object' && ('structural' in json || 'targetRelated' in json)) {
          next = json as SimilarResponse
        } else if (Array.isArray(json)) {
          next = { structural: json, targetRelated: [] }
        }
        if (next) setProfileClientCache(cacheKey, next)
        if (!cancelled) setData(next)
      } catch {
        if (!cancelled) setData(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [cid])

  if (loading) {
    return (
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-40 mb-3" />
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-32 h-20 bg-slate-700/50 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null
  const { structural, targetRelated } = data
  if (structural.length === 0 && targetRelated.length === 0) return null

  return (
    <div className="space-y-4">
      {structural.length > 0 && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <svg
              className="w-4 h-4 text-indigo-400 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Structurally Similar
            </h2>
            <span className="text-[10px] text-slate-500">
              {structural.length} from PubChem 2D fingerprint
            </span>
          </div>
          <p className="text-[10px] text-slate-600 mb-3 leading-relaxed">
            Why these appear: nearest neighbors by PubChem 2D Tanimoto-style fingerprint match
            (threshold ≥ 90%), excluding this CID. Structural likeness only — not indication or
            target evidence.
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {structural.map((mol) => {
              const why = structuralReason(mol)
              return (
                <StyledTooltip key={mol.cid} content={why}>
                <Link
                  href={`/molecule/${mol.cid}`}
                  className="flex-shrink-0 w-44 bg-slate-800/50 border border-slate-700 rounded-lg p-3 hover:border-indigo-500/50 transition-colors block"
                >
                  <div className="bg-white rounded-md w-full h-20 flex items-center justify-center mb-2 relative">
                    <Image
                      src={mol.imageUrl}
                      alt={mol.name}
                      width={64}
                      height={64}
                      className="h-16 object-contain"
                      loading="lazy"
                      unoptimized
                    />
                  </div>
                  <p className="text-xs font-semibold text-slate-200 truncate">{mol.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{mol.formula}</p>
                  <p className="text-[9px] text-slate-500 mt-1.5 leading-snug line-clamp-3">
                    <span className="text-slate-600 font-medium">Why: </span>
                    ≥90% 2D fingerprint match (PubChem)
                  </p>
                </Link>
                </StyledTooltip>
              )
            })}
          </div>
        </div>
      )}

      {targetRelated.length > 0 && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <svg
              className="w-4 h-4 text-cyan-400 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57 1.8A2.25 2.25 0 0116.15 18H1.8m18 0l-1.57-2.7M1.8 18h-.3m18 0l-2.1-3.6"
              />
            </svg>
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Target-Related
            </h2>
            <span className="text-[10px] text-slate-500">share gene targets via DGIdb</span>
          </div>
          <p className="text-[10px] text-slate-600 mb-3 leading-relaxed">
            Why these appear: other drugs that DGIdb links to one or more of this molecule&apos;s
            gene targets. Co-occurrence of targets, not structural or indication match.
          </p>
          <div className="space-y-2">
            {targetRelated.map((mol) => {
              const why = targetRelatedReason(mol)
              return (
                <StyledTooltip key={mol.name} content={why} className="w-full">
                <div
                  className="py-2 px-3 rounded-lg hover:bg-slate-700/40 transition-colors w-full"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/molecule/name/${encodeURIComponent(mol.name)}`}
                        className="text-xs font-semibold text-indigo-300 hover:text-indigo-200 truncate block"
                      >
                        {mol.name}
                      </Link>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {mol.sharedTargets.slice(0, 5).map((gene) => (
                          <a
                            key={gene}
                            href={`/gene?q=${encodeURIComponent(gene)}`}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-900/30 text-cyan-400 border border-cyan-800/30 hover:bg-cyan-800/40 transition-colors"
                          >
                            {gene}
                          </a>
                        ))}
                        {mol.sharedTargets.length > 5 && (
                          <span className="text-[9px] text-slate-500">
                            +{mol.sharedTargets.length - 5}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {mol.interactionTypes.slice(0, 2).map((t) => (
                        <span
                          key={t}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-violet-900/30 text-violet-300 border border-violet-800/30"
                        >
                          {t}
                        </span>
                      ))}
                      <span className="text-[10px] px-2 py-1 rounded-full bg-indigo-900/40 text-indigo-300 font-semibold border border-indigo-800/30">
                        {mol.sharedTargets.length} shared
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
                    <span className="text-slate-600 font-medium">Why related: </span>
                    Shares {mol.sharedTargets.length} target
                    {mol.sharedTargets.length === 1 ? '' : 's'} with this molecule on DGIdb
                    {mol.sharedTargets[0]
                      ? ` (e.g. ${mol.sharedTargets.slice(0, 3).join(', ')})`
                      : ''}
                    .
                  </p>
                </div>
                </StyledTooltip>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
