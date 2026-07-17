/**
 * @jest-environment node
 */

import { saveAiGeneratedData } from '../aiDataSync'

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
    })
    expect(result.ok).toBe(true)
    expect(result.skipped).toBe(true)
  })
})
