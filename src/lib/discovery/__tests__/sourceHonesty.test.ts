import {
  buildSourceHonestyMatrix,
  canonicalizeOrigin,
  discoverCandidateAnchorId,
} from '@/lib/discovery/sourceHonesty'
import type { CandidateMolecule } from '@/lib/candidateRanker'

function cand(
  name: string,
  sources: string[],
  cid: number | null = 1,
): CandidateMolecule {
  return {
    name,
    cid,
    clinicalPhase: 0.5,
    geneAssociationScore: 0.5,
    sharedTargetRatio: 0.2,
    trialCountNorm: 0.1,
    clinicalPhaseRaw: 2,
    sharedTargetCountRaw: 1,
    trialCountRaw: 2,
    geneScoreRaw: 0.5,
    sources,
    confidence: 'moderate',
    compositeScore: 0.5,
  }
}

describe('sourceHonesty', () => {
  it('canonicalizes mixed engine and pill labels', () => {
    expect(canonicalizeOrigin('DGIdb')).toBe('dgidb')
    expect(canonicalizeOrigin('ClinicalTrials.gov')).toBe('clinicaltrials')
    expect(canonicalizeOrigin('ClinicalTrials')).toBe('clinicaltrials')
    expect(canonicalizeOrigin('Open Targets knownDrugs')).toBe('opentargets')
    expect(canonicalizeOrigin('Open Targets (knownDrugs)')).toBe('opentargets')
    expect(canonicalizeOrigin('ChEMBL (by-target)')).toBe('chembl')
    expect(canonicalizeOrigin('ChEMBL (indications)')).toBe('chembl')
  })

  it('colors multiple origin columns as hits (not a single column)', () => {
    const matrix = buildSourceHonestyMatrix({
      candidates: [
        cand('DrugA', ['DGIdb', 'ClinicalTrials', 'ChEMBL']),
        cand('DrugB', ['Open Targets knownDrugs', 'ChEMBL']),
        cand('DrugC', ['ClinicalTrials']),
      ],
      sourceStatuses: [
        { source: 'DGIdb', status: 'loaded', has_data: true },
        { source: 'ClinicalTrials.gov', status: 'loaded', has_data: true },
        { source: 'Open Targets (knownDrugs)', status: 'loaded', has_data: true },
        { source: 'ChEMBL (indications)', status: 'loaded', has_data: true },
      ],
    })

    const ids = matrix.columns.map((c) => c.id)
    expect(ids).toEqual(
      expect.arrayContaining(['dgidb', 'clinicaltrials', 'chembl', 'opentargets']),
    )

    // DrugA hits three families
    const a = matrix.rows[0]
    expect(a.cells.dgidb).toBe('hit')
    expect(a.cells.clinicaltrials).toBe('hit')
    expect(a.cells.chembl).toBe('hit')
    expect(a.cells.opentargets).toBe('miss')

    // DrugB hits OT + ChEMBL
    const b = matrix.rows[1]
    expect(b.cells.opentargets).toBe('hit')
    expect(b.cells.chembl).toBe('hit')
    expect(b.cells.dgidb).toBe('miss')

    expect(matrix.originsWithHits).toBeGreaterThanOrEqual(3)
    expect(matrix.totalHits).toBeGreaterThanOrEqual(6)
  })

  it('does not paint entire column empty when only upstream is empty', () => {
    const matrix = buildSourceHonestyMatrix({
      candidates: [cand('OnlyTrials', ['ClinicalTrials'])],
      sourceStatuses: [
        { source: 'DGIdb', status: 'empty', has_data: false },
        { source: 'ClinicalTrials.gov', status: 'loaded', has_data: true },
      ],
    })
    const row = matrix.rows[0]
    expect(row.cells.clinicaltrials).toBe('hit')
    // DGIdb empty upstream → source_empty, not a false "hit"
    expect(row.cells.dgidb).toBe('source_empty')
  })

  it('builds scroll anchors', () => {
    expect(discoverCandidateAnchorId(3, 'Tafamidis meglumine')).toMatch(
      /^discover-candidate-3-tafamidis/,
    )
  })
})
