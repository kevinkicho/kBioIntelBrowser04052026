/**
 * Hub section: Structures (research)
 * Pure; no network.
 */
import {
  asArr,
  row,
  section,
  str,
  type MoleculeIdentityInput,
} from '../../moleculeHubShared'
import type { DataHubRow, DataHubSection } from '../../types'


export function buildStructuresPart(
  identity: MoleculeIdentityInput,
  data: Record<string, unknown>,
): { rows: DataHubRow[]; sections: DataHubSection[] } {
  const all: DataHubRow[] = []
  const sections: DataHubSection[] = []

  // --- Structures (research) ---
  const pdbs = asArr(data, 'pdbStructures')
  const alphafold = asArr(data, 'alphafoldPredictions')
  const uniprot = asArr(data, 'uniprotEntries')
  const firstPdb = pdbs[0]
  const firstAf = alphafold[0]
  const firstUp = uniprot[0]
  const pdbId = str(firstPdb?.pdbId) || str(firstPdb?.id)
  const structRows: DataHubRow[] = [
    row({
      id: 'st-pdb-n',
      fact: 'PDB structures',
      value: pdbs.length ? String(pdbs.length) : null,
      source: 'RCSB PDB',
      panelId: 'pdb',
      categoryId: 'protein-structure',
      domain: 'other',
    }),
    row({
      id: 'st-pdb-id',
      fact: 'PDB ID (sample)',
      value: pdbId,
      source: 'RCSB PDB',
      sourceUrl: pdbId
        ? `https://www.rcsb.org/structure/${encodeURIComponent(pdbId)}`
        : undefined,
      panelId: 'pdb',
      categoryId: 'protein-structure',
      domain: 'other',
      detail: [str(firstPdb?.method), str(firstPdb?.resolution)].filter(Boolean).join(' · ') || undefined,
    }),
    row({
      id: 'st-pdb-title',
      fact: 'Structure title (sample)',
      value: str(firstPdb?.title)?.slice(0, 120),
      source: 'RCSB PDB',
      panelId: 'pdb',
      categoryId: 'protein-structure',
      domain: 'other',
    }),
    row({
      id: 'st-alphafold',
      fact: 'AlphaFold predictions',
      value: alphafold.length ? String(alphafold.length) : null,
      source: 'AlphaFold DB',
      panelId: 'alphafold',
      categoryId: 'protein-structure',
      domain: 'other',
    }),
    row({
      id: 'st-af-id',
      fact: 'AlphaFold accession (sample)',
      value: str(firstAf?.uniprotAccession) || str(firstAf?.entryId) || str(firstAf?.id),
      source: 'AlphaFold DB',
      sourceUrl: str(firstAf?.url) || undefined,
      panelId: 'alphafold',
      categoryId: 'protein-structure',
      domain: 'other',
    }),
    row({
      id: 'st-uniprot',
      fact: 'UniProt entries',
      value: uniprot.length ? String(uniprot.length) : null,
      source: 'UniProt',
      panelId: 'uniprot',
      categoryId: 'protein-structure',
      domain: 'other',
    }),
    row({
      id: 'st-uniprot-acc',
      fact: 'UniProt accession (sample)',
      value: str(firstUp?.accession) || str(firstUp?.id),
      source: 'UniProt',
      sourceUrl:
        str(firstUp?.accession) || str(firstUp?.id)
          ? `https://www.uniprot.org/uniprotkb/${encodeURIComponent(String(firstUp?.accession || firstUp?.id))}`
          : undefined,
      panelId: 'uniprot',
      categoryId: 'protein-structure',
      domain: 'other',
      detail: str(firstUp?.proteinName) || str(firstUp?.geneName) || undefined,
    }),
  ]
  all.push(...structRows)
  sections.push(section('structures', 'Structures & proteins', 'other', structRows))

  return { rows: all, sections }
}
