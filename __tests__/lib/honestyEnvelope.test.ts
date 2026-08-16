import {
  classifyHonestyEnvelope,
  isEmptyHonestEnvelope,
  isTimeoutHonestyEnvelope,
  shouldCacheHonestyEnvelope,
} from '@/lib/honestyEnvelope'

describe('honesty envelopes', () => {
  it('classifies category/pipeline _emptyHonest as EMPTY, not timeout', () => {
    const empty = {
      clinicalTrials: [],
      _emptyHonest: true,
      _notRetrieved: true,
      _honesty: 'empty this session',
    }
    expect(classifyHonestyEnvelope(empty)).toBe('EMPTY')
    expect(isEmptyHonestEnvelope(empty)).toBe(true)
    expect(isTimeoutHonestyEnvelope(empty)).toBe(false)
    expect(shouldCacheHonestyEnvelope(empty)).toBe(false)
  })

  it('classifies category/pipeline _timeout as TIMEOUT, not empty-honest', () => {
    const timeout = {
      clinicalTrials: [],
      _partial: true,
      _timeout: true,
      _error: 'API call timed out after 15000ms',
    }
    expect(classifyHonestyEnvelope(timeout)).toBe('TIMEOUT')
    expect(isTimeoutHonestyEnvelope(timeout)).toBe(true)
    expect(isEmptyHonestEnvelope(timeout)).toBe(false)
    expect(shouldCacheHonestyEnvelope(timeout)).toBe(false)
  })

  it('does not treat a bare _sourceStatus map as DATA', () => {
    const bare = { _sourceStatus: { pubchem: { status: 'empty', has_data: false } } }
    expect(classifyHonestyEnvelope(bare)).toBeNull()
    // No honesty flags and no rows — caller must not treat provenance as DATA
    expect(shouldCacheHonestyEnvelope(bare)).toBe(true) // no negative flag; route still checks anyRows
  })

  it('allows caching only when envelope is not timeout/empty/error', () => {
    expect(
      shouldCacheHonestyEnvelope({
        clinicalTrials: [{ nctId: 'NCT1' }],
      }),
    ).toBe(true)
    expect(shouldCacheHonestyEnvelope({ _agentStatus: 'error' })).toBe(false)
    expect(shouldCacheHonestyEnvelope({ _agentStatus: 'disabled' })).toBe(false)
  })
})
