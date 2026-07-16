/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react'
import { useDiscovery } from '@/app/discover/hooks/useDiscovery'

jest.mock('@/lib/clientFetch', () => ({
  clientFetch: jest.fn(),
}))

import { clientFetch } from '@/lib/clientFetch'

const mockFetch = clientFetch as jest.Mock

function multiHitPayload() {
  return {
    query: 'alzheimer',
    diseaseId: null,
    diseaseName: 'alzheimer',
    therapeuticAreas: [],
    genes: [],
    candidates: [],
    warnings: ['Multiple disease matches (2); confirm which disease to rank.'],
    generatedAt: '2026-04-07T12:00:00.000Z',
    sourceStatuses: [],
    v2: {
      schemaVersion: 2,
      query: 'alzheimer',
      disease: null,
      diseaseCandidates: [
        {
          id: 'EFO_0000249',
          idNamespace: 'ot',
          name: 'Alzheimer disease',
          synonyms: [],
          therapeuticAreas: [],
          xrefs: [],
          identityTrust: 'medium',
        },
        {
          id: 'EFO_0006792',
          idNamespace: 'ot',
          name: 'late-onset Alzheimer disease',
          synonyms: [],
          therapeuticAreas: [],
          xrefs: [],
          identityTrust: 'medium',
        },
      ],
      needsDiseaseConfirmation: true,
      targets: [],
      candidates: [],
      sourceStatuses: [],
      rubric: {
        version: 1,
        weights: {
          efficacy: 0.3,
          clinicalStage: 0.25,
          safety: 0.25,
          novelty: 0.1,
          identityTrust: 0.1,
        },
        missingAxisPolicy: 'renormalize',
        preset: 'balanced',
        aeAggressiveness: 'soft-flag',
      },
      generatedAt: '2026-04-07T12:00:00.000Z',
      warnings: [],
      scorePhase: 'cheap',
    },
  }
}

function rankedPayload(diseaseId: string, diseaseName: string) {
  return {
    query: 'alzheimer',
    diseaseId,
    diseaseName,
    therapeuticAreas: [],
    genes: [],
    candidates: [
      {
        name: 'Donepezil',
        cid: 3152,
        clinicalPhase: 1,
        geneAssociationScore: 0.8,
        sharedTargetRatio: 0.5,
        trialCountNorm: 0.5,
        clinicalPhaseRaw: 4,
        sharedTargetCountRaw: 2,
        trialCountRaw: 5,
        geneScoreRaw: 0.8,
        sources: ['DGIdb'],
        confidence: 'high',
        compositeScore: 0.7,
      },
    ],
    generatedAt: '2026-04-07T12:00:00.000Z',
    sourceStatuses: [],
    warnings: [],
    v2: {
      schemaVersion: 2,
      query: 'alzheimer',
      disease: {
        id: diseaseId,
        idNamespace: 'ot',
        name: diseaseName,
        synonyms: [],
        therapeuticAreas: [],
        xrefs: [],
        identityTrust: 'medium',
      },
      needsDiseaseConfirmation: false,
      targets: [],
      candidates: [],
      sourceStatuses: [],
      rubric: {
        version: 1,
        weights: {
          efficacy: 0.3,
          clinicalStage: 0.25,
          safety: 0.25,
          novelty: 0.1,
          identityTrust: 0.1,
        },
        missingAxisPolicy: 'renormalize',
        preset: 'balanced',
        aeAggressiveness: 'soft-flag',
      },
      generatedAt: '2026-04-07T12:00:00.000Z',
      warnings: [],
      scorePhase: 'cheap',
    },
  }
}

function parsePostBody(call: unknown[]): Record<string, unknown> {
  const init = call[1] as { body?: string; method?: string }
  expect(init?.method).toBe('POST')
  return JSON.parse(init.body ?? '{}') as Record<string, unknown>
}

describe('useDiscovery (PR6b + PR4 prefs POST)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('enters confirm_disease when multi-hit response arrives', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => multiHitPayload(),
    })

    const { result } = renderHook(() => useDiscovery())

    await act(async () => {
      await result.current.search('alzheimer')
    })

    await waitFor(() => {
      expect(result.current.state.status).toBe('confirm_disease')
    })

    expect(result.current.state.diseaseCandidates).toHaveLength(2)
    expect(result.current.state.diseaseCandidates[0].id).toBe('EFO_0000249')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/discover/rank',
      expect.objectContaining({ method: 'POST' }),
    )
    const body = parsePostBody(mockFetch.mock.calls[0])
    expect(body.q).toBe('alzheimer')
    expect(body.diseaseId).toBeUndefined()
  })

  it('passes diseaseId on confirm and reaches success', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => multiHitPayload(),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => rankedPayload('EFO_0006792', 'late-onset Alzheimer disease'),
      })

    const { result } = renderHook(() => useDiscovery())

    await act(async () => {
      await result.current.search('alzheimer')
    })

    await waitFor(() => expect(result.current.state.status).toBe('confirm_disease'))

    await act(async () => {
      await result.current.confirmDisease('EFO_0006792')
    })

    await waitFor(() => expect(result.current.state.status).toBe('success'))

    expect(result.current.state.result?.diseaseId).toBe('EFO_0006792')
    expect(result.current.state.diseaseCandidates).toEqual([])
    const confirmBody = parsePostBody(mockFetch.mock.calls[1])
    expect(confirmBody.diseaseId).toBe('EFO_0006792')
  })

  it('skips confirmation when diseaseId is provided up front', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => rankedPayload('EFO_0000249', 'Alzheimer disease'),
    })

    const { result } = renderHook(() => useDiscovery())

    await act(async () => {
      await result.current.search('alzheimer', { diseaseId: 'EFO_0000249' })
    })

    await waitFor(() => expect(result.current.state.status).toBe('success'))

    const body = parsePostBody(mockFetch.mock.calls[0])
    expect(body.diseaseId).toBe('EFO_0000249')
    expect(result.current.state.status).not.toBe('confirm_disease')
  })
})
