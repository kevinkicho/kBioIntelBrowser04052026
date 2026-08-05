import { isSoftEmptyPayload } from '@/components/ui/NotRetrievedBanner'

describe('isSoftEmptyPayload', () => {
  it('treats null and empty object as soft empty', () => {
    expect(isSoftEmptyPayload(null)).toBe(true)
    expect(isSoftEmptyPayload({})).toBe(true)
  })

  it('does not treat partial timeout as soft empty alone', () => {
    expect(isSoftEmptyPayload({ _partial: true, _timeout: true })).toBe(false)
  })

  it('detects non-empty sections', () => {
    expect(isSoftEmptyPayload({ sections: [{ id: 'a' }] })).toBe(false)
  })
})
