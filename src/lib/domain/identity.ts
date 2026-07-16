/**
 * Identity trust — structure/xref quality (not evidence breadth).
 * @see docs/design/discovery-workbench-v1.md §3.2
 */

export type IdentityTrustLevel = 'high' | 'medium' | 'low' | 'unresolved'

/** Alias used in product copy; same union as IdentityTrustLevel. */
export type IdentityTrust = IdentityTrustLevel

/** Primary chemical identity keys used for resolve + trust. */
export interface IdentityKeys {
  inchiKey?: string
  chemblId?: string
  /** PubChem CID; null/undefined = unknown */
  cid?: number | null
  name?: string
  smiles?: string
  chebiId?: string
  drugbankId?: string
  alternateCids?: number[]
}

export interface IdentityTrustAssessment {
  level: IdentityTrustLevel
  /** Numeric axis value: high 1.0 / medium 0.66 / low 0.33 / unresolved 0 */
  axisValue: number
  reasons: string[]
  keys: IdentityKeys
}

/** Design §5.3: identityTrust axis scores */
export const IDENTITY_TRUST_AXIS_VALUES: Record<IdentityTrustLevel, number> = {
  high: 1.0,
  medium: 0.66,
  low: 0.33,
  unresolved: 0,
}

const INCHIKEY_RE = /^[A-Z]{14}-[A-Z]{10}-[A-Z]$/

export function normalizeInchiKey(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined
  const v = raw.trim().toUpperCase()
  if (!v) return undefined
  return v
}

export function isValidInchiKey(raw: string | undefined | null): boolean {
  const v = normalizeInchiKey(raw)
  return !!v && INCHIKEY_RE.test(v)
}

/**
 * Accept only CHEMBL + digits (or bare numeric → CHEMBL{n}).
 * Garbage strings return undefined so candidateId falls through to CID/name.
 */
export function normalizeChemblId(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined
  const t = raw.trim().toUpperCase()
  if (!t) return undefined
  if (/^CHEMBL\d+$/.test(t)) return t
  if (/^\d+$/.test(t)) return `CHEMBL${t}`
  return undefined
}

export function normalizeCid(raw: number | string | null | undefined): number | null {
  if (raw == null || raw === '') return null
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/^CID[:\s]*/i, ''))
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null
  return n
}

export function identityTrustToAxisValue(level: IdentityTrustLevel): number {
  return IDENTITY_TRUST_AXIS_VALUES[level]
}

/**
 * Assess structure/xref identity trust from available keys.
 *
 * high     — valid InChIKey (optionally with cross-refs)
 * medium   — ChEMBL and/or CID without structure key
 * low      — name-only with weak secondary signals, or alternate CIDs only
 * unresolved — insufficient identity
 */
export function assessIdentityTrust(keys: IdentityKeys): IdentityTrustAssessment {
  const inchiKey = normalizeInchiKey(keys.inchiKey)
  const chemblId = normalizeChemblId(keys.chemblId)
  const cid = normalizeCid(keys.cid ?? null)
  const alternateCids = (keys.alternateCids ?? []).filter((c) => Number.isInteger(c) && c > 0)
  const hasName = !!(keys.name && keys.name.trim())
  const hasSmiles = !!(keys.smiles && keys.smiles.trim())
  const hasXref = !!(chemblId || keys.chebiId || keys.drugbankId)

  const normalized: IdentityKeys = {
    ...keys,
    inchiKey,
    chemblId,
    cid,
    alternateCids: alternateCids.length ? alternateCids : undefined,
  }

  const reasons: string[] = []

  if (isValidInchiKey(inchiKey)) {
    reasons.push('Valid InChIKey')
    if (hasXref) reasons.push('External cross-reference present')
    if (cid != null) reasons.push(`PubChem CID ${cid}`)
    return {
      level: 'high',
      axisValue: IDENTITY_TRUST_AXIS_VALUES.high,
      reasons,
      keys: normalized,
    }
  }

  if (inchiKey) {
    reasons.push('InChIKey present but not standard format')
  }

  if (chemblId && cid != null) {
    reasons.push(`ChEMBL ${chemblId}`, `PubChem CID ${cid}`)
    return {
      level: 'medium',
      axisValue: IDENTITY_TRUST_AXIS_VALUES.medium,
      reasons,
      keys: normalized,
    }
  }

  if (chemblId) {
    reasons.push(`ChEMBL ${chemblId}`)
    return {
      level: 'medium',
      axisValue: IDENTITY_TRUST_AXIS_VALUES.medium,
      reasons,
      keys: normalized,
    }
  }

  if (cid != null) {
    reasons.push(`PubChem CID ${cid}`)
    if (hasSmiles) reasons.push('SMILES present without InChIKey')
    return {
      level: 'medium',
      axisValue: IDENTITY_TRUST_AXIS_VALUES.medium,
      reasons,
      keys: normalized,
    }
  }

  if (hasSmiles && hasName) {
    reasons.push('Name + SMILES only (no structure key / registry id)')
    return {
      level: 'low',
      axisValue: IDENTITY_TRUST_AXIS_VALUES.low,
      reasons,
      keys: normalized,
    }
  }

  if (alternateCids.length > 0 && hasName) {
    reasons.push('Name with alternate CIDs only')
    return {
      level: 'low',
      axisValue: IDENTITY_TRUST_AXIS_VALUES.low,
      reasons,
      keys: normalized,
    }
  }

  if (hasName) {
    reasons.push('Name only — identity unresolved')
    return {
      level: 'unresolved',
      axisValue: IDENTITY_TRUST_AXIS_VALUES.unresolved,
      reasons,
      keys: normalized,
    }
  }

  reasons.push('No usable identity keys')
  return {
    level: 'unresolved',
    axisValue: IDENTITY_TRUST_AXIS_VALUES.unresolved,
    reasons,
    keys: normalized,
  }
}

/** Merge alternate CIDs, excluding primary. */
export function mergeAlternateCids(
  primary: number | null | undefined,
  ...lists: Array<number[] | undefined>
): number[] {
  const set = new Set<number>()
  for (const list of lists) {
    if (!list) continue
    for (const c of list) {
      if (Number.isInteger(c) && c > 0 && c !== primary) set.add(c)
    }
  }
  return Array.from(set).sort((a, b) => a - b)
}
