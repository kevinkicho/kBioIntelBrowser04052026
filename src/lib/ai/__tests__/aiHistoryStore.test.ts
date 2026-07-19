/**
 * @jest-environment node
 */

import { aiKindLabel, persistAiGeneration, listAiHistoryPage } from '../aiHistoryStore'

jest.mock('@/lib/firebase/aiDataSync', () => ({
  getSignedInUid: () => null,
  saveAiGeneratedData: jest.fn(async () => ({ ok: true, skipped: true })),
  listAiGeneratedPage: jest.fn(async () => ({
    items: [],
    nextCursor: null,
    hasMore: false,
  })),
}))

jest.mock('../aiHistoryIdb', () => ({
  putAiHistoryLocal: jest.fn(async (entry: { mode: string }) => ({
    ...entry,
    id: 'local_1',
    createdAt: new Date().toISOString(),
  })),
  listAiHistoryLocal: jest.fn(async () => ({
    items: [
      {
        id: 'local_1',
        kind: 'discover_rank',
        mode: 'ai_analysis_reorder',
        content: '{}',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    nextCursor: null,
    hasMore: false,
  })),
}))

describe('aiHistoryStore', () => {
  it('labels kinds', () => {
    expect(aiKindLabel('discover_rank')).toMatch(/Discover/i)
    expect(aiKindLabel('board_recommend')).toMatch(/Board/i)
  })

  it('persistAiGeneration dual-writes local when signed out', async () => {
    const r = await persistAiGeneration({
      kind: 'copilot',
      mode: 'free_qa',
      content: 'hello',
      promptSystem: 'sys',
      promptUser: 'user',
    })
    expect(r.ok).toBe(true)
    expect(r.local).toBe(true)
  })

  it('listAiHistoryPage falls back to local when signed out', async () => {
    const page = await listAiHistoryPage({ kind: 'discover_rank', pageSize: 5 })
    expect(page.source).toBe('local')
    expect(page.items.length).toBeGreaterThan(0)
  })
})
