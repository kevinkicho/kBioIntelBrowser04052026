const {
  payloadHasData,
  classifyHonesty,
} = require('../../scripts/api-endpoint-health.js')

describe('api-endpoint-health honesty classification', () => {
  it('does not treat _emptyHonest as DATA', () => {
    const env = { clinicalTrials: [], _emptyHonest: true, _notRetrieved: true }
    expect(classifyHonesty(env)).toBe('EMPTY')
    expect(payloadHasData(env)).toBe(false)
  })

  it('does not treat _timeout as DATA', () => {
    const env = { _partial: true, _timeout: true, _error: 'timed out' }
    expect(classifyHonesty(env)).toBe('TIMEOUT')
    expect(payloadHasData(env)).toBe(false)
  })

  it('does not treat a bare _sourceStatus as DATA', () => {
    const env = { _sourceStatus: { mesh: { status: 'empty', has_data: false } } }
    expect(classifyHonesty(env)).toBeNull()
    expect(payloadHasData(env)).toBe(false)
  })

  it('records ERROR separately via _agentStatus', () => {
    expect(classifyHonesty({ _agentStatus: 'error', _error: 'boom' })).toBe('ERROR')
  })
})
