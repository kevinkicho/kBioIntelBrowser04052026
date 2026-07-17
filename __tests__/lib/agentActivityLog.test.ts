/**
 * @jest-environment jsdom
 */
import {
  logAgentActivity,
  _agentLogQueueLength,
  _clearAgentLogQueue,
  flushAgentLog,
} from '@/lib/agentActivityLog'

describe('agentActivityLog', () => {
  const originalEnv = process.env.NODE_ENV
  const originalFetch = global.fetch

  beforeEach(() => {
    _clearAgentLogQueue()
    process.env.NEXT_PUBLIC_AGENT_LOG = '1'
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 }) as unknown as typeof fetch
  })

  afterEach(() => {
    _clearAgentLogQueue()
    delete process.env.NEXT_PUBLIC_AGENT_LOG
    global.fetch = originalFetch
    // @ts-expect-error restore
    process.env.NODE_ENV = originalEnv
  })

  test('queues events when enabled', async () => {
    logAgentActivity('test.event', { foo: 1 })
    expect(_agentLogQueueLength()).toBeGreaterThan(0)
    await flushAgentLog()
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/agent-log',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(_agentLogQueueLength()).toBe(0)
  })

  test('no-ops when explicitly disabled', () => {
    process.env.NEXT_PUBLIC_AGENT_LOG = '0'
    logAgentActivity('test.skip', {})
    expect(_agentLogQueueLength()).toBe(0)
  })
})
