'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { clientFetch } from '@/lib/clientFetch'
import type { SimilarMolecule } from '@/lib/api/pubchem-similar'

interface Props {
  cid: number
}

export function SimilarMolecules({ cid }: Props) {
  const [molecules, setMolecules] = useState<SimilarMolecule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    clientFetch(`/api/molecule/${cid}/similar`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setMolecules(Array.isArray(data) ? data : []))
      .catch(() => setMolecules([]))
      .finally(() => setLoading(false))
  }, [cid])

  if (loading) {
    return (
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Similar Molecules</h2>
        <div className="flex gap-3">
          {[1,2,3].map(i => (
            <div key={i} className="w-32 h-24 bg-slate-800/50 border border-slate-700 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (molecules.length === 0) return null

  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Similar Molecules</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {molecules.map(mol => (
          <a
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
            <p className="text-xs text-slate-500 font-mono">{mol.formula}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
