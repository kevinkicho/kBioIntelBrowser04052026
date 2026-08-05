'use client'

import { useState, useCallback, useEffect } from 'react'
import { SearchBar } from '@/components/search/SearchBar'
import { AdvancedSearchPanel } from '@/components/search/AdvancedSearchPanel'
import {
  API_IDENTIFIER_CONFIGS,
  API_PARAMETERS,
  type SearchType,
  type ApiIdentifierType,
  type ApiParamValue,
} from '@/lib/apiIdentifiers'
import { FavoritesBar } from '@/components/home/FavoritesBar'
import { GuidedTour } from '@/components/home/GuidedTour'
import {
  loadDiscoveryPreferences,
  type TourExampleSetPref,
} from '@/lib/discovery/preferences'
import { examplesForTourSet } from '@/lib/discovery/tourExamples'
import { FinishRateStrip } from '@/components/analytics/FinishRateStrip'
import { loadLastCampaignPath } from '@/lib/campaign/lastCampaignPath'
import { GOLDEN_PATHS } from '@/lib/golden/goldenPaths'
import { applyGoldenPath } from '@/lib/golden/applyGoldenPath'
import { useRouter } from 'next/navigation'

/** Mixed example chips — disease / molecule / gene */
const MOLECULE_EXAMPLES = [
  'aspirin',
  'metformin',
  'caffeine',
  'insulin',
  'penicillin',
]
const GENE_EXAMPLES = ['BRCA1', 'TP53', 'EGFR', 'APOE']

/** Primary loop surfaces first — secondary tools stay reachable but de-emphasized. */
const NAV_LINKS = [
  { href: '/discover', label: 'Discover', color: 'emerald' },
  { href: '/campaign', label: 'Campaign', color: 'emerald' },
  { href: '/projects', label: 'Projects', color: 'emerald' },
  { href: '/compare', label: 'Compare', color: 'slate' },
  { href: '/orgs', label: 'Orgs', color: 'violet' },
  { href: '/analytics', label: 'Analytics', color: 'emerald' },
  { href: '/methodology', label: 'Methodology', color: 'slate' },
  { href: '/gene', label: 'Genes', color: 'slate' },
  { href: '/browse', label: 'Browse', color: 'slate' },
  { href: '/hypothesis', label: 'Hypothesis', color: 'emerald' },
  { href: '/cohort', label: 'Cohort', color: 'slate' },
  { href: '/batch', label: 'Batch', color: 'slate' },
  { href: '/interactions', label: 'Interactions', color: 'slate' },
  { href: '/watchlist', label: 'Watchlist', color: 'amber' },
]

function LinkChip({
  href,
  label,
  color,
  disabled,
}: {
  href: string
  label: string
  color: string
  disabled: boolean
}) {
  const base = 'text-sm px-4 py-2 rounded-lg transition-colors border'
  const disabledClass = 'opacity-50 cursor-not-allowed pointer-events-none'
  const colorClasses =
    color === 'emerald'
      ? 'text-emerald-400 hover:text-emerald-300 bg-emerald-900/20 border-emerald-800/40'
      : color === 'amber'
        ? 'text-amber-400 hover:text-amber-300 bg-amber-900/20 border-amber-800/40'
        : 'text-slate-400 hover:text-slate-200 bg-slate-800/50 border-slate-700'

  if (disabled) {
    return (
      <span className={`${base} ${colorClasses} ${disabledClass}`}>{label}</span>
    )
  }
  return (
    <a href={href} className={`${base} ${colorClasses}`}>
      {label}
    </a>
  )
}

function ChipLink({
  href,
  label,
  disabled,
}: {
  href: string
  label: string
  disabled: boolean
}) {
  const base = 'text-sm px-3 py-1 rounded-full transition-colors'
  const disabledClass =
    'opacity-50 cursor-not-allowed pointer-events-none bg-indigo-900/20 border border-indigo-800/40 text-indigo-300'
  const activeClass =
    'text-indigo-400 hover:text-indigo-300 bg-indigo-900/20 border border-indigo-800/40'

  if (disabled) {
    return <span className={`${base} ${disabledClass}`}>{label}</span>
  }
  return (
    <a href={href} className={`${base} ${activeClass}`}>
      {label}
    </a>
  )
}

export default function HomePage() {
  return <HomePageContent />
}

