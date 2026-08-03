import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getUniprotEntriesByName } from '@/lib/api/uniprot'
import { getAlphaFoldPredictions } from '@/lib/api/alphafold'
import { resolveDrugTargets } from '@/lib/api/drugTargetResolve'
import { freeApiAgent } from '@/lib/api/freeApiAgent'
import { runWithApiAbort } from '@/lib/api/apiAbort'

async function accessionsForGene(gene: string): Promise<string[]> {
  const queries = [
    `gene_exact:${gene} AND organism_id:9606`,
    `gene:${gene} AND organism_id:9606`,
    gene,
  ]
  for (const q of queries) {
    try {
      const entries = await getUniprotEntriesByName(q)
      const accs = entries.map((e) => e.accession).filter(Boolean)
      if (accs.length) return accs
    } catch {
      /* next */
    }
  }
  return []
}

/** AlphaFold predictions — free-API agent hard wall (multi-step chain). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const cid = parseInt(params.id, 10)
  if (isNaN(cid) || cid < 1) {
    return NextResponse.json({ error: 'Invalid molecule ID' }, { status: 400 })
  }

  const ac = new AbortController()
  const result = await runWithApiAbort(
    ac,
    () =>
      freeApiAgent({
        source: 'alphafold',
        empty: [] as Awaited<ReturnType<typeof getAlphaFoldPredictions>>,
        timeoutMs: 14_000,
        run: async () => {
          const molecule = await getMoleculeById(cid)
          if (!molecule) return []

          const resolved = await resolveDrugTargets(molecule.name, 5)
          let accessions = [...resolved.uniprotAccessions]

          if (accessions.length === 0) {
            for (const gene of resolved.geneSymbols.slice(0, 4)) {
              const accs = await accessionsForGene(gene)
              accessions.push(...accs)
              if (accessions.length >= 5) break
            }
          }

          if (accessions.length === 0) {
            const uniprotEntries = await getUniprotEntriesByName(molecule.name)
            accessions = uniprotEntries.map((e) => e.accession).filter(Boolean)
          }

          accessions = Array.from(new Set(accessions.map((a) => a.toUpperCase()))).slice(0, 5)
          let alphaFoldPredictions = await getAlphaFoldPredictions(accessions)

          if (alphaFoldPredictions.length === 0 && resolved.geneSymbols.length > 0) {
            const retry: string[] = []
            for (const gene of resolved.geneSymbols.slice(0, 3)) {
              retry.push(...(await accessionsForGene(gene)))
            }
            const uniq = Array.from(new Set(retry.map((a) => a.toUpperCase()))).slice(0, 5)
            if (uniq.length) {
              alphaFoldPredictions = await getAlphaFoldPredictions(uniq)
            }
          }

          return alphaFoldPredictions
        },
      }),
    [request.signal],
  )

  return NextResponse.json({
    alphaFoldPredictions: result.data,
    _agentStatus: result.status,
    _agentMs: result.ms,
    ...(result.status === 'timeout' || result.status === 'error'
      ? { _partial: true, _timeout: result.status === 'timeout', _error: result.error }
      : {}),
  })
}
