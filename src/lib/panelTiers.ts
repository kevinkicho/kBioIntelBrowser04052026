/**
 * Panel tier helpers — discovery workbench design §4.2.
 *
 * Core: always-on decision surfaces (PubChem, ChEMBL, openFDA AE/recalls,
 * ClinicalTrials.gov, Open Targets, UniProt, EuropePMC/PubMed, RxNorm/DailyMed, DGIdb).
 * Supporting: secondary panels (DisGeNET, Monarch, BindingDB-by-name, pathways, etc.).
 * Experimental: NIH High-Impact, stubs, scrape-heavy, disabled sources.
 */

import { CATEGORIES, type PanelDef, type PanelTier } from '@/lib/categoryConfig'

const PANEL_BY_ID: Map<string, PanelDef> = (() => {
  const map = new Map<string, PanelDef>()
  for (const cat of CATEGORIES) {
    for (const panel of cat.panels) {
      map.set(panel.id, panel)
    }
  }
  return map
})()

/** Default when panel id is unknown — Supporting never blocks discovery. */
const DEFAULT_TIER: PanelTier = 'supporting'

export function getPanelTier(panelId: string): PanelTier {
  return PANEL_BY_ID.get(panelId)?.tier ?? DEFAULT_TIER
}

export function isCorePanel(panelId: string): boolean {
  return getPanelTier(panelId) === 'core'
}

export function isSupportingPanel(panelId: string): boolean {
  return getPanelTier(panelId) === 'supporting'
}

export function isExperimentalPanel(panelId: string): boolean {
  return getPanelTier(panelId) === 'experimental'
}

/** All panels tagged Core, in CATEGORIES order. */
export function listCorePanels(): PanelDef[] {
  return listPanelsByTier('core')
}

export function listSupportingPanels(): PanelDef[] {
  return listPanelsByTier('supporting')
}

export function listExperimentalPanels(): PanelDef[] {
  return listPanelsByTier('experimental')
}

export function listPanelsByTier(tier: PanelTier): PanelDef[] {
  const out: PanelDef[] = []
  for (const cat of CATEGORIES) {
    for (const panel of cat.panels) {
      if (panel.tier === tier) out.push(panel)
    }
  }
  return out
}

/** Canonical Core panel ids from discovery design + PR2 brief. */
export const CORE_PANEL_IDS = [
  'properties', // PubChem properties
  'unichem',
  'chembl',
  'chembl-mechanisms',
  'chembl-indications',
  'adverse-events',
  'recalls',
  'clinical-trials',
  'opentargets',
  'uniprot',
  'literature', // EuropePMC
  'pubmed',
  'dailymed',
  'drug-interactions', // RxNorm
  'dgidb',
] as const

/** Display labels for subtle UI badges. */
export const TIER_LABEL: Record<PanelTier, string> = {
  core: 'Core',
  supporting: 'Supporting',
  experimental: 'Experimental',
}

/** Tailwind classes for low-risk subtle tier badges. */
export const TIER_BADGE_CLASS: Record<PanelTier, string> = {
  core: 'bg-indigo-900/30 text-indigo-300/80 border border-indigo-700/25',
  supporting: 'bg-slate-800/50 text-slate-500 border border-slate-700/30',
  experimental: 'bg-amber-950/40 text-amber-400/70 border border-amber-800/30',
}