function HomePageContent() {
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)
  /** Advanced chemical ID mode only (CID/CAS/SMILES…); main bar is always unified. */
  const [searchType, setSearchType] = useState<SearchType>('name')
  const [apiOverrides, setApiOverrides] = useState<Record<string, ApiIdentifierType>>({})
  const [apiParams, setApiParams] = useState<Record<string, ApiParamValue>>({})
  const [tourExampleSet, setTourExampleSet] = useState<TourExampleSetPref>('mixed')
  const [resumePath, setResumePath] = useState<ReturnType<typeof loadLastCampaignPath>>(null)
  const handleNavigating = useCallback((navigating: boolean) => setIsNavigating(navigating), [])

  useEffect(() => {
    setTourExampleSet(loadDiscoveryPreferences().tourExampleSet)
    setResumePath(loadLastCampaignPath())
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'biointel-discovery-prefs-v1' || e.key === null) {
        setTourExampleSet(loadDiscoveryPreferences().tourExampleSet)
      }
    }
    window.addEventListener('storage', onStorage)
    const onFocus = () => setTourExampleSet(loadDiscoveryPreferences().tourExampleSet)
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  useEffect(() => {
    const onPrefs = () => setTourExampleSet(loadDiscoveryPreferences().tourExampleSet)
    window.addEventListener('biointel-prefs-changed', onPrefs)
    return () => window.removeEventListener('biointel-prefs-changed', onPrefs)
  }, [])

  function handleApiOverride(panelId: string, idType: ApiIdentifierType) {
    setApiOverrides((prev) => {
      const next = { ...prev }
      const config = API_IDENTIFIER_CONFIGS.find((c) => c.panelId === panelId)
      if (idType === config?.defaultType) {
        delete next[panelId]
      } else {
        next[panelId] = idType
      }
      return next
    })
  }

  function handleApiParamChange(
    panelId: string,
    param: string,
    value: string | number | boolean,
  ) {
    setApiParams((prev) => {
      const next = { ...prev }
      const paramDef = API_PARAMETERS[panelId]?.find((p) => p.key === param)
      if (!next[panelId]) next[panelId] = {}
      if (value === paramDef?.default) {
        delete next[panelId][param]
        if (Object.keys(next[panelId]).length === 0) delete next[panelId]
      } else {
        next[panelId][param] = value
      }
      return next
    })
  }

  function handleReset() {
    setApiOverrides({})
    setApiParams({})
  }

  const diseaseExamples = examplesForTourSet(tourExampleSet)
  const exampleChips: { label: string; href: string }[] = [
    ...diseaseExamples.slice(0, 3).map((e) => ({
      label: e.name,
      href: `/disease?q=${encodeURIComponent(e.query)}`,
    })),
    ...MOLECULE_EXAMPLES.slice(0, 3).map((s) => ({
      label: s,
      href: `/molecule/name/${encodeURIComponent(s)}`,
    })),
    ...GENE_EXAMPLES.slice(0, 2).map((s) => ({
      label: s,
      href: `/gene?q=${encodeURIComponent(s)}`,
    })),
  ]

  // When advanced mode picks CID/CAS/etc, pass that type; otherwise unified "all"
  const barType: SearchType | 'all' =
    searchType === 'name' || searchType === 'disease' || searchType === 'gene'
      ? 'all'
      : searchType

  return (
    <main
      className={`min-h-screen flex flex-col items-center justify-center px-4 py-16 transition-opacity ${isNavigating ? 'opacity-60 pointer-events-none' : ''}`}
    >
      <div className="text-center mb-12 max-w-3xl">
        <h1 className="text-5xl font-bold text-slate-100 mb-4 tracking-tight">
          BioIntel Explorer
        </h1>
        <p className="text-xl text-slate-400 mb-2">
          Shortlist you trust → cited pack → hypothesis → Monday experiment.
        </p>
        <p className="text-slate-500">
          Free public APIs only · of-record Discover rank is deterministic (no LLM) · not for clinical
          use.
        </p>
      </div>

      <div className="mb-6 w-full max-w-3xl space-y-3" data-testid="home-beachhead">
        <FinishRateStrip compact />
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-left">
          <h2 className="text-sm font-semibold text-slate-100">Beachhead personas</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Start a golden path (applies prefs + Discover session). Prefer finish rate over browsing
            more panels.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {GOLDEN_PATHS.filter((p) => p.id !== 'aspirin-control').map((p) => (
              <button
                key={p.id}
                type="button"
                data-testid={`home-golden-${p.id}`}
                onClick={() => {
                  const r = applyGoldenPath(p)
                  setIsNavigating(true)
                  router.push(r.discoverHref)
                }}
                className="rounded-full border border-emerald-800/50 bg-emerald-950/30 px-3 py-1 text-[11px] font-medium text-emerald-200 hover:bg-emerald-900/40"
              >
                {p.label}
              </button>
            ))}
            <a
              href="/campaign"
              className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-400 hover:border-slate-500"
            >
              Full campaign workspace
            </a>
          </div>
          {resumePath && (
            <p className="mt-3 text-[11px] text-slate-400" data-testid="home-resume-campaign">
              Resume last path:{' '}
              <a href={resumePath.discoverHref} className="font-medium text-sky-300 hover:underline">
                {resumePath.label}
              </a>
              <span className="text-slate-600">
                {' '}
                · {new Date(resumePath.savedAt).toLocaleString()}
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center w-full max-w-2xl">
        <SearchBar
          onNavigating={handleNavigating}
          searchType={barType}
          apiOverrides={apiOverrides}
          apiParams={apiParams}
        />
        <AdvancedSearchPanel
          searchType={searchType}
          onSearchTypeChange={setSearchType}
          apiOverrides={apiOverrides}
          onApiOverrideChange={handleApiOverride}
          onResetOverrides={handleReset}
          onResetParams={() => setApiParams({})}
          apiParams={apiParams}
          onApiParamChange={handleApiParamChange}
        />
      </div>

      <FavoritesBar />

      {/* Always show tour examples for discovery (no disease-mode gate) */}
      <GuidedTour searchType="disease" />

      <div className="mt-8 text-center">
        <p className="text-xs text-slate-600 uppercase tracking-wider mb-3">
          Live public queries (not a local catalog)
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {exampleChips.map((chip) => (
            <ChipLink
              key={chip.label}
              href={chip.href}
              label={chip.label}
              disabled={isNavigating}
            />
          ))}
        </div>
      </div>

      <div className="mt-12 flex gap-4">
        {NAV_LINKS.map((link) => (
          <LinkChip
            key={link.href}
            href={link.href}
            label={link.label}
            color={link.color}
            disabled={isNavigating}
          />
        ))}
      </div>

      <footer className="mt-16 pb-6 text-xs text-slate-600 text-center px-4">
        Data sourced from PubChem, openFDA, KEGG, Rhea, USPTO, ClinicalTrials.gov, NIH Reporter,
        SEC EDGAR, ChEMBL, UniProt, Open Targets, and other free public databases. Built for open
        science. Not for clinical use.
      </footer>
    </main>
  )
}
