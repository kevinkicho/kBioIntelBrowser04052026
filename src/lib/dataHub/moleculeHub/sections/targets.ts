/**
 * Hub section: Targets / mechanisms
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


export function buildTargetsPart(
  identity: MoleculeIdentityInput,
  data: Record<string, unknown>,
): { rows: DataHubRow[]; sections: DataHubSection[] } {
  const all: DataHubRow[] = []
  const sections: DataHubSection[] = []

  // --- Targets / mechanisms ---
  const acts = asArr(data, 'chemblActivities')
  const mechs = asArr(data, 'chemblMechanisms')
  const dgidb = asArr(data, 'drugGeneInteractions')
  const iuphar = asArr(data, 'pharmacologyTargets')
  const ot = asArr(data, 'diseaseAssociations')

  const bestAct = [...acts]
    .filter((a) => typeof a.pchemblValue === 'number' && a.pchemblValue > 0)
    .sort((a, b) => Number(b.pchemblValue) - Number(a.pchemblValue))[0] || acts[0]
  const firstMech = mechs[0]
  const firstGene = dgidb[0]

  const targetRows: DataHubRow[] = [
    row({
      id: 'tg-chembl-n',
      fact: 'ChEMBL bioactivities',
      value: acts.length ? String(acts.length) : null,
      source: 'ChEMBL',
      panelId: 'chembl',
      categoryId: 'bioactivity-targets',
      domain: 'targets',
    }),
    row({
      id: 'tg-best-act',
      fact: 'Top ChEMBL activity',
      value: bestAct
        ? [
            str(bestAct.targetName) || 'target',
            bestAct.pchemblValue != null ? `pChEMBL ${bestAct.pchemblValue}` : null,
            str(bestAct.standardType) && bestAct.standardValue != null
              ? `${bestAct.standardType} ${bestAct.standardValue}${bestAct.standardUnits ? ' ' + bestAct.standardUnits : ''}`
              : null,
          ]
            .filter(Boolean)
            .join(' · ')
        : null,
      source: 'ChEMBL',
      sourceUrl: str(bestAct?.url) || undefined,
      panelId: 'chembl',
      categoryId: 'bioactivity-targets',
      domain: 'targets',
      detail: 'Highest pChEMBL in loaded sample',
    }),
    row({
      id: 'tg-mech',
      fact: 'Mechanism (sample)',
      value:
        str(firstMech?.mechanismOfAction) ||
        [str(firstMech?.actionType), str(firstMech?.targetName)].filter(Boolean).join(' · ') ||
        (mechs.length ? `${mechs.length} mechanism(s)` : null),
      source: 'ChEMBL',
      sourceUrl: str(firstMech?.url) || undefined,
      panelId: 'chembl-mechanisms',
      categoryId: 'bioactivity-targets',
      domain: 'targets',
    }),
    row({
      id: 'tg-dgidb-n',
      fact: 'DGIdb drug–gene links',
      value: dgidb.length ? String(dgidb.length) : null,
      source: 'DGIdb',
      panelId: 'dgidb',
      categoryId: 'bioactivity-targets',
      domain: 'targets',
    }),
    row({
      id: 'tg-top-gene',
      fact: 'DGIdb gene (sample)',
      value: str(firstGene?.geneSymbol) || str(firstGene?.geneName),
      source: 'DGIdb',
      panelId: 'dgidb',
      categoryId: 'bioactivity-targets',
      domain: 'targets',
      detail: str(firstGene?.interactionType) || undefined,
    }),
    row({
      id: 'tg-iuphar',
      fact: 'IUPHAR / GtoP targets',
      value: iuphar.length ? String(iuphar.length) : null,
      source: 'Guide to Pharmacology',
      panelId: 'iuphar',
      categoryId: 'bioactivity-targets',
      domain: 'targets',
    }),
    row({
      id: 'tg-ot',
      fact: 'Open Targets associations',
      value: ot.length ? String(ot.length) : null,
      source: 'Open Targets',
      panelId: 'opentargets',
      categoryId: 'bioactivity-targets',
      domain: 'targets',
    }),
  ]
  all.push(...targetRows)
  sections.push(section('targets', 'Targets & mechanisms', 'targets', targetRows))


  return { rows: all, sections }
}
