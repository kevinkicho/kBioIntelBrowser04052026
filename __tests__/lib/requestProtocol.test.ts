import {
  acquireRequestSlot,
  clearResourcePressureForTests,
  clearSingleFlightForTests,
  isInsufficientResourcesError,
  markResourcePressure,
  MAX_BROWSER_CONCURRENT,
  releaseRequestSlot,
  requestGateSnapshot,
  resetRequestGateForTests,
  singleFlightKey,
  underResourcePressure,
  withRequestSlot,
  withSingleFlight,
} from '@/lib/requestProtocol'

describe('requestProtocol', () => {
  beforeEach(() => {
    resetRequestGateForTests()
    clearSingleFlightForTests()
    clearResourcePressureForTests()
  })

  afterEach(() => {
    resetRequestGateForTests()
    clearSingleFlightForTests()
    clearResourcePressureForTests()
  })

  it('tracks concurrent slots under the cap', async () => {
    await acquireRequestSlot()
    await acquireRequestSlot()
    expect(requestGateSnapshot().inFlight).toBe(2)
    expect(requestGateSnapshot().max).toBe(MAX_BROWSER_CONCURRENT)
    releaseRequestSlot()
    releaseRequestSlot()
    expect(requestGateSnapshot().inFlight).toBe(0)
  })

  it('queues when at capacity then resumes', async () => {
    for (let i = 0; i < MAX_BROWSER_CONCURRENT; i++) {
      await acquireRequestSlot()
    }
    expect(requestGateSnapshot().inFlight).toBe(MAX_BROWSER_CONCURRENT)

    let released = false
    const waiter = acquireRequestSlot().then(() => {
      released = true
    })
    // Still at cap until we free a slot
    expect(requestGateSnapshot().waiting).toBe(1)
    expect(released).toBe(false)

    releaseRequestSlot()
    await waiter
    expect(released).toBe(true)
    expect(requestGateSnapshot().inFlight).toBe(MAX_BROWSER_CONCURRENT)

    // Drain all
    for (let i = 0; i < MAX_BROWSER_CONCURRENT; i++) releaseRequestSlot()
    expect(requestGateSnapshot().inFlight).toBe(0)
  })

  it('dropIfBusy rejects when saturated', async () => {
    for (let i = 0; i < MAX_BROWSER_CONCURRENT; i++) await acquireRequestSlot()
    await expect(acquireRequestSlot({ dropIfBusy: true })).rejects.toThrow(
      /request_gate_busy/,
    )
    for (let i = 0; i < MAX_BROWSER_CONCURRENT; i++) releaseRequestSlot()
  })

  it('withRequestSlot releases after work', async () => {
    const v = await withRequestSlot(async () => 42)
    expect(v).toBe(42)
    expect(requestGateSnapshot().inFlight).toBe(0)
  })

  it('withSingleFlight shares one factory', async () => {
    let calls = 0
    const factory = async () => {
      calls++
      await new Promise((r) => setTimeout(r, 10))
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }
    const key = singleFlightKey('POST', '/api/discover/rank', '{"q":"x"}')
    const [a, b] = await Promise.all([
      withSingleFlight(key, factory),
      withSingleFlight(key, factory),
    ])
    expect(calls).toBe(1)
    expect(a.status).toBe(200)
    expect(b.status).toBe(200)
    expect(await a.json()).toEqual({ ok: true })
    expect(await b.json()).toEqual({ ok: true })
  })

  it('detects insufficient resources errors', () => {
    expect(
      isInsufficientResourcesError(new TypeError('Failed to fetch')),
    ).toBe(true)
    expect(
      isInsufficientResourcesError(
        new Error('net::ERR_INSUFFICIENT_RESOURCES'),
      ),
    ).toBe(true)
    expect(isInsufficientResourcesError(new Error('AbortError'))).toBe(false)
  })

  it('resource pressure cool-down flag', () => {
    expect(underResourcePressure()).toBe(false)
    markResourcePressure(5_000)
    expect(underResourcePressure()).toBe(true)
    clearResourcePressureForTests()
    expect(underResourcePressure()).toBe(false)
  })
})
