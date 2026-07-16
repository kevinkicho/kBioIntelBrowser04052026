import {
  buildMoleculePanelDeepLink,
  panelAnchorId,
  panelIdFromHash,
} from '@/lib/signals'

describe('signal deep links', () => {
  it('builds molecule panel path with hash anchor', () => {
    expect(buildMoleculePanelDeepLink(2244, 'adverse-events')).toBe(
      '/molecule/2244#adverse-events',
    )
  })

  it('includes project and disease query params', () => {
    expect(
      buildMoleculePanelDeepLink(2244, 'clinical-trials', {
        projectId: 'prj_abc',
        disease: 'ATTR amyloidosis',
      }),
    ).toBe(
      '/molecule/2244?project=prj_abc&disease=ATTR+amyloidosis#clinical-trials',
    )
  })

  it('panelAnchorId is the panel id (DOM id)', () => {
    expect(panelAnchorId('chembl')).toBe('chembl')
  })

  it('parses panel id from hash', () => {
    expect(panelIdFromHash('#adverse-events')).toBe('adverse-events')
    expect(panelIdFromHash('clinical-trials')).toBe('clinical-trials')
    expect(panelIdFromHash('')).toBeNull()
    expect(panelIdFromHash(null)).toBeNull()
  })

  it('rejects invalid cid / panelId', () => {
    expect(() => buildMoleculePanelDeepLink(0, 'x')).toThrow(/Invalid cid/)
    expect(() => buildMoleculePanelDeepLink(1, '')).toThrow(/panelId/)
  })
})
