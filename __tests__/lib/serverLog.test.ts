/**
 * @jest-environment node
 */
import { logApiOutcome, startApiTimer } from '@/lib/serverLog'

describe('serverLog', () => {
  let errSpy: jest.SpyInstance
  let warnSpy: jest.SpyInstance
  let logSpy: jest.SpyInstance

  beforeEach(() => {
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    errSpy.mockRestore()
    warnSpy.mockRestore()
    logSpy.mockRestore()
  })

  test('logs ERROR for 502 retryable', () => {
    logApiOutcome({
      route: '/api/molecule/[id]',
      status: 502,
      ms: 100,
      cid: 2244,
      retryable: true,
      source: 'pubchem',
    })
    expect(errSpy).toHaveBeenCalled()
    const line = String(errSpy.mock.calls[0][0])
    const parsed = JSON.parse(line)
    expect(parsed.severity).toBe('ERROR')
    expect(parsed.retryable).toBe(true)
    expect(parsed.kind).toBe('upstream_retryable')
  })

  test('logs INFO for slow 200', () => {
    logApiOutcome({
      route: '/api/molecule/[id]/category/[categoryId]',
      status: 200,
      ms: 9000,
      categoryId: 'clinical-safety',
    })
    expect(logSpy).toHaveBeenCalled()
    const parsed = JSON.parse(String(logSpy.mock.calls[0][0]))
    expect(parsed.severity).toBe('INFO')
    expect(parsed.kind).toBe('slow')
  })

  test('does not log fast 200 or 404', () => {
    logApiOutcome({ route: '/x', status: 200, ms: 50 })
    logApiOutcome({ route: '/x', status: 404, ms: 50 })
    expect(errSpy).not.toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()
    expect(logSpy).not.toHaveBeenCalled()
  })

  test('startApiTimer measures elapsed', async () => {
    const t = startApiTimer()
    await new Promise((r) => setTimeout(r, 5))
    expect(t.ms()).toBeGreaterThanOrEqual(0)
  })
})
