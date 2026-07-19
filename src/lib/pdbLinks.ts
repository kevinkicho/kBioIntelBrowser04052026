/**
 * Deep links for RCSB PDB / PDBe structure rows.
 * Free public data — no paid crystallography DB.
 */

/** Normalize 4-char PDB id. */
export function normalizePdbId(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  const id = raw.trim().toUpperCase()
  return /^[0-9][A-Z0-9]{3}$/.test(id) ? id : raw.trim().toUpperCase() || null
}

/** RCSB structure entry (primary human UI). */
export function rcsbStructureUrl(pdbId: string | null | undefined): string | null {
  const id = normalizePdbId(pdbId)
  return id ? `https://www.rcsb.org/structure/${id}` : null
}

/**
 * RCSB experimental / crystallographic metadata for the entry.
 * Includes diffraction method, resolution, space group, etc. for X-ray.
 * (We do not host structure-factor files; RCSB/PDBe do.)
 */
export function rcsbExperimentalUrl(pdbId: string | null | undefined): string | null {
  const base = rcsbStructureUrl(pdbId)
  // Experimental Data section on the structure page
  return base ? `${base}#experimental` : null
}

/** PDBe entry (EBI mirror with experiment tab). */
export function pdbeEntryUrl(pdbId: string | null | undefined): string | null {
  const id = normalizePdbId(pdbId)
  return id ? `https://www.ebi.ac.uk/pdbe/entry/pdb/${id.toLowerCase()}` : null
}

/** PDBe experiment details (method-specific crystallography / EM / NMR notes). */
export function pdbeExperimentUrl(pdbId: string | null | undefined): string | null {
  const id = normalizePdbId(pdbId)
  return id
    ? `https://www.ebi.ac.uk/pdbe/entry/pdb/${id.toLowerCase()}/experiment`
    : null
}

/** Free coordinate file download (mmCIF). */
export function rcsbDownloadCifUrl(pdbId: string | null | undefined): string | null {
  const id = normalizePdbId(pdbId)
  return id ? `https://files.rcsb.org/download/${id}.cif` : null
}

export function doiUrl(doi: string | null | undefined): string | null {
  if (!doi?.trim()) return null
  const d = doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
  return d ? `https://doi.org/${d}` : null
}

export function pubmedUrl(pmid: string | number | null | undefined): string | null {
  if (pmid == null || pmid === '') return null
  return `https://pubmed.ncbi.nlm.nih.gov/${String(pmid).replace(/\D/g, '')}/`
}

/**
 * Deep link for experimental-method chips (X-ray, EM, NMR, …).
 * Prefer PDBe experiment page (method-focused); fall back to RCSB experimental section.
 */
export function pdbMethodDeepLink(
  pdbId: string | null | undefined,
  _method?: string | null,
): string {
  // method reserved for future method-specific portals; currently PDBe/RCSB experiment pages
  void _method
  return (
    pdbeExperimentUrl(pdbId) ||
    rcsbExperimentalUrl(pdbId) ||
    rcsbStructureUrl(pdbId) ||
    'https://www.rcsb.org/'
  )
}

/** Human-friendly method label for chips. */
export function pdbMethodShortLabel(method: string | null | undefined): string {
  const m = (method || '').trim()
  if (!m) return 'Unknown'
  const u = m.toUpperCase()
  if (u.includes('X-RAY') || u.includes('XRAY') || u === 'X-RAY') return 'X-ray'
  if (u.includes('ELECTRON MICROSCOPY') || u.includes('EM ') || u === 'EM') return 'Cryo-EM'
  if (u.includes('NMR')) return 'NMR'
  if (u.includes('NEUTRON')) return 'Neutron'
  return m.length > 24 ? `${m.slice(0, 22)}…` : m
}

export function isXrayMethod(method: string | null | undefined): boolean {
  const u = (method || '').toUpperCase()
  return u.includes('X-RAY') || u.includes('XRAY')
}

/**
 * Primary structure deep link (RCSB entry).
 */
export function pdbStructureDeepLink(input: {
  pdbId?: string | null
  url?: string | null
}): string {
  if (input.url?.includes('rcsb.org/structure/')) return input.url
  return rcsbStructureUrl(input.pdbId) || input.url || 'https://www.rcsb.org/'
}
