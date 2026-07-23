import {
  buildCompareHubMatrix,
  buildLedgerForCompare,
  compareBagsFromMoleculeData,
  compareHubMatrixToDelimited,
} from '@/lib/dataHub'

describe('compare data hub matrix', () => {
  it('aligns facts across two molecules', () => {
    const a = buildLedgerForCompare(
      { cid: 2244, name: 'Aspirin', formula: 'C9H8O4', molecularWeight: 180 },
      compareBagsFromMoleculeData({
        trials: [
          {
            nctId: 'NCT1',
            title: 'Aspirin pain',
            phase: 'PHASE3',
            status: 'COMPLETED',
            conditions: ['Pain'],
            sponsor: 'A',
          },
        ],
        literature: [{ title: 'Paper A', year: 2020, doi: '10.1/a' }],
        chemblActivities: [
          { chemblId: 'CHEMBL25', targetName: 'PTGS1', pchemblValue: 6 },
        ],
      }),
    )
    const b = buildLedgerForCompare(
      { cid: 4091, name: 'Metformin', formula: 'C4H11N5', molecularWeight: 129 },
      compareBagsFromMoleculeData({
        trials: [
          {
            nctId: 'NCT2',
            title: 'Metformin T2D',
            phase: 'PHASE4',
            status: 'COMPLETED',
            conditions: ['Diabetes'],
            sponsor: 'B',
          },
        ],
        nihGrants: [
          {
            title: 'Metformin grant',
            piName: 'PI',
            institute: 'NIDDK',
            projectNumber: 'R01Y',
          },
        ],
      }),
    )

    const matrix = buildCompareHubMatrix([
      { subjectId: '2244', subjectLabel: 'Aspirin', ledger: a },
      { subjectId: '4091', subjectLabel: 'Metformin', ledger: b },
    ])

    expect(matrix.columns).toHaveLength(2)
    expect(matrix.filledFactCount).toBeGreaterThan(0)

    const nameRow = matrix.rows.find((r) => r.factId === 'id-name')
    expect(nameRow?.cells[0]?.value).toBe('Aspirin')
    expect(nameRow?.cells[1]?.value).toBe('Metformin')

    const trialRow = matrix.rows.find((r) => r.factId === 'cl-sample-nct')
    expect(trialRow?.cells[0]?.value).toBe('NCT1')
    expect(trialRow?.cells[1]?.value).toBe('NCT2')

    const csv = compareHubMatrixToDelimited(matrix, 'csv')
    expect(csv).toContain('Aspirin')
    expect(csv).toContain('Metformin')
    expect(csv).toContain('fact')
  })

  it('handles empty column set', () => {
    const m = buildCompareHubMatrix([])
    expect(m.rows).toHaveLength(0)
    expect(m.filledFactCount).toBe(0)
  })
})
