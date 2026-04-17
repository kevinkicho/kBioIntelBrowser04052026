import { getClinicalTrialsByName, sortTrials, extractDrugInterventions } from '@/lib/api/clinicaltrials'
import type { ClinicalTrial } from '@/lib/types'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getClinicalTrialsByName', () => {
  test('returns parsed trials on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        studies: [
          {
            protocolSection: {
              identificationModule: {
                nctId: 'NCT01272284',
                briefTitle: 'Liraglutide in Type 2 Diabetes',
              },
              statusModule: {
                overallStatus: 'COMPLETED',
                startDateStruct: { date: '2011-01-01' },
              },
              designModule: {
                phases: ['PHASE3'],
              },
              sponsorCollaboratorsModule: {
                leadSponsor: { name: 'Novo Nordisk' },
              },
              conditionsModule: {
                conditions: ['Type 2 Diabetes Mellitus'],
              },
            },
          },
        ],
      }),
    })
    const results = await getClinicalTrialsByName('liraglutide')
    expect(results).toHaveLength(1)
    expect(results[0].nctId).toBe('NCT01272284')
    expect(results[0].title).toBe('Liraglutide in Type 2 Diabetes')
    expect(results[0].phase).toBe('PHASE3')
    expect(results[0].status).toBe('COMPLETED')
    expect(results[0].sponsor).toBe('Novo Nordisk')
    expect(results[0].startDate).toBe('2011-01-01')
    expect(results[0].conditions).toEqual(['Type 2 Diabetes Mellitus'])
  })

  test('returns empty array when API response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const results = await getClinicalTrialsByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('returns empty array when studies key is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })
    const results = await getClinicalTrialsByName('aspirin')
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const results = await getClinicalTrialsByName('aspirin')
    expect(results).toEqual([])
  })
})

describe('sortTrials', () => {
  it('sorts by phase descending', () => {
    const trials: ClinicalTrial[] = [
      { nctId: '1', title: 'A', status: 'RECRUITING', phase: 'Phase 1', startDate: '', completionDate: '', conditions: [], interventions: [], sponsor: '' },
      { nctId: '2', title: 'B', status: 'RECRUITING', phase: 'Phase 3', startDate: '', completionDate: '', conditions: [], interventions: [], sponsor: '' },
      { nctId: '3', title: 'C', status: 'RECRUITING', phase: 'Phase 2', startDate: '', completionDate: '', conditions: [], interventions: [], sponsor: '' },
    ]
    const result = sortTrials(trials)
    expect(result.map(t => t.phase)).toEqual(['Phase 3', 'Phase 2', 'Phase 1'])
  })

  it('sorts by status within same phase', () => {
    const trials: ClinicalTrial[] = [
      { nctId: '1', title: 'A', status: 'COMPLETED', phase: 'Phase 2', startDate: '', completionDate: '', conditions: [], interventions: [], sponsor: '' },
      { nctId: '2', title: 'B', status: 'RECRUITING', phase: 'Phase 2', startDate: '', completionDate: '', conditions: [], interventions: [], sponsor: '' },
    ]
    const result = sortTrials(trials)
    expect(result[0].status).toBe('RECRUITING')
  })

  it('ranks multi-phase trials between their component phases', () => {
    const trials: ClinicalTrial[] = [
      { nctId: '1', title: 'A', status: 'RECRUITING', phase: 'Phase 2', startDate: '', completionDate: '', conditions: [], interventions: [], sponsor: '' },
      { nctId: '2', title: 'B', status: 'RECRUITING', phase: 'Phase 2/Phase 3', startDate: '', completionDate: '', conditions: [], interventions: [], sponsor: '' },
      { nctId: '3', title: 'C', status: 'RECRUITING', phase: 'Phase 3', startDate: '', completionDate: '', conditions: [], interventions: [], sponsor: '' },
    ]
    const result = sortTrials(trials)
    expect(result.map(t => t.nctId)).toEqual(['3', '2', '1'])
  })

  it('handles N/A phase', () => {
    const trials: ClinicalTrial[] = [
      { nctId: '1', title: 'A', status: 'RECRUITING', phase: 'N/A', startDate: '', completionDate: '', conditions: [], interventions: [], sponsor: '' },
      { nctId: '2', title: 'B', status: 'RECRUITING', phase: 'Phase 1', startDate: '', completionDate: '', conditions: [], interventions: [], sponsor: '' },
    ]
    const result = sortTrials(trials)
    expect(result[0].phase).toBe('Phase 1')
  })

  it('does not mutate original array', () => {
    const trials: ClinicalTrial[] = [
      { nctId: '1', title: 'A', status: '', phase: 'Phase 1', startDate: '', completionDate: '', conditions: [], interventions: [], sponsor: '' },
      { nctId: '2', title: 'B', status: '', phase: 'Phase 3', startDate: '', completionDate: '', conditions: [], interventions: [], sponsor: '' },
    ]
    const result = sortTrials(trials)
    expect(result[0].nctId).toBe('2')
    expect(trials[0].nctId).toBe('1')
  })
})

