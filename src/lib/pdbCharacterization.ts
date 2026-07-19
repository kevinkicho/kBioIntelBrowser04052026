/**
 * Protein biophysical / structural characterization chips for PDB rows.
 *
 * PDB (RCSB/PDBe) primarily carries 3D coordinates + crystallography/EM/NMR
 * metadata — not lab biophysics (CD, DSC, SPR, ITC). Where a free public
 * repository exists, chips deep-link there; otherwise dim placeholders point
 * at exploratory free search (PCDDB, PRIDE, PubMed) — no paid DBs.
 *
 * @see free public: RCSB/PDBe, PCDDB (CD), PRIDE (MS), PubMed literature
 */

import { rcsbDownloadCifUrl, normalizePdbId } from '@/lib/pdbLinks'

export type CharacterizationChipId =
  | 'cif'
  | 'ss'
  | 'cd'
  | 'ms'
  | 'spr'
  | 'itc'
  | 'dsc'
  | 'uv'

export type CharacterizationAvailability = 'available' | 'explore' | 'empty'

export interface CharacterizationChipDef {
  id: CharacterizationChipId
  /** Short label on the chip */
  abbrev: string
  /** Tooltip title */
  fullName: string
  /** One-line scientific purpose */
  purpose: string
  /** Free public source note for shopping / honesty */
  sourceNote: string
}

/** Catalog of techniques the UI always surfaces (filled or placeholder). */
export const CHARACTERIZATION_CHIP_CATALOG: CharacterizationChipDef[] = [
  {
    id: 'cif',
    abbrev: 'CIF',
    fullName: 'mmCIF coordinates',
    purpose: 'Atomic coordinates (macromolecular Crystallographic Information File)',
    sourceNote: 'RCSB free download',
  },
  {
    id: 'ss',
    abbrev: 'SS',
    fullName: 'Secondary structure (α-helices / β-sheets)',
    purpose:
      'Higher-order secondary structure assignment from coordinates (DSSP-like / PDBe)',
    sourceNote: 'PDBe free secondary-structure view',
  },
  {
    id: 'cd',
    abbrev: 'CD',
    fullName: 'Circular dichroism spectroscopy',
    purpose:
      'Solution secondary-structure content (α-helices, β-sheets) from circular dichroism spectra',
    sourceNote: 'PCDDB (Protein Circular Dichroism Data Bank) — free public',
  },
  {
    id: 'ms',
    abbrev: 'MS',
    fullName: 'Mass spectrometry',
    purpose: 'Exact mass / sequence confirmation via proteomics mass spectrometry',
    sourceNote: 'PRIDE Archive (EBI) — free public',
  },
  {
    id: 'spr',
    abbrev: 'SPR',
    fullName: 'Surface plasmon resonance',
    purpose: 'Binding affinity and kinetic rates (ka/kd) for interactions',
    sourceNote: 'No free SPR time-series DB; PubMed literature search',
  },
  {
    id: 'itc',
    abbrev: 'ITC',
    fullName: 'Isothermal titration calorimetry',
    purpose: 'Binding thermodynamics (ΔH, Kd, stoichiometry) in solution',
    sourceNote: 'No free ITC spectral DB; PubMed literature search',
  },
  {
    id: 'dsc',
    abbrev: 'DSC',
    fullName: 'Differential scanning calorimetry',
    purpose: 'Thermal stability and unfolding transitions (Tm)',
    sourceNote: 'No free DSC spectral DB; PubMed literature search',
  },
  {
    id: 'uv',
    abbrev: 'UV',
    fullName: 'UV–Vis spectrophotometry',
    purpose: 'Concentration, aromatic content, basic optical characterization',
    sourceNote: 'No free UV spectral DB; PubMed literature search',
  },
]

export interface CharacterizationChip extends CharacterizationChipDef {
  /**
   * available — direct free file/page for this entry
   * explore — free public search that may find related data
   * empty — no free structured source; exploratory literature only
   */
  availability: CharacterizationAvailability
  href: string
}

/** Optional live probe upgrades for CD / MS chips. */
export interface CharacterizationProbeOverrides {
  cd?: { hit: boolean; href?: string; accession?: string }
  ms?: { hit: boolean; href?: string; accession?: string }
}

function pubmedExploreUrl(terms: string[]): string {
  const q = terms.filter(Boolean).join(' ')
  return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(q)}`
}

/** PCDDB home / search — free CD spectra archive (Birkbeck). */
export function pcddbSearchUrl(query: string): string {
  const q = query.trim()
  // PCDDB browse/search is web UI; no stable free JSON API required for deep link
  return q
    ? `https://pcddb.cryst.bbk.ac.uk/search?search=${encodeURIComponent(q)}`
    : 'https://pcddb.cryst.bbk.ac.uk/'
}

