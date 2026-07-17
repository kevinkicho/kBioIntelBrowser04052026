/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { PackBuilder } from '@/components/evidence/PackBuilder'
import * as project from '@/lib/project'
import rich from '../fixtures/discovery/core-panels-rich.json'

jest.mock('@/lib/project', () => {
  const actual = jest.requireActual('@/lib/project')
  return {
    ...actual,
    putPackInCache: jest.fn().mockResolvedValue(true),
    addPackIndexEntryAndSave: jest.fn().mockReturnValue({ ok: true, value: true }),
  }
})

jest.mock('@/lib/productEvents', () => ({
  emitProductEvent: jest.fn(),
}))

jest.mock('@/lib/exportData', () => ({
  downloadFile: jest.fn(),
}))

jest.mock('@/components/evidence/PackAiPanel', () => ({
  PackAiPanel: () => null,
}))

describe('PackBuilder share failure UX', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  test('share 500 shows error and still caches pack for RH', async () => {
    localStorage.setItem(
      'biointel-discovery-prefs-v1',
      JSON.stringify({
        version: 1,
        rubricPreset: 'balanced',
        aeAggressiveness: 'soft-flag',
        harvestTiming: 'board-promote',
        harvestTimingSticky: true,
        tourExampleSet: 'mixed',
        collaborationMode: 'share-links-when-available',
        rareDiseaseBoost: false,
        updatedAt: new Date().toISOString(),
      }),
    )

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Snapshot store unavailable' }),
    })

    render(
      <PackBuilder
        panels={rich as never}
        moleculeName="Tafamidis"
        subjectCandidateId="mol:208901"
        projectId="prj_test"
        defaultTitle="ATTR pack"
      />,
    )

    const shareBtn = await screen.findByRole('button', { name: /share pack/i })
    fireEvent.click(shareBtn)
    await waitFor(() => {
      expect(screen.getByText(/Snapshot store unavailable|downloadable|Share failed/i)).toBeTruthy()
    })
    expect(project.putPackInCache).toHaveBeenCalled()
  })

  test('download JSON still writes pack IDB', async () => {
    render(
      <PackBuilder
        panels={rich as never}
        moleculeName="Tafamidis"
        subjectCandidateId="mol:208901"
        defaultTitle="ATTR pack"
      />,
    )
    const dl = screen.getByRole('button', { name: /json/i })
    fireEvent.click(dl)
    await waitFor(() => {
      expect(project.putPackInCache).toHaveBeenCalled()
    })
  })
})
