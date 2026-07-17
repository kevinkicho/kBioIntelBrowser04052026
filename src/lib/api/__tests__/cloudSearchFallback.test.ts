describe('MyChem pubchem CID extraction shape', () => {
  function extractCids(hit: Record<string, unknown>): number[] {
    const out: number[] = []
    const push = (raw: unknown) => {
      const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10)
      if (Number.isFinite(n) && n > 0) out.push(n)
    }
    const pc = hit.pubchem
    if (Array.isArray(pc)) {
      for (const item of pc) {
        if (item && typeof item === 'object') push((item as { cid?: unknown }).cid)
      }
    } else if (pc && typeof pc === 'object') {
      push((pc as { cid?: unknown }).cid)
    }
    return out
  }

  it('reads cid from object form', () => {
    expect(extractCids({ pubchem: { cid: 4091 } })).toEqual([4091])
  })

  it('reads cids from array form (metformin-style MyChem hits)', () => {
    expect(
      extractCids({
        pubchem: [{ cid: 4091 }, { cid: 155906370 }],
      }),
    ).toEqual([4091, 155906370])
  })

  it('returns empty when no cid', () => {
    expect(extractCids({ pubchem: {} })).toEqual([])
  })
})
