import { CATEGORIES, type PanelTier } from '@/lib/categoryConfig'
import {
  CORE_PANEL_IDS,
  getPanelTier,
  isCorePanel,
  isExperimentalPanel,
  isSupportingPanel,
  listCorePanels,
  listExperimentalPanels,
  listPanelsByTier,
  listSupportingPanels,
  TIER_LABEL,
} from '@/lib/panelTiers'

describe('panelTiers', () => {
  describe('getPanelTier', () => {
    it('returns core for known Core panel ids', () => {
      for (const id of CORE_PANEL_IDS) {
        expect(getPanelTier(id)).toBe('core')
      }
    })

    it('returns supporting for DisGeNET and Monarch', () => {
      expect(getPanelTier('disgenet')).toBe('supporting')
      expect(getPanelTier('monarch')).toBe('supporting')
    })

    it('returns supporting for BindingDB name-path panel', () => {
      expect(getPanelTier('bindingdb')).toBe('supporting')
    })

    it('returns experimental for NIH High-Impact panels', () => {
      expect(getPanelTier('nci-cadsr')).toBe('experimental')
      expect(getPanelTier('ncats-translator')).toBe('experimental')
      expect(getPanelTier('nhgri-anvil')).toBe('experimental')
      expect(getPanelTier('niaid-immport')).toBe('experimental')
      expect(getPanelTier('ninds-neurommsig')).toBe('experimental')
    })

    it('returns experimental for disabled/stub sources', () => {
      expect(getPanelTier('ttd')).toBe('experimental')
    })

    it('defaults unknown panel ids to supporting (never block)', () => {
      expect(getPanelTier('not-a-real-panel')).toBe('supporting')
    })
  })

  describe('isCorePanel / isSupportingPanel / isExperimentalPanel', () => {
    it('classifies Core panels', () => {
      expect(isCorePanel('chembl')).toBe(true)
      expect(isSupportingPanel('chembl')).toBe(false)
      expect(isExperimentalPanel('chembl')).toBe(false)
    })

    it('classifies Supporting panels', () => {
      expect(isSupportingPanel('disgenet')).toBe(true)
      expect(isCorePanel('disgenet')).toBe(false)
    })

    it('classifies Experimental panels', () => {
      expect(isExperimentalPanel('nci-cadsr')).toBe(true)
      expect(isCorePanel('nci-cadsr')).toBe(false)
    })
  })

  describe('list helpers', () => {
    it('listCorePanels returns every Core panel in CATEGORIES order', () => {
      const cores = listCorePanels()
      expect(cores.length).toBe(CORE_PANEL_IDS.length)
      expect(cores.every(p => p.tier === 'core')).toBe(true)
      expect(new Set(cores.map(p => p.id))).toEqual(new Set(CORE_PANEL_IDS))
    })

    it('listSupportingPanels and listExperimentalPanels are non-empty and exclusive', () => {
      const supporting = listSupportingPanels()
      const experimental = listExperimentalPanels()
      expect(supporting.length).toBeGreaterThan(0)
      expect(experimental.length).toBeGreaterThan(0)
      expect(supporting.every(p => p.tier === 'supporting')).toBe(true)
      expect(experimental.every(p => p.tier === 'experimental')).toBe(true)
    })

    it('listPanelsByTier partitions all panels', () => {
      const total =
        listPanelsByTier('core').length +
        listPanelsByTier('supporting').length +
        listPanelsByTier('experimental').length
      const all = CATEGORIES.reduce((n, c) => n + c.panels.length, 0)
      expect(total).toBe(all)
    })
  })

  describe('CATEGORIES tier coverage', () => {
    it('every panel has a valid tier', () => {
      const valid: PanelTier[] = ['core', 'supporting', 'experimental']
      for (const cat of CATEGORIES) {
        for (const panel of cat.panels) {
          expect(valid).toContain(panel.tier)
        }
      }
    })

    it('DisGeNET is Supporting when present', () => {
      const panel = CATEGORIES.flatMap(c => c.panels).find(p => p.id === 'disgenet')
      expect(panel).toBeDefined()
      expect(panel!.tier).toBe('supporting')
    })

    it('entire nih-high-impact category is Experimental', () => {
      const nih = CATEGORIES.find(c => c.id === 'nih-high-impact')
      expect(nih).toBeDefined()
      expect(nih!.panels.every(p => p.tier === 'experimental')).toBe(true)
    })

    it('ChEMBL family panels are Core', () => {
      for (const id of ['chembl', 'chembl-mechanisms', 'chembl-indications']) {
        expect(getPanelTier(id)).toBe('core')
      }
    })

    it('openFDA AE and recalls are Core', () => {
      expect(getPanelTier('adverse-events')).toBe('core')
      expect(getPanelTier('recalls')).toBe('core')
    })
  })

  describe('TIER_LABEL', () => {
    it('provides display labels for all tiers', () => {
      expect(TIER_LABEL.core).toBe('Core')
      expect(TIER_LABEL.supporting).toBe('Supporting')
      expect(TIER_LABEL.experimental).toBe('Experimental')
    })
  })
})
