'use client'

import {
  assessIdentityTrust,
  isValidInchiKey,
  normalizeChemblId,
  normalizeCid,
  normalizeInchiKey,
  type IdentityKeys,
  type IdentityTrust,
  type IdentityTrustLevel,
} from '@/lib/domain'

/**
 * @deprecated Level styles kept for any leftover consumers; UI no longer shows level chips.
 */
export const IDENTITY_TRUST_STYLES: Record<
  IdentityTrustLevel,
  { bg: string; text: string; border: string; label: string; short: string }
> = {
  high: {
    bg: 'bg-emerald-900/30',
    text: 'text-emerald-300',
    border: 'border-emerald-700/50',
    label: 'Identity high',
    short: 'High',
  },
  medium: {
    bg: 'bg-cyan-900/30',
    text: 'text-cyan-300',
    border: 'border-cyan-700/50',
    label: 'Identity medium',
    short: 'Medium',
  },
  low: {
    bg: 'bg-amber-900/30',
    text: 'text-amber-300',
    border: 'border-amber-700/50',
    label: 'Identity low',
    short: 'Low',
  },
  unresolved: {
    bg: 'bg-slate-800/60',
    text: 'text-slate-400',
    border: 'border-slate-600/50',
    label: 'Identity unresolved',
    short: 'Unresolved',
  },
}

export function identityTrustLabel(level: IdentityTrustLevel, compact = false): string {
  const s = IDENTITY_TRUST_STYLES[level]
  return compact ? s.short : s.label
}

export interface IdentityIdChip {
  kind: string
  label: string
  title?: string
  href?: string
}

/** Collect known structure/xref identifiers for display (no high/medium/unresolved labels). */
export function identityIdChips(keys?: IdentityKeys): IdentityIdChip[] {
  if (!keys) return []
  const chips: IdentityIdChip[] = []
  const inchiKey = normalizeInchiKey(keys.inchiKey)
  if (inchiKey && isValidInchiKey(inchiKey)) {
    chips.push({
      kind: 'inchikey',
      label: `InChIKey ${inchiKey.slice(0, 14)}…`,
      title: inchiKey,
      href: `https://www.ebi.ac.uk/chembl/g/#search_results/all/query=${encodeURIComponent(inchiKey)}`,
    })
  }
  const cid = normalizeCid(keys.cid ?? null)
  if (cid != null) {
    chips.push({
      kind: 'cid',
      label: `CID ${cid}`,
      title: `PubChem CID ${cid}`,
      href: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
    })
  }
  const chemblId = normalizeChemblId(keys.chemblId)
  if (chemblId) {
    chips.push({
      kind: 'chembl',
      label: chemblId,
      title: chemblId,
      href: `https://www.ebi.ac.uk/chembl/compound_report_card/${chemblId}/`,
    })
  }
  if (keys.chebiId?.trim()) {
    const id = keys.chebiId.trim()
    const num = id.replace(/^CHEBI:/i, '')
    chips.push({
      kind: 'chebi',
      label: id.startsWith('CHEBI') ? id : `CHEBI:${id}`,
      href: `https://www.ebi.ac.uk/chebi/searchId.do?chebiId=CHEBI:${num}`,
    })
  }
  if (keys.drugbankId?.trim()) {
    const id = keys.drugbankId.trim()
    chips.push({
      kind: 'drugbank',
      label: id,
      title: `DrugBank ${id}`,
      href: `https://go.drugbank.com/drugs/${encodeURIComponent(id)}`,
    })
  }
  if (keys.smiles?.trim()) {
    const s = keys.smiles.trim()
    chips.push({
      kind: 'smiles',
      label: s.length > 24 ? `SMILES ${s.slice(0, 22)}…` : `SMILES ${s}`,
      title: s,
    })
  }
  return chips
}

export interface IdentityTrustBadgeProps {
  /** Explicit trust level — used only for data attributes / scoring; not shown as text. */
  level?: IdentityTrust
  /** Keys used to list known identifiers. */
  keys?: IdentityKeys
  /** @deprecated Ignored — reasons no longer shown as level chips. */
  reasons?: string[]
  /** @deprecated No level short/long labels. */
  compact?: boolean
  className?: string
  showTitle?: boolean
}

/**
 * Shows known chemical identifiers (CID, InChIKey, ChEMBL, …).
 * Does not show high / medium / unresolved trust chips.
 */
export function IdentityTrustBadge({
  level,
  keys,
  className = '',
}: IdentityTrustBadgeProps) {
  const assessment = keys ? assessIdentityTrust(keys) : null
  const trust: IdentityTrustLevel = level ?? assessment?.level ?? 'unresolved'
  const chips = identityIdChips(keys ?? assessment?.keys)

  if (chips.length === 0) {
    return (
      <span
        className={`inline-flex flex-wrap gap-1 text-[10px] text-slate-600 ${className}`}
        data-identity-trust={trust}
        data-testid="identity-trust-badge"
      >
        No structure IDs
      </span>
    )
  }

  return (
    <span
      className={`inline-flex flex-wrap items-center gap-1 ${className}`}
      data-identity-trust={trust}
      data-testid="identity-trust-badge"
    >
      {chips.map((c) => {
        const cls =
          'inline-flex items-center rounded border border-slate-700/70 bg-slate-800/70 px-1.5 py-0.5 font-mono text-[10px] text-slate-300 hover:border-slate-500 hover:text-slate-100'
        if (c.href) {
          return (
            <a
              key={`${c.kind}-${c.label}`}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className={cls}
              title={c.title || c.label}
              data-testid={`identity-id-${c.kind}`}
            >
              {c.label}
            </a>
          )
        }
        return (
          <span
            key={`${c.kind}-${c.label}`}
            className={cls}
            title={c.title || c.label}
            data-testid={`identity-id-${c.kind}`}
          >
            {c.label}
          </span>
        )
      })}
    </span>
  )
}
