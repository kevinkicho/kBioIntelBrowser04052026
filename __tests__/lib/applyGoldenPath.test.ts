/**
 * @jest-environment jsdom
 */
import { applyGoldenPath, prefsForGoldenPath } from '@/lib/golden/applyGoldenPath'
import { goldenPathById } from '@/lib/golden/goldenPaths'
import { loadDiscoveryPreferences } from '@/lib/discovery/preferences'
import { loadLastCampaignPath } from '@/lib/campaign/lastCampaignPath'
import { listDiscoverSessions } from '@/lib/discovery/discoverSessions'

describe('applyGoldenPath', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('rare path enables Orphanet boost and gene-led when pins exist', () => {
    const attr = goldenPathById('attr')!
    const prefs = prefsForGoldenPath(attr)
    expect(prefs.rareDiseaseBoost).toBe(true)
    expect(prefs.mustHitPinnedTargets).toBe(true)
    expect(prefs.tourExampleSet).toBe('rare-only')
  })

  it('writes last campaign path and discover session', () => {
    const attr = goldenPathById('attr')!
    const r = applyGoldenPath(attr)
    expect(r.discoverHref).toContain('ATTR')
    expect(loadLastCampaignPath()?.label).toBe(attr.label)
    expect(listDiscoverSessions().some((s) => s.label.includes('ATTR'))).toBe(true)
    expect(loadDiscoveryPreferences().rareDiseaseBoost).toBe(true)
  })
})
