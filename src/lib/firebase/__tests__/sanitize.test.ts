import { approxJsonBytes, FIRESTORE_DOC_SOFT_MAX_BYTES, stripUndefined } from '../sanitize'

describe('stripUndefined', () => {
  it('removes undefined keys recursively', () => {
    expect(
      stripUndefined({
        a: 1,
        b: undefined,
        nested: { c: 'x', d: undefined },
        arr: [1, undefined, { e: undefined, f: 2 }],
      }),
    ).toEqual({
      a: 1,
      nested: { c: 'x' },
      arr: [1, { f: 2 }],
    })
  })

  it('preserves null and false', () => {
    expect(stripUndefined({ a: null, b: false, c: 0 })).toEqual({ a: null, b: false, c: 0 })
  })
})

describe('approxJsonBytes', () => {
  it('returns string length of JSON', () => {
    expect(approxJsonBytes({ hello: 'world' })).toBe(JSON.stringify({ hello: 'world' }).length)
  })

  it('soft max leaves headroom under 1 MiB', () => {
    expect(FIRESTORE_DOC_SOFT_MAX_BYTES).toBeLessThan(1_048_576)
    expect(FIRESTORE_DOC_SOFT_MAX_BYTES).toBeGreaterThan(500_000)
  })
})
