import {
  DEFAULT_RESEARCH_VIEW_PREFS,
  isHubDomainEnabled,
  isResearchTableEnabled,
  parseResearchViewPrefs,
  toggleListItem,
  RESEARCH_TABLE_DOMAINS,
  HUB_DOMAIN_ORDER,
} from '@/lib/researchViewPrefs'

describe('researchViewPrefs', () => {
  it('parses defaults for empty/invalid input', () => {
    expect(parseResearchViewPrefs(null)).toEqual(DEFAULT_RESEARCH_VIEW_PREFS)
    expect(parseResearchViewPrefs({})).toMatchObject({
      hideEmpty: true,
      preferredProfileView: 'research',
    })
  })

  it('filters invalid domain tokens', () => {
    const p = parseResearchViewPrefs({
      researchTables: ['literature', 'nope', 'trials'],
      hubDomains: ['identity', 'bogus', 'clinical'],
      hideEmpty: false,
      preferredProfileView: 'panels',
      tableRowLimit: 20,
    })
    expect(p.researchTables).toEqual(['literature', 'trials'])
    expect(p.hubDomains).toEqual(['identity', 'clinical'])
    expect(p.hideEmpty).toBe(false)
    expect(p.preferredProfileView).toBe('panels')
    expect(p.tableRowLimit).toBe(20)
  })

  it('clamps table row limit', () => {
    expect(parseResearchViewPrefs({ tableRowLimit: 2 }).tableRowLimit).toBe(12)
    expect(parseResearchViewPrefs({ tableRowLimit: 100 }).tableRowLimit).toBe(12)
    expect(parseResearchViewPrefs({ tableRowLimit: 30 }).tableRowLimit).toBe(30)
  })

  it('toggleListItem never empties selection', () => {
    const only = toggleListItem(['literature'], 'literature', RESEARCH_TABLE_DOMAINS)
    expect(only).toEqual([...RESEARCH_TABLE_DOMAINS])
    const next = toggleListItem(
      [...RESEARCH_TABLE_DOMAINS],
      'grants',
      RESEARCH_TABLE_DOMAINS,
    )
    expect(next).not.toContain('grants')
    expect(next.length).toBe(RESEARCH_TABLE_DOMAINS.length - 1)
  })

  it('enabled helpers treat missing as all-on only when list empty (not in practice)', () => {
    const prefs = parseResearchViewPrefs({
      researchTables: ['literature'],
      hubDomains: ['identity'],
    })
    expect(isResearchTableEnabled(prefs, 'literature')).toBe(true)
    expect(isResearchTableEnabled(prefs, 'trials')).toBe(false)
    expect(isHubDomainEnabled(prefs, 'identity')).toBe(true)
    expect(isHubDomainEnabled(prefs, 'safety')).toBe(false)
    // full lists enable all
    const all = DEFAULT_RESEARCH_VIEW_PREFS
    for (const d of RESEARCH_TABLE_DOMAINS) {
      expect(isResearchTableEnabled(all, d)).toBe(true)
    }
    for (const d of HUB_DOMAIN_ORDER) {
      expect(isHubDomainEnabled(all, d)).toBe(true)
    }
  })
})
