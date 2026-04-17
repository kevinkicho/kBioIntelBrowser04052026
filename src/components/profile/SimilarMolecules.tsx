'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { clientFetch } from '@/lib/clientFetch'
import type { SimilarMolecule } from '@/lib/api/pubchem-similar'

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

export function SimilarMolecules({ cid }: { cid: number }) {
  const [data, setData] = useState<SimilarResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    clientFetch(`/api/molecule/${cid}/similar`)
      .then(res => res.ok ? res.json() : null)
      .then(json => {
        if (json && typeof json === 'object' && ('structural' in json || 'targetRelated' in json)) {
          setData(json as SimilarResponse)
        } else if (Array.isArray(json)) {
          setData({ structural: json, targetRelated: [] })
        } else {
          setData(null)
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [cid])

  if (loading) {
    return (
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-40 mb-3" />
        <div className="flex gap-3">
          {[1, 2, 3].map(i => (
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
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Structurally Similar</h2>
            <span className="text-[10px] text-slate-500">{structural.length} from PubChem 2D fingerprint</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {structural.map(mol => (
              <Link
                key={mol.cid}
                href={`/molecule/${mol.cid}`}
                className="flex-shrink-0 w-36 bg-slate-800/50 border border-slate-700 rounded-lg p-3 hover:border-indigo-500/50 transition-colors"
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
              </Link>
            ))}
          </div>
        </div>
      )}

      {targetRelated.length > 0 && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57 1.8A2.25 2.25 0 0116.15 18H1.8m18 0l-1.57-2.7M1.8 18h-.3m18 0l-2.1-3.6" />
            </svg>
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Target-Related</h2>
            <span className="text-[10px] text-slate-500">share gene targets via DGIdb</span>
          </div>
          <div className="space-y-2">
            {targetRelated.map(mol => (
              <Link
                key={mol.name}
                href={`/molecule/name/${encodeURIComponent(mol.name)}`}
                className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg hover:bg-slate-700/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-indigo-300 truncate">{mol.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {mol.sharedTargets.slice(0, 5).map(gene => (
                      <Link
                        key={gene}
                        href={`/gene?q=${encodeURIComponent(gene)}`}
                        onClick={e => e.stopPropagation()}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-900/30 text-cyan-400 border border-cyan-800/30 hover:bg-cyan-800/40 transition-colors"
                      >
                        {gene}
                      </Link>
                    ))}
                    {mol.sharedTargets.length > 5 && (
                      <span className="text-[9px] text-slate-500">+{mol.sharedTargets.length - 5}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {mol.interactionTypes.slice(0, 2).map(t => (
                    <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-violet-900/30 text-violet-300 border border-violet-800/30">{t}</span>
                  ))}
                  <span className="text-[10px] px-2 py-1 rounded-full bg-indigo-900/40 text-indigo-300 font-semibold border border-indigo-800/30">
                    {mol.sharedTargets.length} shared
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}