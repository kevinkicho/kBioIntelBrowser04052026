/**
 * Discover URL key used to re-rank when search history changes q/diseaseId/targets.
 * Mirrors discover/page.tsx discoverUrlKey logic.
 */

function discoverUrlKey(
  q: string,
  diseaseId: string | undefined,
  targets: string[],
  forceRefresh: boolean,
  refreshToken: string | null,
): string {
  const t = [...targets]
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .sort()
    .join(',')
  return [
    q.trim().toLowerCase(),
    (diseaseId ?? '').trim(),
    t,
    forceRefresh ? '1' : '0',
    refreshToken ?? '',
  ].join('|')
}

describe('discoverUrlKey', () => {
  test('changes when disease query changes (history navigation)', () => {
    const a = discoverUrlKey('carcinoma', 'MONDO_0004993', ['RPSA'], false, null)
    const b = discoverUrlKey('lymphoma', 'MONDO_0018905', [], false, null)
    expect(a).not.toEqual(b)
  })

  test('stable for same targets in different order', () => {
    const a = discoverUrlKey('carcinoma', 'MONDO_0004993', ['RPSA', 'EGFR'], false, null)
    const b = discoverUrlKey('carcinoma', 'MONDO_0004993', ['EGFR', 'RPSA'], false, null)
    expect(a).toEqual(b)
  })

  test('forceRefresh / _t token forces a new key', () => {
    const a = discoverUrlKey('carcinoma', 'MONDO_0004993', [], false, null)
    const b = discoverUrlKey('carcinoma', 'MONDO_0004993', [], true, '123')
    expect(a).not.toEqual(b)
  })
})
