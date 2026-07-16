/**
 * ChEMBL target → compound gather (PR3b core).
 * gene symbol → searchTargetsByName → getRelatedCompoundsByTarget (5×15).
 * BindingDB by-target is intentionally NOT included (enrichment-only).
 */

import {
  searchTargetsByName,
  getRelatedCompoundsByTarget,
} from '../../api/chembl'
import type { SourceFetchStatus } from '../../dataStatus'
import { hasDataArray, withSourceStatus } from '../sourceStatus'
import { geneSymbolsForDgidb } from './genes'
import type { DiseaseGene } from '../types'

/** Design §5.1.1: 5 targets × 15 compounds. */
export const MAX_CHEMBL_TARGETS = 5
export const MAX_COMPOUNDS_PER_TARGET = 15

export interface ChemblByTargetMolecule {
  name: string
  chemblId: string
  maxPhase: number
  geneSymbol: string
  targetChemblId: string
  targetName: string
  activityValue?: number
  activityType?: string
}

export interface GatherChemblByTargetResult {
  molecules: ChemblByTargetMolecule[]
  /** Unique display names for candidate union. */
  names: string[]
  status: SourceFetchStatus
  geneSymbolsUsed: string[]
}

function preferHumanSingleProtein(
  targets: Array<{
    targetChemblId: string
    targetName: string
    targetType: string
    organism: string
  }>,
): { targetChemblId: string; targetName: string } | null {
  if (targets.length === 0) return null

  const score = (t: (typeof targets)[0]) => {
    let s = 0
    const org = (t.organism || '').toLowerCase()
    const typ = (t.targetType || '').toUpperCase()
    if (org.includes('homo sapiens') || org === 'human') s += 10
    if (typ.includes('SINGLE PROTEIN')) s += 5
    if (typ.includes('PROTEIN')) s += 2
    return s
  }

  const sorted = [...targets].sort((a, b) => score(b) - score(a))
  const best = sorted[0]
  return { targetChemblId: best.targetChemblId, targetName: best.targetName }
}

/**
 * Top disease genes → ChEMBL target IDs → bioactive compounds (IC50).
 * Caps at MAX_CHEMBL_TARGETS genes and MAX_COMPOUNDS_PER_TARGET compounds each.
 */
export async function gatherChemblByTarget(
  genes: DiseaseGene[],
  opts?: { maxTargets?: number; maxCompoundsPerTarget?: number },
): Promise<GatherChemblByTargetResult> {
  const maxTargets = opts?.maxTargets ?? MAX_CHEMBL_TARGETS
  const maxCompounds = opts?.maxCompoundsPerTarget ?? MAX_COMPOUNDS_PER_TARGET
  const geneSymbols = geneSymbolsForDgidb(genes, maxTargets)

  if (geneSymbols.length === 0) {
    return {
      molecules: [],
      names: [],
      geneSymbolsUsed: [],
      status: {
        source: 'ChEMBL (by-target)',
        status: 'empty',
        has_data: false,
        error: 'No gene symbols available for ChEMBL target lookup',
      },
    }
  }

  const result = await withSourceStatus(
    'ChEMBL (by-target)',
    async () => {
      const byName = new Map<string, ChemblByTargetMolecule>()

      // Sequential per gene to stay gentle on free ChEMBL REST
      for (const symbol of geneSymbols) {
        try {
          const targets = await searchTargetsByName(symbol, 5)
          const chosen = preferHumanSingleProtein(targets)
          if (!chosen) continue

          const compounds = await getRelatedCompoundsByTarget(
            chosen.targetChemblId,
            maxCompounds,
          )

          for (const c of compounds) {
            const display =
              (c.compoundName || c.name || c.chemblId || '').trim()
            if (!display) continue
            // Prefer real preferred names over bare CHEMBL ids when merging
            const key = display.toLowerCase()
            const entry: ChemblByTargetMolecule = {
              name: display,
              chemblId: c.chemblId || c.compoundId,
              maxPhase: c.maxPhase ?? 0,
              geneSymbol: symbol,
              targetChemblId: chosen.targetChemblId,
              targetName: chosen.targetName,
              activityValue: c.activityValue,
              activityType: c.activityType,
            }
            const existing = byName.get(key)
            if (!existing || existing.maxPhase < entry.maxPhase) {
              byName.set(key, entry)
            }
          }
        } catch {
          // Continue other genes on single-target failure
        }
      }

      return Array.from(byName.values())
    },
    { fallback: [] as ChemblByTargetMolecule[], hasData: hasDataArray },
  )

  const names = result.value.map((m) => m.name).filter(Boolean)

  return {
    molecules: result.value,
    names,
    geneSymbolsUsed: geneSymbols,
    status: result.status,
  }
}
