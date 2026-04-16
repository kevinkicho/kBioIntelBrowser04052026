import { safe } from '@/lib/utils'
import { trackedSafe } from '@/lib/api-tracker'
import type { ApiParamValue } from '@/lib/apiIdentifiers'

import { getUniprotEntriesByName } from '@/lib/api/uniprot'
import { getAlphaFoldPredictions } from '@/lib/api/alphafold'
import { getProteinDomains } from '@/lib/api/interpro'
import { getProteinFeaturesByAccessions } from '@/lib/api/ebi-proteins'
import { getProteinAtlasBySymbols } from '@/lib/api/protein-atlas'
import { getGoAnnotationsByAccessions } from '@/lib/api/quickgo'
import { getPdbStructuresByName } from '@/lib/api/pdb'
import { getPdbeLigandsByName } from '@/lib/api/pdbe-ligands'
import { getPeptideAtlasData } from '@/lib/api/peptideatlas'
import { searchPRIDE } from '@/lib/api/pride'
import { searchCATHDomains, searchGene3D } from '@/lib/api/cath'
import { searchSAbDab } from '@/lib/api/sabdab'
import { getUniProtProtein } from '@/lib/api/uniprot'
import { getProteinVariations, getProteomicsMappings, getProteinCrossReferences } from '@/lib/api/ebi-proteins-variation'
import { getProteinAtlasData } from '@/lib/api/human-protein-atlas'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fetchProteinStructure(name: string, queryFor: (s: string) => string, apiParams: Record<string, ApiParamValue>) {
  const [uniprotEntries, pdbStructures, pdbeLigands, prideProjects, cathDomains, sabdabEntries] = await Promise.all([
    trackedSafe('uniprot', getUniprotEntriesByName(queryFor('uniprot')), []),
    safe(getPdbStructuresByName(queryFor('pdb')), []),
    safe(getPdbeLigandsByName(name), []),
    safe(searchPRIDE(name), []),
    safe(searchCATHDomains(name), []),
    safe(searchSAbDab(name), []),
  ])
  const accessions = (uniprotEntries as Array<{accession: string}>).map(e => e.accession).filter(Boolean)
  const geneSymbols = (uniprotEntries as Array<{geneName: string}>).map(e => e.geneName).filter(Boolean)
  const [alphaFoldPredictions, proteinDomains, proteinFeatures, proteinAtlasEntries, goAnnotations, peptideAtlasData, gene3dEntries, uniprotProteins, ebiVariations, ebiProteomics, ebiCrossRefs, humanProteinAtlas] = await Promise.all([
    safe(getAlphaFoldPredictions(accessions), []),
    safe(getProteinDomains(accessions), []),
    safe(getProteinFeaturesByAccessions(accessions), []),
    safe(getProteinAtlasBySymbols(geneSymbols), []),
    safe(getGoAnnotationsByAccessions(accessions), []),
    safe(getPeptideAtlasData(name), { peptides: [] }),
    safe(Promise.all(geneSymbols.slice(0, 5).map(s => searchGene3D(s).catch(() => []))).then(r => r.flat()), []),
    safe(Promise.all(geneSymbols.slice(0, 5).map(g => getUniProtProtein(g).catch(() => null))).then(results => results.filter((p): p is NonNullable<typeof p> => p !== null)), []),
    safe(Promise.all(accessions.slice(0, 3).map(a => getProteinVariations(a).catch(() => null))).then(r => r.find(x => x) || null), null),
    safe(Promise.all(accessions.slice(0, 3).map(a => getProteomicsMappings(a).catch(() => null))).then(r => r.find(x => x) || null), null),
    safe(Promise.all(accessions.slice(0, 3).map(a => getProteinCrossReferences(a).catch(() => null))).then(r => r.find(x => x) || null), null),
    safe(geneSymbols.length > 0 ? getProteinAtlasData(geneSymbols[0]) : Promise.resolve(null), null),
  ])
  return {
    uniprotEntries,
    pdbStructures,
    pdbeLigands,
    alphaFoldPredictions,
    proteinDomains,
    proteinFeatures,
    proteinAtlasEntries,
    goAnnotations,
    peptideAtlasEntries: peptideAtlasData.peptides,
    prideProjects,
    cathData: { domains: cathDomains, gene3dEntries },
    sabdabEntries,
    uniprotProteins,
    ebiProteinVariations: ebiVariations,
    ebiProteomicsData: ebiProteomics,
    ebiCrossReferences: ebiCrossRefs,
    humanProteinAtlas,
  }
}