/** PRIDE proteomics archive search (free). */
export function prideSearchUrl(query: string): string {
  const q = query.trim()
  return q
    ? `https://www.ebi.ac.uk/pride/archive?keyword=${encodeURIComponent(q)}`
    : 'https://www.ebi.ac.uk/pride/archive'
}

/** PDBe secondary structure for a PDB entry (free). */
export function pdbeSecondaryStructureUrl(pdbId: string | null | undefined): string | null {
  const id = normalizePdbId(pdbId)
  return id
    ? `https://www.ebi.ac.uk/pdbe/entry/pdb/${id.toLowerCase()}/secondary`
    : null
}

/**
 * Build the full chip row for one PDB structure.
 * CIF + SS are entry-linked when pdbId known; others explore free public DBs / PubMed.
 * Pass `probe` from `/api/characterization/probe` to upgrade CD/MS to available when hit.
 */
export function buildCharacterizationChips(input: {
  pdbId?: string | null
  title?: string | null
  /** Molecule / protein name for literature search */
  proteinHint?: string | null
  probe?: CharacterizationProbeOverrides | null
}): CharacterizationChip[] {
  const pdbId = normalizePdbId(input.pdbId)
  const title = (input.title || '').trim()
  const hint = (input.proteinHint || title || pdbId || '').trim()
  const cif = rcsbDownloadCifUrl(pdbId)
  const ss = pdbeSecondaryStructureUrl(pdbId)
  const probe = input.probe

  const resolve = (def: CharacterizationChipDef): CharacterizationChip => {
    switch (def.id) {
      case 'cif':
        return {
          ...def,
          availability: cif ? 'available' : 'empty',
          href: cif || 'https://www.rcsb.org/docs/programmatic-access/file-download-services',
        }
      case 'ss':
        return {
          ...def,
          availability: ss ? 'available' : 'empty',
          href: ss || 'https://www.ebi.ac.uk/pdbe/',
        }
      case 'cd': {
        const baseHref = pcddbSearchUrl(pdbId || hint || 'protein')
        if (probe?.cd?.hit) {
          return {
            ...def,
            availability: 'available',
            href: probe.cd.href || baseHref,
            sourceNote: 'PCDDB hit (free public CD spectra)',
          }
        }
        return {
          ...def,
          availability: 'explore',
          href: probe?.cd?.href || baseHref,
        }
      }
      case 'ms': {
        const baseHref = prideSearchUrl(hint || pdbId || 'protein')
        if (probe?.ms?.hit) {
          return {
            ...def,
            availability: 'available',
            href: probe.ms.href || baseHref,
            sourceNote: probe.ms.accession
              ? `PRIDE ${probe.ms.accession} (free public MS)`
              : 'PRIDE hit (free public MS)',
          }
        }
        return {
          ...def,
          availability: 'explore',
          href: probe?.ms?.href || baseHref,
        }
      }
      case 'spr':
        return {
          ...def,
          availability: 'empty',
          href: pubmedExploreUrl([
            hint || pdbId || 'protein',
            'surface plasmon resonance',
            'kinetics',
          ]),
        }
      case 'itc':
        return {
          ...def,
          availability: 'empty',
          href: pubmedExploreUrl([
            hint || pdbId || 'protein',
            'isothermal titration calorimetry',
          ]),
        }
      case 'dsc':
        return {
          ...def,
          availability: 'empty',
          href: pubmedExploreUrl([
            hint || pdbId || 'protein',
            'differential scanning calorimetry',
            'thermal stability',
          ]),
        }
      case 'uv':
        return {
          ...def,
          availability: 'empty',
          href: pubmedExploreUrl([
            hint || pdbId || 'protein',
            'UV-Vis spectrophotometry',
            'absorbance',
          ]),
        }
      default:
        return {
          ...def,
          availability: 'empty',
          href: pubmedExploreUrl([hint || 'protein']),
        }
    }
  }

  return CHARACTERIZATION_CHIP_CATALOG.map(resolve)
}

/** Tooltip text for a chip (title attribute). */
export function characterizationChipTitle(chip: CharacterizationChip): string {
  const status =
    chip.availability === 'available'
      ? 'Available (free public)'
      : chip.availability === 'explore'
        ? 'Explore free public repository'
        : 'Not in PDB — literature search only'
  return `${chip.fullName}\n${chip.purpose}\n${status}. ${chip.sourceNote}`
}
