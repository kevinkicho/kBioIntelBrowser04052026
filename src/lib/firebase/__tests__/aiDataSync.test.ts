/**
 * @jest-environment node
 */

import { listAiGeneratedPage, saveAiGeneratedData } from '../aiDataSync'

jest.mock('../client', () => ({
  getFirebaseAuth: () => null,
  getFirebaseFirestore: () => null,
}))

describe('saveAiGeneratedData', () => {
  it('skips when signed out (no privacy leak)', async () => {
    const result = await saveAiGeneratedData({
      kind: 'copilot',
      mode: 'free_qa',
      content: 'secret insight',
      promptSystem: 'sys',
      promptUser: 'user',
    })
    expect(result.ok).toBe(true)
    expect(result.skipped).toBe(true)
  })

  it('listAiGeneratedPage returns empty when firestore unavailable', async () => {
    const page = await listAiGeneratedPage('uid-x', { pageSize: 5, kind: 'pack' })
    expect(page.items).toEqual([])
    expect(page.hasMore).toBe(false)
  })
})