describe('extractDrugInterventions', () => {
  it('extracts only DRUG/BIOLOGICAL/COMBINATION_PRODUCT interventions', () => {
    const trials: ClinicalTrial[] = [
      {
        nctId: '1', title: '', status: '', phase: '', startDate: '', completionDate: '',
        conditions: [], interventions: ['Aspirin', 'MRI'], sponsor: '',
        interventionDetails: [
          { name: 'Aspirin', type: 'DRUG' },
          { name: 'MRI', type: 'DIAGNOSTIC_TEST' },
        ],
      },
    ]
    const drugs = extractDrugInterventions(trials)
    expect(drugs).toHaveLength(1)
    expect(drugs[0].name).toBe('Aspirin')
  })

  it('counts trials per drug', () => {
    const trials: ClinicalTrial[] = [
      {
        nctId: '1', title: '', status: '', phase: '', startDate: '', completionDate: '',
        conditions: [], interventions: [], sponsor: '',
        interventionDetails: [{ name: 'Aspirin', type: 'DRUG' }],
      },
      {
        nctId: '2', title: '', status: '', phase: '', startDate: '', completionDate: '',
        conditions: [], interventions: [], sponsor: '',
        interventionDetails: [{ name: 'Aspirin', type: 'DRUG' }, { name: 'Ibuprofen', type: 'DRUG' }],
      },
    ]
    const drugs = extractDrugInterventions(trials)
    expect(drugs).toHaveLength(2)
    const aspirin = drugs.find(d => d.name === 'Aspirin')
    expect(aspirin?.trialCount).toBe(2)
  })

  it('deduplicates case-insensitively', () => {
    const trials: ClinicalTrial[] = [
      {
        nctId: '1', title: '', status: '', phase: '', startDate: '', completionDate: '',
        conditions: [], interventions: [], sponsor: '',
        interventionDetails: [{ name: 'Aspirin', type: 'DRUG' }],
      },
      {
        nctId: '2', title: '', status: '', phase: '', startDate: '', completionDate: '',
        conditions: [], interventions: [], sponsor: '',
        interventionDetails: [{ name: 'aspirin', type: 'DRUG' }],
      },
    ]
    const drugs = extractDrugInterventions(trials)
    expect(drugs).toHaveLength(1)
    expect(drugs[0].trialCount).toBe(2)
  })

  it('sorts by trial count descending', () => {
    const trials: ClinicalTrial[] = [
      {
        nctId: '1', title: '', status: '', phase: '', startDate: '', completionDate: '',
        conditions: [], interventions: [], sponsor: '',
        interventionDetails: [{ name: 'Ibuprofen', type: 'DRUG' }],
      },
      {
        nctId: '2', title: '', status: '', phase: '', startDate: '', completionDate: '',
        conditions: [], interventions: [], sponsor: '',
        interventionDetails: [{ name: 'Aspirin', type: 'DRUG' }],
      },
      {
        nctId: '3', title: '', status: '', phase: '', startDate: '', completionDate: '',
        conditions: [], interventions: [], sponsor: '',
        interventionDetails: [{ name: 'Aspirin', type: 'DRUG' }],
      },
    ]
    const drugs = extractDrugInterventions(trials)
    expect(drugs[0].name).toBe('Aspirin')
    expect(drugs[0].trialCount).toBe(2)
  })

  it('returns empty for trials without interventionDetails', () => {
    const trials: ClinicalTrial[] = [
      { nctId: '1', title: '', status: '', phase: '', startDate: '', completionDate: '', conditions: [], interventions: ['Aspirin'], sponsor: '' },
    ]
    const drugs = extractDrugInterventions(trials)
    expect(drugs).toHaveLength(0)
  })

  it('handles biological intervention type', () => {
    const trials: ClinicalTrial[] = [
      {
        nctId: '1', title: '', status: '', phase: '', startDate: '', completionDate: '',
        conditions: [], interventions: [], sponsor: '',
        interventionDetails: [{ name: 'Adalimumab', type: 'BIOLOGICAL' }],
      },
    ]
    const drugs = extractDrugInterventions(trials)
    expect(drugs).toHaveLength(1)
    expect(drugs[0].type).toBe('BIOLOGICAL')
  })
})
