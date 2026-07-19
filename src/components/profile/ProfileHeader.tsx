'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import type { Molecule } from '@/lib/types'
import { ClassificationBadge as Badge } from '@/components/ui/Badge'
import { formatMolecularWeight } from '@/lib/utils'
import { FavoriteButton } from '@/components/profile/FavoriteButton'
import { MoleculeViewer3D } from '@/components/profile/MoleculeViewer3D'
import { SaveToProjectButton } from '@/components/projects/SaveToProjectButton'
import { mapLegacyCandidateToMoleculeCandidate } from '@/lib/domain'
import { probePubChem3dClient } from '@/lib/api/pubchem3d'

/** True when identity fell back to a minimal CID shell (PubChem/MyChem limited). */
export function isIdentityShellMolecule(molecule: Pick<Molecule, 'name' | 'description' | 'formula' | 'inchiKey' | 'molecularWeight'>): boolean {
  const desc = (molecule.description || '').toLowerCase()
  if (
    desc.includes('minimal identity shell') ||
    desc.includes('full structure metadata unavailable') ||
    desc.includes('identity resolved via mychem fallback') ||
    desc.includes('upstream identity apis unavailable')
  ) {
    return true
  }
  // Bare CID name + empty chemistry fields
  if (
    /^CID\s+\d+$/i.test(molecule.name.trim()) &&
    !molecule.formula?.trim() &&
    !molecule.inchiKey?.trim() &&
    !(molecule.molecularWeight > 0)
  ) {
    return true
  }
  return false
}

export function ProfileHeader({ molecule }: { molecule: Molecule }) {
  const [show3D, setShow3D] = useState(false)
  /** null = probing, true/false = known */
  const [has3d, setHas3d] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    setHas3d(null)
    setShow3D(false)
    void (async () => {
      const ok = await probePubChem3dClient(molecule.cid)
      if (!cancelled) setHas3d(ok)
    })()
    return () => {
      cancelled = true
    }
  }, [molecule.cid])

  const projectCandidate = useMemo(
    () =>
      mapLegacyCandidateToMoleculeCandidate({
        name: molecule.name,
        cid: molecule.cid,
        sources: ['PubChem'],
        compositeScore: 0,
        clinicalPhase: 0,
        clinicalPhaseRaw: 0,
        trialCountRaw: 0,
        trialCountNorm: 0,
        geneAssociationScore: 0,
        geneScoreRaw: 0,
        sharedTargetRatio: 0,
        sharedTargetCountRaw: 0,
        confidence: 'preliminary',
      }),
    [molecule.cid, molecule.name],
  )

  const toggleDisabled = has3d === false
  const toggleLabel =
    has3d === null ? '…' : show3D ? '2D' : has3d === false ? '2D only' : '3D'

  const identityShell = isIdentityShellMolecule(molecule)

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start w-full">
      <div className="flex-shrink-0 relative">
        {show3D && has3d !== false ? (
          <MoleculeViewer3D
            cid={molecule.cid}
            name={molecule.name}
            fallbackImageUrl={molecule.structureImageUrl}
            has3d={has3d}
          />
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
          type="button"
          disabled={toggleDisabled || has3d === null}
          onClick={() => {
            if (toggleDisabled) return
            setShow3D((v) => !v)
          }}
          title={
            has3d === false
              ? 'PubChem has no 3D conformer for this CID — 2D structure only'
              : has3d === null
                ? 'Checking 3D availability…'
                : show3D
                  ? 'Show 2D structure image'
                  : 'Show interactive 3D (MolView)'
          }
          className={`absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs px-2 py-0.5 rounded-full border transition-colors ${
            toggleDisabled || has3d === null
              ? 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border-slate-600'
          }`}
          data-testid="structure-3d-toggle"
        >
          {toggleLabel}
        </button>
      </div>
      <div className="flex-1 min-w-0">
        {identityShell && (
          <div
            className="mb-3 rounded-lg border border-amber-800/40 bg-amber-950/30 px-3 py-2 text-[11px] text-amber-100/90 leading-relaxed"
            data-testid="identity-shell-banner"
            role="status"
          >
            <span className="font-semibold text-amber-200">Limited identity metadata. </span>
            PubChem structure lookup was unavailable from this host, so the profile is using a
            minimal CID shell. Evidence panels may still load by CID; names, formula, and InChIKey
            can be incomplete until identity APIs recover.
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-slate-100">{molecule.name}</h1>
          <Badge classification={molecule.classification} />
          <FavoriteButton cid={molecule.cid} name={molecule.name} />
          <SaveToProjectButton
            candidate={projectCandidate}
            defaultProjectName={`${molecule.name} board`}
            compact
          />
        </div>
        <p className="text-slate-400 font-mono text-sm mb-2">{molecule.formula || '—'}</p>
        <p className="text-slate-400 text-sm mb-3">{molecule.iupacName || ''}</p>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-slate-400">
            MW:{' '}
            <span className="text-slate-200">
              {formatMolecularWeight(molecule.molecularWeight)}
            </span>
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
