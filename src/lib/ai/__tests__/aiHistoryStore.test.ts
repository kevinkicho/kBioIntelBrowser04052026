/**
 * @jest-environment node
 */

import {
  aiKindLabel,
  persistAiGeneration,
  listAiHistoryPage,
  updateAiGenerationComment,
} from '../aiHistoryStore'

const mockPut = jest.fn(async (entry: { mode: string; id?: string; userComment?: string }) => ({
  ...entry,
  id: entry.id || 'local_1',
  createdAt: new Date().toISOString(),
}))
const mockUpdateComment = jest.fn(
  async (id: string, userComment: string) => ({
    id,
    kind: 'copilot' as const,
    mode: 'free_qa',
    content: 'hello',
    userComment,
    commentUpdatedAt: new Date().toISOString(),
    createdAt: '2026-01-01T00:00:00.000Z',
  }),
)

jest.mock('@/lib/firebase/aiDataSync', () => ({
  getSignedInUid: () => null,
  saveAiGeneratedData: jest.fn(async () => ({ ok: true, skipped: true })),
  updateAiGeneratedCommentCloud: jest.fn(async () => ({
    ok: true,
    skipped: true,
  })),
  getAiGeneratedByIdCloud: jest.fn(async () => null),
  listAiGeneratedPage: jest.fn(async () => ({
    items: [],
    nextCursor: null,
    hasMore: false,
  })),
}))

jest.mock('../aiHistoryIdb', () => ({
  putAiHistoryLocal: (...args: unknown[]) => mockPut(...(args as [typeof mockPut extends (...a: infer A) => unknown ? A[0] : never])),
  updateAiHistoryLocalComment: (...args: unknown[]) =>
    mockUpdateComment(...(args as [string, string])),
  getAiHistoryLocalById: jest.fn(async () => null),
  countAiHistoryLocal: jest.fn(async () => 1),
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
  beforeEach(() => {
    mockPut.mockClear()
    mockUpdateComment.mockClear()
  })

  it('labels kinds including research_lab', () => {
    expect(aiKindLabel('discover_rank')).toMatch(/Discover/i)
    expect(aiKindLabel('board_recommend')).toMatch(/Board/i)
    expect(aiKindLabel('research_lab')).toMatch(/Research lab/i)
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
    expect(r.id).toBeTruthy()
    expect(r.id).toMatch(/^ai_/)
  })

  it('listAiHistoryPage falls back to local when signed out', async () => {
    const page = await listAiHistoryPage({ kind: 'discover_rank', pageSize: 5 })
    expect(page.source).toBe('local')
    expect(page.items.length).toBeGreaterThan(0)
  })

  it('updateAiGenerationComment saves locally when signed out', async () => {
    const r = await updateAiGenerationComment('local_1', 'Prefer later phase')
    expect(r.ok).toBe(true)
    expect(mockUpdateComment).toHaveBeenCalledWith('local_1', 'Prefer later phase')
    expect(r.record?.userComment).toBe('Prefer later phase')
  })
})
