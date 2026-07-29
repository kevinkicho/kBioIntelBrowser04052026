/**
 * Hub section: Clinical trials
 * Pure; no network.
 */
import {
  asArr,
  fmtMw,
  phaseLabel,
  row,
  section,
  str,
  type MoleculeIdentityInput,
} from '../../moleculeHubShared'
import type { DataHubRow, DataHubSection } from '../../types'

export function buildClinicalPart(
  identity: MoleculeIdentityInput,
  data: Record<string, unknown>,
): { rows: DataHubRow[]; sections: DataHubSection[] } {
  const all: DataHubRow[] = []
  const sections: DataHubSection[] = []

  // --- Clinical trials ---
  const trials = asArr(data, 'clinicalTrials')
  const isrctn = asArr(data, 'isrctnTrials')
  const indications = asArr(data, 'chemblIndications')
  const phases = new Map<string, number>()
  for (const t of trials) {
    const p = phaseLabel(str(t.phase)) || 'Unknown'
    phases.set(p, (phases.get(p) || 0) + 1)
  }
  const phaseSummary =
    phases.size > 0
      ? Array.from(phases.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([p, c]) => `${p}: ${c}`)
          .join(' · ')
      : null
  const topCondition =
    trials.flatMap((t) => (Array.isArray(t.conditions) ? t.conditions : []))
      .map((c) => str(c))
      .filter(Boolean)[0] || null
  const firstTrial = trials[0]
  const topIndication = indications[0]

  const clinicalRows: DataHubRow[] = [
    row({
      id: 'cl-trial-count',
      fact: 'ClinicalTrials.gov studies',
      value: trials.length ? String(trials.length) : null,
      source: 'ClinicalTrials.gov',
      panelId: 'clinical-trials',
      categoryId: 'clinical-safety',
      domain: 'clinical',
    }),
    row({
      id: 'cl-phases',
      fact: 'Trial phase mix',
      value: phaseSummary,
      source: 'ClinicalTrials.gov',
      panelId: 'clinical-trials',
      categoryId: 'clinical-safety',
      domain: 'clinical',
      detail: 'Counts from loaded page sample — not exhaustive universe',
    }),
    row({
      id: 'cl-top-condition',
      fact: 'Sample condition',
      value: topCondition,
      source: 'ClinicalTrials.gov',
      panelId: 'clinical-trials',
      categoryId: 'clinical-safety',
      domain: 'clinical',
    }),
    row({
      id: 'cl-sample-nct',
      fact: 'Sample NCT',
      value: str(firstTrial?.nctId),
      source: 'ClinicalTrials.gov',
      sourceUrl: str(firstTrial?.nctId)
        ? `https://clinicaltrials.gov/study/${str(firstTrial?.nctId)}`
        : undefined,
      panelId: 'clinical-trials',
      categoryId: 'clinical-safety',
      domain: 'clinical',
      detail: str(firstTrial?.status) || undefined,
    }),
    row({
      id: 'cl-sponsor',
      fact: 'Sample sponsor',
      value: str(firstTrial?.sponsor),
      source: 'ClinicalTrials.gov',
      panelId: 'clinical-trials',
      categoryId: 'clinical-safety',
      domain: 'clinical',
    }),
    row({
      id: 'cl-isrctn',
      fact: 'ISRCTN records',
      value: isrctn.length ? String(isrctn.length) : null,
      source: 'ISRCTN',
      panelId: 'isrctn',
      categoryId: 'clinical-safety',
      domain: 'clinical',
    }),
    row({
      id: 'cl-chembl-ind',
      fact: 'ChEMBL indication (sample)',
      value:
        str(topIndication?.meshHeading) ||
        str(topIndication?.efoTerm) ||
        str(topIndication?.condition) ||
        (indications.length ? `${indications.length} indication(s)` : null),
      source: 'ChEMBL',
      sourceUrl: str(topIndication?.url) || undefined,
      panelId: 'chembl-indications',
      categoryId: 'clinical-safety',
      domain: 'clinical',
      detail: topIndication?.maxPhaseForIndication != null
        ? `max phase ${topIndication.maxPhaseForIndication}`
        : topIndication?.maxPhase != null
          ? `max phase ${topIndication.maxPhase}`
          : undefined,
    }),
  ]
  // Deeper trial entity rows (title + enrollment)
  const trialTitleRow = row({
    id: 'cl-trial-title',
    fact: 'Trial title (sample)',
    value: str(firstTrial?.title)?.slice(0, 140),
    source: 'ClinicalTrials.gov',
    sourceUrl: str(firstTrial?.nctId)
      ? `https://clinicaltrials.gov/study/${str(firstTrial?.nctId)}`
      : undefined,
    panelId: 'clinical-trials',
    categoryId: 'clinical-safety',
    domain: 'clinical',
    detail: str(firstTrial?.phase) || undefined,
  })
  const trialEnrollRow = row({
    id: 'cl-enrollment',
    fact: 'Trial enrollment (sample)',
    value:
      firstTrial?.enrollment != null && Number(firstTrial.enrollment) > 0
        ? String(firstTrial.enrollment)
        : null,
    source: 'ClinicalTrials.gov',
    panelId: 'clinical-trials',
    categoryId: 'clinical-safety',
    domain: 'clinical',
  })
  clinicalRows.push(trialTitleRow, trialEnrollRow)

  all.push(...clinicalRows)
  sections.push(section('clinical', 'Clinical development', 'clinical', clinicalRows))


  return { rows: all, sections }
}
