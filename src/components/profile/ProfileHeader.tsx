'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Molecule } from '@/lib/types'
import { ClassificationBadge as Badge } from '@/components/ui/Badge'
import { formatMolecularWeight } from '@/lib/utils'
import { FavoriteButton } from '@/components/profile/FavoriteButton'
import { MoleculeViewer3D } from '@/components/profile/MoleculeViewer3D'

export function ProfileHeader({ molecule }: { molecule: Molecule }) {
  const [show3D, setShow3D] = useState(false)

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      <div className="flex-shrink-0 relative">
        {show3D ? (
          <MoleculeViewer3D cid={molecule.cid} name={molecule.name} />
        ) : (
          <div className="bg-white rounded-xl p-3 w-32 h-32 md:w-48 md:h-48 flex items-center justify-center">
            <Image
              src={molecule.structureImageUrl}
              alt={`Structure of ${molecule.name}`}
              width={160}
              height={160}
              className="object-contain"
              unoptimized
              priority
            />
          </div>
        )}
        <button
          onClick={() => setShow3D(!show3D)}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-0.5 rounded-full border border-slate-600 transition-colors"
        >
          {show3D ? '2D' : '3D'}
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-slate-100">{molecule.name}</h1>
          <Badge classification={molecule.classification} />
          <FavoriteButton cid={molecule.cid} name={molecule.name} />
        </div>
        <p className="text-slate-400 font-mono text-sm mb-2">{molecule.formula}</p>
        <p className="text-slate-400 text-sm mb-3">{molecule.iupacName}</p>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-slate-400">
            MW: <span className="text-slate-200">{formatMolecularWeight(molecule.molecularWeight)}</span>
          </span>
          <span className="text-slate-400">
            PubChem CID: <span className="text-slate-200">{molecule.cid}</span>
          </span>
        </div>
        {molecule.description && (
          <p className="text-slate-400 text-sm mt-3 line-clamp-2">{molecule.description}</p>
        )}
      </div>
    </div>
  )
}
