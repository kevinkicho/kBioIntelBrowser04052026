'use client'

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ViewToggle } from '@/components/profile/ViewToggle'
import { ProfileModeToggle } from '@/components/profile/ProfileModeToggle'
import { DecisionStrip } from '@/components/profile/DecisionStrip'
import { LandscapeDualStrip } from '@/components/profile/LandscapeDualStrip'
import { CrossSourceStrip } from '@/components/crossSource/CrossSourceStrip'
import { DataHubLedgerView } from '@/components/dataHub/DataHubLedger'
import { buildMoleculeCrossSource } from '@/lib/crossSource'
import { buildMoleculeDataHub } from '@/lib/dataHub'
import { CategoryTabBar } from '@/components/profile/CategoryTabBar'
import { Modal } from '@/components/ui/Modal'
import { Panel } from '@/components/ui/Panel'
import { isPanelSourceDisabled } from '@/lib/api/sourceAvailability'
import { CategorySection } from '@/components/profile/CategorySection'
import { PanelSearch } from '@/components/profile/PanelSearch'
import {
  CATEGORIES,
  MOLECULE_CATEGORIES,
  MOLECULE_CATEGORY_IDS,
  getCategoryDataCounts,
  type CategoryId,
} from '@/lib/categoryConfig'
import { MoleculeSummary } from '@/components/profile/MoleculeSummary'
import { ExportButton } from '@/components/profile/ExportButton'
import { CiteButton } from '@/components/profile/CiteButton'
import { ShareButton } from '@/components/profile/ShareButton'
import { computeMoleculeSummary } from '@/lib/moleculeSummary'
import {
  fetchCategoryData,
  peekCategoryClientCache,
  type CategoryLoadState,
} from '@/lib/fetchCategory'
import type { FreshnessMap } from '@/lib/dataFreshness'
import { buildGraphData } from '@/lib/buildGraphData'
import type { CompanyProduct, SynthesisRoute, Patent, UniprotEntry, CadsrConcept, TranslatorAssociation, AnvilDataset, ImmPortStudy, NeuroMMSigSignature } from '@/lib/types'
import * as LazyPanels from '@/lib/lazyPanels'
import { NetworkGraph } from '@/components/graph/NetworkGraph'
import { InsightsSection } from '@/components/profile/InsightsSection'
import { SimilarMolecules } from '@/components/profile/SimilarMolecules'
import { ChangeAlerts } from '@/components/profile/ChangeAlerts'
import { GeneTargetStrip } from '@/components/profile/GeneTargetStrip'
import { ResearchBrief } from '@/components/profile/ResearchBrief'
import { detectChanges, saveSnapshot, type ChangeItem } from '@/lib/changeDetection'
import { panelIdFromHash } from '@/lib/signals'
import { emitProductEvent } from '@/lib/productEvents'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { LoadingOverlay } from '@/components/profile/LoadingOverlay'
import { useElapsedMs } from '@/components/ui/ElapsedTimer'
import { formatElapsed } from '@/lib/elapsedTime'
import { AICopilot } from '@/components/ai/AICopilot'
import { StyledTooltip } from '@/components/ui/StyledTooltip'
import { NextStepsPanel, DiscoverBreadcrumb } from '@/components/profile/NextStepsPanel'
import { PipelinePanel } from '@/components/profile/PipelinePanel'
import { VendorsPanel } from '@/components/profile/VendorsPanel'
import { ProfilePanelProvider } from '@/components/profile/ProfilePanelContext'
import { sessionHistory } from '@/lib/sessionHistory'
import { recordSearch } from '@/lib/searchHistory'
import {
  hydrateProfileRevisitFromIdb,
  invalidateProfileClientCache,
} from '@/lib/profileClientCache'
import { logAgentActivity } from '@/lib/agentActivityLog'
import {
  categoryForPanel,
  resolveCategoryFetchedAt,
  sourceStatusForPanel,
  type CategoryApiTrace,
} from '@/lib/panelApiTrace'
import type { ApiIdentifierType, ApiParamValue } from '@/lib/apiIdentifiers'
import type { ScoreVector } from '@/lib/domain'
import {
  type ProfileMode,
  DECISION_CATEGORY_IDS,
  DECISION_PANEL_ID_SET,
  defaultProfileMode,
  decisionCategoriesLoading,
  decisionCategoriesReady,
  extractDecisionStripClaims,
  loadStoredProfileMode,
  lookupProjectCandidateScores,
  parseProfileMode,
  saveStoredProfileMode,
  scoreVectorFromSearchParams,
} from '@/lib/profileMode'

export interface EmbedMode {
  /**
   * Allowlist of panel ids that should render in embed mode.
   * If undefined, defaults to ['summary', 'structure'] in the embed page.
   * Use literal panel ids from `CATEGORIES` (e.g., 'companies', 'clinical-trials')
   * plus the synthetic ids 'summary' and 'structure' which gate the top
   * MoleculeSummary card and the molecule viewer respectively.
   */
  allowedPanels?: string[]
}

interface Props {
  cid: number
  moleculeName: string
  molecularWeight: number
  formula?: string | null
  inchiKey: string
  iupacName: string
  cas?: string | null
  synonyms?: string[]
  embedMode?: EmbedMode
}

type PanelRenderer = (panelId: string, lastFetched?: Date) => React.ReactNode

type CategoriesData = Partial<Record<CategoryId, Record<string, unknown>>>
type CategoriesStatus = Record<CategoryId, CategoryLoadState>

// 'gene' is gene-explorer only — never fetch on molecule profile (API would 400; overlay would stall).
const ALL_CATEGORY_IDS: CategoryId[] = [...MOLECULE_CATEGORY_IDS]

const DISCOVER_PRIORITY_CATEGORIES: CategoryId[] = ['clinical-safety', 'bioactivity-targets', 'molecular-chemical']

/** Tiered category load order (module-level so effects do not re-create deps). */
const TIER1_CATEGORIES: CategoryId[] = [
  'pharmaceutical',
  'clinical-safety',
  'bioactivity-targets',
]
const TIER2_CATEGORIES: CategoryId[] = ['research-literature', 'molecular-chemical']
const TIER3_CATEGORIES: CategoryId[] = [
  'protein-structure',
  'genomics-disease',
  'interactions-pathways',
  'nih-high-impact',
]

function AutoLoadIndicator({ categoryStatus }: { categoryStatus: CategoriesStatus }) {
  const [visible, setVisible] = useState(true)
  const priorityLoaded = DISCOVER_PRIORITY_CATEGORIES.every(id => categoryStatus[id] === 'loaded')
  const anyLoading = DISCOVER_PRIORITY_CATEGORIES.some(id => categoryStatus[id] === 'loading')
  const elapsed = useElapsedMs(anyLoading)

  useEffect(() => {
    if (priorityLoaded) {
      const timer = setTimeout(() => setVisible(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [priorityLoaded])

  if (!visible && (priorityLoaded || !anyLoading)) return null

  return (
    <div className={`text-[10px] text-indigo-400/70 transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {anyLoading ? (
        <span className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Auto-loading key data from discovery…
          <span className="font-mono tabular-nums text-indigo-300/90" data-testid="autoload-elapsed">
            {formatElapsed(elapsed)}
          </span>
        </span>
      ) : priorityLoaded ? (
        <span className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Key data loaded
        </span>
      ) : null}
    </div>
  )
}

function initStatus(): CategoriesStatus {
  const s = {} as CategoriesStatus
  for (const id of ALL_CATEGORY_IDS) s[id] = 'idle'
  return s
}

export function ProfilePageClient({ cid, moleculeName, molecularWeight, formula, inchiKey, iupacName, cas, synonyms, embedMode }: Props) {
  return (
    <Suspense fallback={<div className="animate-pulse h-96 bg-slate-800/50 rounded-xl" />}>
      {/* key=cid remounts client state on SPA molecule→molecule nav (avoids stale panels / skipped loads). */}
      <ProfilePageClientInner
        key={cid}
        cid={cid}
        moleculeName={moleculeName}
        molecularWeight={molecularWeight}
        formula={formula}
        inchiKey={inchiKey}
        iupacName={iupacName}
        cas={cas}
        synonyms={synonyms}
        embedMode={embedMode}
      />
    </Suspense>
  )
}

function ProfilePageClientInner({ cid, moleculeName, molecularWeight, formula, inchiKey, iupacName, cas, synonyms, embedMode }: Props) {
  const isEmbed = !!embedMode
  const allowedPanelSet = useMemo(() => {
    if (!embedMode?.allowedPanels) return null
    return new Set(embedMode.allowedPanels)
  }, [embedMode])
  const isPanelAllowed = useCallback((panelId: string) => {
    if (!allowedPanelSet) return true
    return allowedPanelSet.has(panelId)
  }, [allowedPanelSet])
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab = searchParams.get('tab')
  const initialView = searchParams.get('view')
  const fromDiscover = searchParams.get('from') === 'discover'
  const diseaseParam = searchParams.get('disease')
  const projectParam = searchParams.get('project')
  const rankParam = parseInt(searchParams.get('rank') ?? '0', 10) || 0
  const pendingRef = useRef<Set<CategoryId>>(new Set())
  /** Monotonic per-category load token — drop stale responses when force/soft-refresh races. */
  const loadGenRef = useRef<Partial<Record<CategoryId, number>>>({})
  /** Per-category AbortController — cancel in-flight on force refresh or unmount. */
  const abortByCatRef = useRef<Partial<Record<CategoryId, AbortController>>>({})
  /** In-place re-fetch: keep panels mounted (no skeleton) so scroll position stays put. */
  const softRefreshingRef = useRef<Set<CategoryId>>(new Set())
  const [softRefreshTick, setSoftRefreshTick] = useState(0)

  const apiOverrides = useMemo<Record<string, ApiIdentifierType>>(() => {
    try {
      const raw = searchParams.get('overrides')
      return raw ? JSON.parse(raw) : {}
    } catch { return {} }
  }, [searchParams])

  const apiParams = useMemo<Record<string, ApiParamValue>>(() => {
    try {
      const raw = searchParams.get('params')
      return raw ? JSON.parse(raw) : {}
    } catch { return {} }
  }, [searchParams])

  const [view, setView] = useState<'panels' | 'graph'>(
    initialView === 'graph' ? 'graph' : 'panels'
  )
  // Decision profile mode (PR11) — independent of ViewToggle panels/graph
  const [profileMode, setProfileMode] = useState<ProfileMode>(() => {
    const fromUrl = parseProfileMode(searchParams.get('mode'))
    if (fromUrl) return fromUrl
    return defaultProfileMode({
      fromDiscover: searchParams.get('from') === 'discover',
      hasProject: !!searchParams.get('project'),
      hasDisease: !!searchParams.get('disease'),
    })
  })
  const isDecisionMode = profileMode === 'decision'

  const [activeCategory, setActiveCategory] = useState<'all' | CategoryId>(() => {
    const preferDecision =
      parseProfileMode(searchParams.get('mode')) === 'decision' ||
      searchParams.get('from') === 'discover' ||
      !!searchParams.get('project') ||
      !!searchParams.get('disease')
    if (!initialTab) return preferDecision ? 'clinical-safety' : 'pharmaceutical'
    if (initialTab === 'all') return 'all'
    if (ALL_CATEGORY_IDS.includes(initialTab as CategoryId)) return initialTab as CategoryId
    return preferDecision ? 'clinical-safety' : 'pharmaceutical'
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryData, setCategoryData] = useState<CategoriesData>({})
  const [categoryStatus, setCategoryStatus] = useState<CategoriesStatus>(initStatus)
  const [categoryTraces, setCategoryTraces] = useState<Partial<Record<CategoryId, CategoryApiTrace>>>({})
  const categoryStatusRef = useRef(categoryStatus)
  categoryStatusRef.current = categoryStatus
  const [quickViewPanel, setQuickViewPanel] = useState<{ categoryId: CategoryId, panelId: string } | null>(null)
  const [fetchedAt, setFetchedAt] = useState<Partial<Record<CategoryId, Date>>>({})
  /** Category load error messages (durable honesty when fetch fails). */
  const [categoryErrors, setCategoryErrors] = useState<Partial<Record<CategoryId, string>>>({})
  const [hideEmpty, setHideEmpty] = useState(true)
  const [projectMeta, setProjectMeta] = useState<{
    projectName?: string
    scores: ScoreVector | null
    boardStatus?: string
  } | null>(null)

  const snapshotId = searchParams.get('snapshot')
  const forceRefresh =
    searchParams.get('refresh') === '1' || searchParams.get('refresh') === 'true'
  const [snapshotMeta, setSnapshotMeta] = useState<{ createdAt: string } | null>(null)
  const [snapshotError, setSnapshotError] = useState<string | null>(null)
  const refreshKickoff = useRef(false)
  /** Gate tiered loads until IDB L2 is promoted to L1 (avoids reopen storms). */
  const [cacheReady, setCacheReady] = useState(() => Boolean(isEmbed || forceRefresh || snapshotId))

  // Search history stores href only; payloads live in profileClientCache L1/L2.
  useEffect(() => {
    if (isEmbed) return
    recordSearch({
      kind: 'molecule',
      query: moleculeName,
      title: moleculeName,
      href: `/molecule/${cid}`,
      meta: { cid },
    })
  }, [cid, moleculeName, isEmbed])

  // Full-page busy only for cold loads (skeleton path) — not soft card refresh
  const isBusy = useMemo(() =>
    ALL_CATEGORY_IDS.some(id => categoryStatus[id] === 'loading'),
    [categoryStatus]
  )

  const showLoadingOverlay = useMemo(() =>
    ALL_CATEGORY_IDS.some(id => categoryStatus[id] === 'loading'),
    [categoryStatus]
  )

  // Build freshness map from current state
  const freshnessMap = useMemo(() => {
    const map = {} as FreshnessMap
    for (const id of ALL_CATEGORY_IDS) {
      const status = categoryStatus[id]
      map[id] = {
        status,
        fetchedAt: fetchedAt[id] ?? null,
        health: status === 'loaded' ? 'ok' : status === 'loading' ? 'loading' : status === 'error' ? 'error' : 'idle',
      }
    }
    return map
  }, [categoryStatus, fetchedAt])

  // Resolve sticky mode once on mount if URL did not pin it
  useEffect(() => {
    if (parseProfileMode(searchParams.get('mode'))) return
    const stored = loadStoredProfileMode()
    if (stored) setProfileMode(stored)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Analytics: decision mode open (M7) when landing in decision
  useEffect(() => {
    if (profileMode === 'decision') {
      emitProductEvent('decision_mode_open', {
        source: fromDiscover ? 'discover' : projectParam ? 'project' : 'default',
      })
    }
    // once on mount for initial mode only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Optional project board scores (localStorage, PR5 key) when ?project=
  useEffect(() => {
    if (!projectParam) {
      setProjectMeta(null)
      return
    }
    setProjectMeta(lookupProjectCandidateScores(projectParam, cid))
  }, [projectParam, cid])

  const handleProfileModeChange = useCallback((mode: ProfileMode) => {
    setProfileMode(mode)
    saveStoredProfileMode(mode)
    if (mode === 'decision') {
      emitProductEvent('decision_mode_open', { source: 'toggle' })
      if (view === 'graph') setView('panels')
    }
  }, [view])

  const scoreParam = searchParams.get('score')
  const scoresParam = searchParams.get('scores')

  useEffect(() => {
    if (isEmbed) return // embed iframes shouldn't churn the host URL
    const params = new URLSearchParams()
    // Preserve discovery / project deep-link context
    if (fromDiscover) params.set('from', 'discover')
    if (diseaseParam) params.set('disease', diseaseParam)
    if (projectParam) params.set('project', projectParam)
    if (rankParam > 0) params.set('rank', String(rankParam))
    if (scoreParam) params.set('score', scoreParam)
    if (scoresParam) params.set('scores', scoresParam)

    const defaultTab = isDecisionMode ? 'clinical-safety' : 'pharmaceutical'
    if (activeCategory !== defaultTab) params.set('tab', activeCategory)
    if (view !== 'panels') params.set('view', view)
    if (profileMode !== 'full') params.set('mode', profileMode)
    const search = params.toString()
    router.replace(search ? `?${search}` : '?', { scroll: false })
  }, [activeCategory, view, profileMode, router, isEmbed, isDecisionMode, fromDiscover, diseaseParam, projectParam, rankParam, scoreParam, scoresParam])



  const loadCategory = useCallback(async (catId: CategoryId, opts?: { force?: boolean; refresh?: boolean }) => {
    if (pendingRef.current.has(catId) && !opts?.force) return
    const cur = categoryStatusRef.current[catId]
    if (!opts?.force && !opts?.refresh && (cur === 'loaded' || cur === 'loading')) return
    const doRefresh = opts?.refresh || forceRefresh
    /**
     * Soft refresh: re-hit API while keeping status `loaded` so panels stay mounted.
     * Avoids skeleton collapse + scroll jump when user clicks “Refresh this card”.
     */
    const softRefresh = Boolean(doRefresh && cur === 'loaded')

    // Phase A.1: sync L1 hit → no loading flash / overlay
    if (!doRefresh) {
      const peeked = peekCategoryClientCache(cid, catId, apiOverrides, apiParams)
      if (peeked) {
        const peekedMarked = { ...peeked, _fromClientCache: true }
        setCategoryData(prev => ({ ...prev, [catId]: peekedMarked }))
        setCategoryStatus(prev => ({ ...prev, [catId]: 'loaded' }))
        setCategoryErrors(prev => {
          const next = { ...prev }
          delete next[catId]
          return next
        })
        // Keep original fetch stamp from cache payload (not “now”).
        setFetchedAt(prev => ({ ...prev, [catId]: resolveCategoryFetchedAt(peeked) }))
        const trace = peeked._apiTrace as CategoryApiTrace | undefined
        if (trace) setCategoryTraces((prev) => ({ ...prev, [catId]: trace }))
        return
      }
    }

    // Cancel any in-flight request for this category (force / soft-refresh / remount race)
    try {
      abortByCatRef.current[catId]?.abort()
    } catch {
      /* ignore */
    }
    const ac = new AbortController()
    abortByCatRef.current[catId] = ac

    // Bump generation so an older in-flight force/soft-refresh cannot overwrite a newer one.
    const gen = (loadGenRef.current[catId] ?? 0) + 1
    loadGenRef.current[catId] = gen
    pendingRef.current.add(catId)
    const scrollY =
      typeof window !== 'undefined' && softRefresh ? window.scrollY : null
    if (softRefresh) {
      softRefreshingRef.current.add(catId)
      setSoftRefreshTick((n) => n + 1)
    } else {
      setCategoryStatus(prev => ({ ...prev, [catId]: 'loading' }))
    }
    try {
      const data = await fetchCategoryData(cid, catId, apiOverrides, apiParams, {
        refresh: doRefresh,
        signal: ac.signal,
      })
      if (loadGenRef.current[catId] !== gen) return
      setCategoryData(prev => ({ ...prev, [catId]: data }))
      setCategoryStatus(prev => ({ ...prev, [catId]: 'loaded' }))
      setCategoryErrors(prev => {
        const next = { ...prev }
        delete next[catId]
        return next
      })
      setFetchedAt(prev => ({ ...prev, [catId]: resolveCategoryFetchedAt(data) }))
      const trace = (data as Record<string, unknown>)?._apiTrace as CategoryApiTrace | undefined
      if (trace) {
        setCategoryTraces((prev) => ({ ...prev, [catId]: trace }))
      }
    } catch (err) {
      if (loadGenRef.current[catId] !== gen) return
      // Aborted by a newer load — silent
      if (
        (err instanceof DOMException && err.name === 'AbortError') ||
        (err instanceof Error && err.name === 'AbortError')
      ) {
        return
      }
      const msg = err instanceof Error ? err.message : 'Failed to load category'
      // Soft refresh failure: keep previous data mounted; only surface error if we had no data
      if (!softRefresh) {
        setCategoryStatus(prev => ({ ...prev, [catId]: 'error' }))
        setCategoryErrors(prev => ({ ...prev, [catId]: msg }))
      } else {
        setCategoryErrors(prev => ({ ...prev, [catId]: msg }))
      }
    } finally {
      // Only the latest generation clears pending / soft-refresh UI
      if (loadGenRef.current[catId] === gen) {
        pendingRef.current.delete(catId)
        if (abortByCatRef.current[catId] === ac) {
          delete abortByCatRef.current[catId]
        }
        if (softRefresh) {
          softRefreshingRef.current.delete(catId)
          setSoftRefreshTick((n) => n + 1)
          if (scrollY != null && typeof window !== 'undefined') {
            // Restore exact viewport after any layout from data swap
            requestAnimationFrame(() => {
              window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' as ScrollBehavior })
            })
          }
        }
      }
    }
  }, [cid, apiOverrides, apiParams, forceRefresh])

  // Abort all in-flight category fetches on unmount (SPA leave / key remount)
  useEffect(() => {
    return () => {
      for (const id of Object.keys(abortByCatRef.current) as CategoryId[]) {
        try {
          abortByCatRef.current[id]?.abort()
        } catch {
          /* ignore */
        }
      }
      abortByCatRef.current = {}
    }
  }, [])

  // Phase B: hydrate IDB → L1 *before* tiered loads (perf + durability).
  useEffect(() => {
    if (isEmbed || snapshotId || forceRefresh) {
      setCacheReady(true)
      return
    }
    let cancelled = false
    setCacheReady(false)
    void hydrateProfileRevisitFromIdb(cid)
      .catch(() => 0)
      .then((n) => {
        if (cancelled) return
        logAgentActivity('profile.hydrate.done', { cid, promoted: n }, { source: 'profile' })
        setCacheReady(true)
        for (const id of ALL_CATEGORY_IDS) {
          if (categoryStatusRef.current[id] !== 'idle') continue
          if (peekCategoryClientCache(cid, id, apiOverrides, apiParams)) {
            void loadCategory(id)
          }
        }
      })
    return () => {
      cancelled = true
    }
  }, [cid, isEmbed, snapshotId, forceRefresh, apiOverrides, apiParams, loadCategory])

  const loadingCategories = useMemo(() => {
    const s = new Set<CategoryId>()
    for (const id of ALL_CATEGORY_IDS) {
      if (categoryStatus[id] === 'loading') s.add(id)
      if (softRefreshingRef.current.has(id)) s.add(id)
    }
    return s
    // softRefreshTick is intentional: soft-refresh mutates a ref, not categoryStatus
    // eslint-disable-next-line react-hooks/exhaustive-deps -- softRefreshTick drives spinner after soft refresh
  }, [categoryStatus, softRefreshTick])

  const panelContextValue = useMemo(
    () => ({
      cid,
      moleculeName,
      refreshCategory: (catId: CategoryId) => {
        // Soft in-place refresh — keep scroll and existing panels
        void loadCategory(catId, { force: true, refresh: true })
      },
      loadingCategories,
      categoryTraces,
      getCategoryForPanel: categoryForPanel,
    }),
    [cid, moleculeName, loadCategory, loadingCategories, categoryTraces],
  )

  // Sidebar "Refresh" → force re-query (bust client session + server process cache)
  useEffect(() => {
    if (!forceRefresh || isEmbed) return
    if (refreshKickoff.current) return
    refreshKickoff.current = true
    invalidateProfileClientCache(cid)
    pendingRef.current.clear()
    setCategoryStatus(initStatus())
    setCategoryData({})
    for (const id of ALL_CATEGORY_IDS) {
      void loadCategory(id, { force: true, refresh: true })
    }
    // Strip refresh params from URL so a normal reload doesn't re-force
    const next = new URLSearchParams(searchParams.toString())
    next.delete('refresh')
    next.delete('_t')
    const qs = next.toString()
    router.replace(qs ? `?${qs}` : '?', { scroll: false })
    // cid is covered by loadCategory / forceRefresh remount key on ProfilePageClient
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh kickoff once per forceRefresh flag
  }, [forceRefresh, isEmbed, loadCategory, router, searchParams])

  /**
   * Scroll so the category section title sits just below sticky chrome
   * (app header + profile tab bar). Using raw scrollIntoView(block:start)
   * lands content under the sticky bar → “wrong place”.
   */
  const scrollToCategoryElement = useCallback((catId: CategoryId) => {
    const el =
      document.getElementById(`category-section-${catId}`) ||
      document.getElementById(catId)
    if (!el) return false
    const chrome = document.querySelector<HTMLElement>('[data-profile-sticky-chrome]')
    const offset = (chrome?.getBoundingClientRect().height ?? 96) + 12
    const top = el.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    // Brief highlight so the matched title is obvious
    el.classList.add('ring-1', 'ring-indigo-500/40', 'rounded-lg')
    window.setTimeout(() => {
      el.classList.remove('ring-1', 'ring-indigo-500/40', 'rounded-lg')
    }, 1600)
    return true
  }, [])

  // Tab click → panels view + correct category section (by matching CategoryDef.id / label)
  const scrollToCategory = useCallback(
    (catId: CategoryId | 'all') => {
      setView('panels')
      if (catId === 'all') {
        setActiveCategory('all')
        // Top of panel list (below sticky chrome)
        const root = document.getElementById('profile-category-list')
        if (root) {
          const chrome = document.querySelector<HTMLElement>('[data-profile-sticky-chrome]')
          const offset = (chrome?.getBoundingClientRect().height ?? 96) + 12
          const top = root.getBoundingClientRect().top + window.scrollY - offset
          window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
        }
        return
      }
      setActiveCategory(catId)
      if (categoryStatusRef.current[catId] === 'idle') {
        void loadCategory(catId)
      }
    },
    [loadCategory],
  )

  /**
   * Scroll target for the focused tab exactly once per (cid, category) focus.
   * Avoids double smooth-scroll (mount effect + loaded effect) which felt jumpy.
   */
  const scrolledForTabRef = useRef<string | null>(null)
  useEffect(() => {
    scrolledForTabRef.current = null
  }, [cid])

  useEffect(() => {
    if (activeCategory === 'all' || isEmbed) return
    const key = `${cid}:${activeCategory}`
    if (scrolledForTabRef.current === key) return

    let attempts = 0
    let cancelled = false
    let timer: number | undefined
    const tryScroll = () => {
      if (cancelled) return
      if (scrollToCategoryElement(activeCategory)) {
        scrolledForTabRef.current = key
        return
      }
      // Wait for section mount; once category is loaded, give more chances for layout
      const loaded = categoryStatusRef.current[activeCategory] === 'loaded'
      const maxAttempts = loaded ? 12 : 40
      if (attempts++ < maxAttempts) timer = window.setTimeout(tryScroll, 50)
    }
    timer = window.setTimeout(tryScroll, 40)
    return () => {
      cancelled = true
      if (timer != null) window.clearTimeout(timer)
    }
  }, [activeCategory, isEmbed, scrollToCategoryElement, cid, categoryStatus])

  /** Scroll to a panel anchor (hash deep-link from board signal badges). */
  const scrollToPanel = useCallback((panelId: string) => {
    setView('panels')
    const cat = CATEGORIES.find((c) => c.panels.some((p) => p.id === panelId))
    if (cat && cat.id !== 'gene') {
      setActiveCategory(cat.id as CategoryId)
      if (categoryStatusRef.current[cat.id as CategoryId] === 'idle') {
        loadCategory(cat.id as CategoryId)
      }
    }
    let attempts = 0
    const tryScroll = () => {
      const el = document.getElementById(panelId)
      if (el) {
        const chrome = document.querySelector<HTMLElement>('[data-profile-sticky-chrome]')
        const offset = (chrome?.getBoundingClientRect().height ?? 96) + 12
        const top = el.getBoundingClientRect().top + window.scrollY - offset
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
        el.classList.add('ring-2', 'ring-amber-400/60', 'ring-offset-2', 'ring-offset-[#0f1117]')
        window.setTimeout(() => {
          el.classList.remove('ring-2', 'ring-amber-400/60', 'ring-offset-2', 'ring-offset-[#0f1117]')
        }, 2200)
        return
      }
      if (attempts++ < 40) {
        window.setTimeout(tryScroll, 150)
      }
    }
    requestAnimationFrame(tryScroll)
  }, [loadCategory])

  // Deep-link: /molecule/{cid}?tab=category&panel=id#panel-id from board signal badges
  useEffect(() => {
    if (typeof window === 'undefined' || isEmbed) return
    const fromHash = panelIdFromHash(window.location.hash)
    const fromQuery = searchParams.get('panel')?.trim() || null
    const panelId = fromHash || fromQuery
    if (!panelId) return
    scrollToPanel(panelId)
  }, [scrollToPanel, isEmbed, searchParams])

  // Re-attempt scroll when the target category finishes loading (hash / ?panel= still present)
  useEffect(() => {
    if (typeof window === 'undefined' || isEmbed) return
    const fromHash = panelIdFromHash(window.location.hash)
    const fromQuery = searchParams.get('panel')?.trim() || null
    const panelId = fromHash || fromQuery
    if (!panelId) return
    const cat = CATEGORIES.find((c) => c.panels.some((p) => p.id === panelId))
    if (!cat || cat.id === 'gene') return
    if (categoryStatus[cat.id as CategoryId] === 'loaded') {
      requestAnimationFrame(() => {
        scrollToPanel(panelId)
      })
    }
  }, [categoryStatus, isEmbed, searchParams, scrollToPanel])

  // Auto-load the active category when it changes (incl. decision-mode deep links
  // like ?tab=interactions-pathways — outside Core six first-paint set)
  useEffect(() => {
    if (!cacheReady || activeCategory === 'all') return
    if (categoryStatusRef.current[activeCategory] === 'idle') {
      void loadCategory(activeCategory)
    }
  }, [activeCategory, loadCategory, cacheReady])

  // Snapshot mode: short-circuit live fetching with frozen data
  useEffect(() => {
    if (!snapshotId) return
    let cancelled = false
    fetch(`/api/snapshot/${snapshotId}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(snap => {
        if (cancelled) return
        setCategoryData({ pharmaceutical: snap.data })
        const allLoaded = {} as CategoriesStatus
        for (const id of ALL_CATEGORY_IDS) allLoaded[id] = 'loaded'
        setCategoryStatus(allLoaded)
        setFetchedAt({ pharmaceutical: new Date(snap.createdAt) })
        setSnapshotMeta({ createdAt: snap.createdAt })
      })
      .catch(() => {
        if (!cancelled) setSnapshotError('Snapshot not found or expired (snapshots have a 30-day TTL).')
      })
    return () => { cancelled = true }
  }, [snapshotId])

  // Cold-open perf: paint active tab first, then stagger remaining tiers.
  // Wait for cacheReady so IDB hits win before network.
  useEffect(() => {
    if (snapshotId || !cacheReady) return
    let cancelled = false

    // 1) Active category (or decision default) immediately
    const first: CategoryId =
      activeCategory !== 'all' && ALL_CATEGORY_IDS.includes(activeCategory as CategoryId)
        ? (activeCategory as CategoryId)
        : isDecisionMode
          ? 'clinical-safety'
          : 'pharmaceutical'
    void loadCategory(first)

    // 2) Rest of first-paint set after a short yield (reduces concurrent free-API storm)
    const rest: CategoryId[] = isDecisionMode
      ? DECISION_CATEGORY_IDS.filter((id) => id !== first)
      : TIER1_CATEGORIES.filter((id) => id !== first)

    const t1 = window.setTimeout(() => {
      if (cancelled) return
      for (const id of rest) void loadCategory(id)
    }, 120)

    // 3) Tier-2 after further delay (full mode only)
    const t2 = window.setTimeout(() => {
      if (cancelled || isDecisionMode) return
      for (const id of TIER2_CATEGORIES) void loadCategory(id)
    }, 900)

    return () => {
      cancelled = true
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [loadCategory, snapshotId, isDecisionMode, cacheReady, activeCategory]) // eslint-disable-line react-hooks/exhaustive-deps

  // When arriving from discover (any mode), ensure decision categories are in flight (staggered)
  const discoverLoadedRef = useRef(false)
  useEffect(() => {
    discoverLoadedRef.current = false
  }, [cid])
  useEffect(() => {
    if (!fromDiscover || !cacheReady || discoverLoadedRef.current) return
    discoverLoadedRef.current = true
    const priorityCategories: CategoryId[] = [
      ...DECISION_CATEGORY_IDS,
      ...TIER1_CATEGORIES.filter((id) => !DECISION_CATEGORY_IDS.includes(id)),
    ]
    let i = 0
    let cancelled = false
    let timer: number | undefined
    const tick = () => {
      if (cancelled || i >= priorityCategories.length) return
      void loadCategory(priorityCategories[i]!)
      i += 1
      if (i < priorityCategories.length) timer = window.setTimeout(tick, 80)
    }
    tick()
    return () => {
      cancelled = true
      if (timer != null) window.clearTimeout(timer)
    }
  }, [fromDiscover, loadCategory, cacheReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // When hideEmpty is toggled on, load remaining idle categories so we can evaluate them
  // In decision mode only evaluate decision categories until user switches to full
  useEffect(() => {
    if (!hideEmpty) return
    const ids = isDecisionMode ? DECISION_CATEGORY_IDS : ALL_CATEGORY_IDS
    for (const id of ids) {
      if (categoryStatusRef.current[id] === 'idle') loadCategory(id)
    }
  }, [hideEmpty, loadCategory, isDecisionMode])

  // Background pre-fetch after first-paint tiers ready
  const pharmaceuticalLoaded = categoryStatus['pharmaceutical'] === 'loaded'
  const tier1Ready = TIER1_CATEGORIES.every(
    (id) => categoryStatus[id] === 'loaded' || categoryStatus[id] === 'error',
  )
  const decisionReady = decisionCategoriesReady(categoryStatus)

  useEffect(() => {
    if (pharmaceuticalLoaded) {
      const merged: Record<string, unknown> = {}
      for (const catId of Object.keys(categoryData) as CategoryId[]) {
        const catData = categoryData[catId]
        if (catData) Object.assign(merged, catData)
      }
      sessionHistory.addMolecule(moleculeName, merged)
    }
  }, [pharmaceuticalLoaded, categoryData, moleculeName])

  useEffect(() => {
    // Full mode: prefetch after Tier-1.
    // Decision mode: after Core six are ready, soft-prefetch remaining categories
    // (genomics, NIH high-impact, interactions, …) so tab counts match viewable panels.
    if (isDecisionMode) {
      if (!decisionReady || !cacheReady) return
      const rest = ALL_CATEGORY_IDS.filter((id) => !DECISION_CATEGORY_IDS.includes(id))
      const queue = rest.filter((id) => categoryStatusRef.current[id] === 'idle')
      if (queue.length === 0) return
      let cancelled = false
      let i = 0
      const tick = () => {
        if (cancelled || i >= queue.length) return
        const catId = queue[i++]
        if (catId && categoryStatusRef.current[catId] === 'idle') {
          void loadCategory(catId)
        }
        if (i < queue.length) window.setTimeout(tick, 220)
      }
      const t = window.setTimeout(tick, 400)
      return () => {
        cancelled = true
        window.clearTimeout(t)
      }
    }
    if (!tier1Ready) return

    const prefetchOrder: CategoryId[] = [...TIER2_CATEGORIES, ...TIER3_CATEGORIES]
    const PREFETCH_CONCURRENCY = 2

    let cancelled = false
    async function prefetchWithConcurrency() {
      const queue = prefetchOrder.filter((id) => categoryStatusRef.current[id] === 'idle')
      const workers = Array.from({ length: PREFETCH_CONCURRENCY }, async () => {
        while (queue.length > 0 && !cancelled) {
          const catId = queue.shift()
          if (!catId) break
          if (categoryStatusRef.current[catId] !== 'idle') continue
          await loadCategory(catId)
        }
      })
      await Promise.all(workers)
    }

    const timer = setTimeout(prefetchWithConcurrency, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [tier1Ready, decisionReady, isDecisionMode, loadCategory, cacheReady])

  // Merge all loaded data into a single props-like object for summary/export/counts
  const mergedData = useMemo(() => {
    const merged: Record<string, unknown> = { molecularWeight }
    for (const catId of ALL_CATEGORY_IDS) {
      const data = categoryData[catId]
      if (data) Object.assign(merged, data)
    }
    return merged
  }, [categoryData, molecularWeight])

  const dataCounts = useMemo(() => getCategoryDataCounts(mergedData), [mergedData])
  const summaryData = useMemo(() => computeMoleculeSummary(mergedData), [mergedData])
  const moleculeCrossSource = useMemo(
    () =>
      buildMoleculeCrossSource(String(cid), moleculeName, mergedData as Record<string, unknown>),
    [cid, moleculeName, mergedData],
  )
  const moleculeDataHub = useMemo(
    () =>
      buildMoleculeDataHub(
        {
          cid,
          name: moleculeName,
          molecularWeight,
          inchiKey,
          iupacName,
          cas,
          synonyms,
          formula:
            formula ||
            (typeof (mergedData as { formula?: string }).formula === 'string'
              ? (mergedData as { formula?: string }).formula
              : null),
        },
        mergedData as Record<string, unknown>,
      ),
    [cid, moleculeName, molecularWeight, formula, inchiKey, iupacName, cas, synonyms, mergedData],
  )

  // Decision strip: scores (project > scores JSON > score composite) + claims from Core extractors
  const urlScores = useMemo(
    () =>
      scoreVectorFromSearchParams({
        score: searchParams.get('score'),
        scores: searchParams.get('scores'),
      }),
    [searchParams],
  )
  const stripScores: ScoreVector | null = projectMeta?.scores ?? urlScores
  const stripClaims = useMemo(() => {
    if (!decisionReady) return []
    const latestFetch = DECISION_CATEGORY_IDS.reduce<Date | null>((acc, id) => {
      const d = fetchedAt[id]
      if (!d) return acc
      if (!acc || d > acc) return d
      return acc
    }, null)
    return extractDecisionStripClaims(mergedData, {
      retrievedAt: (latestFetch ?? new Date()).toISOString(),
      moleculeName,
      subjectCandidateId: `cid:${cid}`,
      totalCap: 12,
    })
  }, [decisionReady, mergedData, moleculeName, cid, fetchedAt])
  const stripClaimsLoading = decisionCategoriesLoading(categoryStatus) || (!decisionReady && isDecisionMode)

  const loadDecisionCategories = useCallback(() => {
    for (const id of DECISION_CATEGORY_IDS) {
      const st = categoryStatusRef.current[id]
      if (st === 'idle') void loadCategory(id)
      else if (st === 'error' || st === 'loaded') void loadCategory(id, { force: true })
    }
  }, [loadCategory])

  // Change detection state (effect runs after allLoaded is defined below)
  const [detectedChanges, setDetectedChanges] = useState<ChangeItem[]>([])
  const [snapshotSaved, setSnapshotSaved] = useState(false)

  // Stable empty array reference to prevent unnecessary re-renders
  const emptyArray = useMemo(() => [], [])

  // Get data for a specific prop key, defaulting to empty
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = useCallback((key: string): any => {
    const value = mergedData[key]
    if (value !== undefined && value !== null) return value
    // Return null for nullable props, empty array for array props
    return key === 'computedProperties' || key === 'ghsHazards' || key === 'chebiAnnotation' || key === 'compToxData' ? null : emptyArray
  }, [mergedData, emptyArray])

  // Build panel registry from loaded data - memoized to prevent recreation
  const panelRegistry = useMemo(() => {
    return {
      'companies': (panelId: string, lastFetched?: Date) => <LazyPanels.LazyCompaniesPanel companies={d('companies')} panelId={panelId} lastFetched={lastFetched} />,
      'ndc': (panelId, lastFetched) => <LazyPanels.LazyNdcPanel products={d('ndcProducts')} panelId={panelId} lastFetched={lastFetched} />,
      'orange-book': (panelId, lastFetched) => <LazyPanels.LazyOrangeBookPanel entries={d('orangeBookEntries')} panelId={panelId} lastFetched={lastFetched} />,
      'health-canada': (panelId, lastFetched) => (
        <LazyPanels.LazyHealthCanadaDpdPanel
          products={d('healthCanadaProducts')}
          panelId={panelId}
          lastFetched={lastFetched}
        />
      ),
      'ema-medicines': (panelId, lastFetched) => (
        <LazyPanels.LazyEmaMedicinesPanel
          medicines={d('emaMedicines')}
          panelId={panelId}
          lastFetched={lastFetched}
        />
      ),
      'biologics-licensed': (panelId, lastFetched) => (
        <LazyPanels.LazyBiologicsLicensedPanel
          products={d('biologicsLicensed')}
          panelId={panelId}
          lastFetched={lastFetched}
        />
      ),
      'biosimilar-family': (panelId, lastFetched) => (
        <LazyPanels.LazyBiosimilarFamilyNavigator
          moleculeName={moleculeName}
          purpleBookProducts={d('purpleBookProducts')}
          biologicsLicensed={d('biologicsLicensed')}
          purpleBookPatents={d('purpleBookPatents')}
          emaBulkMedicines={d('emaBulkMedicines')}
          panelId={panelId}
          lastFetched={lastFetched}
        />
      ),
      'purple-book': (panelId, lastFetched) => (
        <LazyPanels.LazyPurpleBookPanel
          products={d('purpleBookProducts')}
          sourceMonth={
            (d('purpleBookMeta') as { sourceMonth?: string } | null | undefined)?.sourceMonth
          }
          panelId={panelId}
          lastFetched={lastFetched}
        />
      ),
      'purple-book-patents': (panelId, lastFetched) => (
        <LazyPanels.LazyPurpleBookPatentsPanel
          patents={d('purpleBookPatents')}
          panelId={panelId}
          lastFetched={lastFetched}
        />
      ),
      'ema-bulk': (panelId, lastFetched) => (
        <LazyPanels.LazyEmaBulkMedicinesPanel
          products={d('emaBulkMedicines')}
          panelId={panelId}
          lastFetched={lastFetched}
        />
      ),
      'establishment-links': (panelId, lastFetched) => (
        <LazyPanels.LazyEstablishmentLinksPanel
          firmHint={
            (d('establishmentFirmHint') as string | undefined) ||
            moleculeName ||
            ''
          }
          panelId={panelId}
          lastFetched={lastFetched}
        />
      ),
      'international-regulators': (panelId, lastFetched) => (
        <LazyPanels.LazyInternationalRegulatorsPanel
          moleculeName={moleculeName}
          panelId={panelId}
          lastFetched={lastFetched}
        />
      ),
      'nadac': (panelId, lastFetched) => <LazyPanels.LazyNadacPanel prices={d('drugPrices')} panelId={panelId} lastFetched={lastFetched} />,
      'drug-interactions': (panelId, lastFetched) => <LazyPanels.LazyDrugInteractionsPanel interactions={d('drugInteractions')} panelId={panelId} lastFetched={lastFetched} />,
      'dailymed': (panelId, lastFetched) => <LazyPanels.LazyDailyMedPanel labels={d('drugLabels')} panelId={panelId} lastFetched={lastFetched} />,
      'drugs-fda': (panelId, lastFetched) => (
        <LazyPanels.LazyDrugsFdaPanel
          applications={d('drugsFdaApplications')}
          panelId={panelId}
          lastFetched={lastFetched}
        />
      ),
      'openfda-labels': (panelId, lastFetched) => (
        <LazyPanels.LazyOpenFdaLabelSectionsPanel
          labels={d('openFdaLabelSections')}
          panelId={panelId}
          lastFetched={lastFetched}
        />
      ),
      'atc': (panelId, lastFetched) => <LazyPanels.LazyAtcPanel classifications={d('atcClassifications')} panelId={panelId} lastFetched={lastFetched} />,
      'clinical-trials': (panelId, lastFetched) => <LazyPanels.LazyClinicalTrialsPanel trials={d('clinicalTrials')} panelId={panelId} lastFetched={lastFetched} diseaseName={searchParams.get('disease') ?? undefined} />,
      'research-orgs': (panelId, lastFetched) => (
        <LazyPanels.LazyResearchOrgsPanel
          orgs={d('researchOrgs')}
          panelId={panelId}
          lastFetched={lastFetched}
        />
      ),
      'us-hospitals': (panelId, lastFetched) => (
        <LazyPanels.LazyUsHospitalsPanel
          hospitals={d('usHospitals')}
          panelId={panelId}
          lastFetched={lastFetched}
        />
      ),
      'evidence-neighborhood': (panelId, lastFetched) => (
        <LazyPanels.LazyEvidenceNeighborhoodMap
          moleculeName={moleculeName}
          clinicalTrials={d('clinicalTrials')}
          researchOrgs={d('researchOrgs')}
          researchOrgsLit={d('researchOrgsLit')}
          euResearchOrgs={d('euResearchOrgs')}
          usHospitals={d('usHospitals')}
          usColleges={d('usColleges')}
          nihGrants={d('nihGrants')}
          literature={d('literature')}
          pubmedArticles={d('pubmedArticles')}
          openAlexWorks={d('openAlexWorks')}
          panelId={panelId}
          lastFetched={lastFetched}
        />
      ),
      'adverse-events': (panelId, lastFetched) => <LazyPanels.LazyAdverseEventsPanel adverseEvents={d('adverseEvents')} panelId={panelId} lastFetched={lastFetched} moleculeName={moleculeName} />,
      'recalls': (panelId, lastFetched) => <LazyPanels.LazyRecallsPanel recalls={d('drugRecalls')} panelId={panelId} lastFetched={lastFetched} />,
      'chembl-indications': (panelId, lastFetched) => <LazyPanels.LazyChemblIndicationsPanel indications={d('chemblIndications')} panelId={panelId} lastFetched={lastFetched} diseaseName={searchParams.get('disease') ?? undefined} />,
      'clinvar': (panelId, lastFetched) => <LazyPanels.LazyClinVarPanel variants={d('clinVarVariants')} panelId={panelId} lastFetched={lastFetched} />,
      'gwas': (panelId, lastFetched) => <LazyPanels.LazyGwasCatalogPanel associations={d('gwasAssociations')} panelId={panelId} lastFetched={lastFetched} />,
      'properties': (panelId, lastFetched) => <LazyPanels.LazyPropertiesPanel properties={d('computedProperties')} molecularWeight={molecularWeight} panelId={panelId} lastFetched={lastFetched} />,
      'hazards': (panelId, lastFetched) => <LazyPanels.LazyHazardsPanel hazards={d('ghsHazards')} panelId={panelId} lastFetched={lastFetched} />,
      'chebi': (panelId, lastFetched) => <LazyPanels.LazyChebiPanel annotation={d('chebiAnnotation')} panelId={panelId} lastFetched={lastFetched} />,
      'comptox': (panelId, lastFetched) => <LazyPanels.LazyCompToxPanel data={d('compToxData')} panelId={panelId} lastFetched={lastFetched} />,
      'synthesis': (panelId, lastFetched) => <LazyPanels.LazySynthesisPanel routes={d('routes')} panelId={panelId} lastFetched={lastFetched} />,
      'chembl': (panelId, lastFetched) => <LazyPanels.LazyChemblPanel activities={d('chemblActivities')} panelId={panelId} lastFetched={lastFetched} />,
      'bioassay': (panelId, lastFetched) => <LazyPanels.LazyBioAssayPanel assays={d('bioAssays')} panelId={panelId} lastFetched={lastFetched} />,
      'chembl-mechanisms': (panelId, lastFetched) => <LazyPanels.LazyChemblMechanismsPanel mechanisms={d('chemblMechanisms')} panelId={panelId} lastFetched={lastFetched} />,
      'iuphar': (panelId, lastFetched) => <LazyPanels.LazyIupharPanel targets={d('pharmacologyTargets')} panelId={panelId} lastFetched={lastFetched} />,
      'bindingdb': (panelId, lastFetched) => <LazyPanels.LazyBindingDbPanel affinities={d('bindingAffinities')} panelId={panelId} lastFetched={lastFetched} />,
      'pharos': (panelId, lastFetched) => <LazyPanels.LazyPharosPanel targets={d('pharosTargets')} panelId={panelId} lastFetched={lastFetched} />,
      'dgidb': (panelId, lastFetched) => <LazyPanels.LazyDgidbPanel interactions={d('drugGeneInteractions')} panelId={panelId} lastFetched={lastFetched} />,
      'opentargets': (panelId, lastFetched) => <LazyPanels.LazyOpenTargetsPanel diseases={d('diseaseAssociations')} panelId={panelId} lastFetched={lastFetched} />,
      'uniprot': (panelId, lastFetched) => <LazyPanels.LazyUniprotPanel entries={d('uniprotEntries')} panelId={panelId} lastFetched={lastFetched} />,
      'interpro': (panelId, lastFetched) => <LazyPanels.LazyInterProPanel domains={d('proteinDomains')} panelId={panelId} lastFetched={lastFetched} />,
      'ebi-proteins': (panelId, lastFetched) => <LazyPanels.LazyEbiProteinsPanel variations={d('ebiProteinVariations')} proteomics={d('ebiProteomicsData')} crossReferences={d('ebiCrossReferences')} panelId={panelId} lastFetched={lastFetched} />,
      'ebi-crossrefs': (panelId, lastFetched) => <LazyPanels.LazyEbiCrossRefsPanel data={d('ebiCrossReferences')} panelId={panelId} lastFetched={lastFetched} />,
      'protein-atlas': (panelId, lastFetched) => <LazyPanels.LazyProteinAtlasPanel entries={d('proteinAtlasEntries')} panelId={panelId} lastFetched={lastFetched} />,
      'quickgo': (panelId, lastFetched) => <LazyPanels.LazyQuickGoPanel annotations={d('goAnnotations')} panelId={panelId} lastFetched={lastFetched} />,
      'pdb': (panelId, lastFetched) => <LazyPanels.LazyPdbPanel structures={d('pdbStructures')} panelId={panelId} lastFetched={lastFetched} />,
      'pdbe-ligands': (panelId, lastFetched) => <LazyPanels.LazyPdbeLigandsPanel ligands={d('pdbeLigands')} panelId={panelId} lastFetched={lastFetched} />,
      'alphafold': (panelId, lastFetched) => <LazyPanels.LazyAlphaFoldPanel predictions={d('alphaFoldPredictions')} panelId={panelId} lastFetched={lastFetched} />,
      'gene-info': (panelId, lastFetched) => <LazyPanels.LazyGeneInfoPanel genes={d('geneInfo')} panelId={panelId} lastFetched={lastFetched} />,
      'ensembl': (panelId, lastFetched) => <LazyPanels.LazyEnsemblPanel genes={d('ensemblGenes')} panelId={panelId} lastFetched={lastFetched} />,
      'expression-atlas': (panelId, lastFetched) => <LazyPanels.LazyExpressionAtlasPanel expressions={d('geneExpressions')} panelId={panelId} lastFetched={lastFetched} />,
      'monarch': (panelId, lastFetched) => <LazyPanels.LazyMonarchPanel diseases={d('monarchDiseases')} panelId={panelId} lastFetched={lastFetched} />,
      'nci-thesaurus': (panelId, lastFetched) => <LazyPanels.LazyNciThesaurusPanel concepts={d('nciConcepts')} panelId={panelId} lastFetched={lastFetched} />,
      'mesh': (panelId, lastFetched) => <LazyPanels.LazyMeshPanel terms={d('meshTerms')} panelId={panelId} lastFetched={lastFetched} />,
      'string': (panelId, lastFetched) => <LazyPanels.LazyStringPanel interactions={d('proteinInteractions')} panelId={panelId} lastFetched={lastFetched} />,
      'stitch': (panelId, lastFetched) => <LazyPanels.LazyStitchPanel interactions={d('chemicalProteinInteractions')} panelId={panelId} lastFetched={lastFetched} />,
      'intact': (panelId, lastFetched) => <LazyPanels.LazyIntActPanel interactions={d('molecularInteractions')} panelId={panelId} lastFetched={lastFetched} />,
      'reactome': (panelId, lastFetched) => <LazyPanels.LazyReactomePanel pathways={d('reactomePathways')} moleculeName={moleculeName} panelId={panelId} lastFetched={lastFetched} />,
      'wikipathways': (panelId, lastFetched) => <LazyPanels.LazyWikiPathwaysPanel pathways={d('wikiPathways')} panelId={panelId} lastFetched={lastFetched} />,
      'pathway-commons': (panelId, lastFetched) => <LazyPanels.LazyPathwayCommonsPanel results={d('pathwayCommonsResults')} panelId={panelId} lastFetched={lastFetched} />,
      'nih-reporter': (panelId, lastFetched) => <LazyPanels.LazyNihReporterPanel grants={d('nihGrants')} panelId={panelId} lastFetched={lastFetched} />,
      'nsf-awards': (panelId, lastFetched) => (
        <LazyPanels.LazyNsfAwardsPanel
          awards={d('nsfAwards')}
          panelId={panelId}
          lastFetched={lastFetched}
        />
      ),
      'research-orgs-lit': (panelId, lastFetched) => (
        <LazyPanels.LazyResearchOrgsPanel
          orgs={d('researchOrgsLit')}
          panelId={panelId}
          lastFetched={lastFetched}
        />
      ),
      'eu-research-orgs': (panelId, lastFetched) => (
        <LazyPanels.LazyResearchOrgsPanel
          orgs={d('euResearchOrgs')}
          panelId={panelId}
          lastFetched={lastFetched}
        />
      ),
      'us-colleges': (panelId, lastFetched) => (
        <LazyPanels.LazyUsCollegesPanel
          colleges={d('usColleges')}
          panelId={panelId}
          lastFetched={lastFetched}
        />
      ),
      'openaire-projects': (panelId, lastFetched) => (
        <LazyPanels.LazyOpenAireProjectsPanel
          projects={d('openAireProjects')}
          panelId={panelId}
          lastFetched={lastFetched}
        />
      ),
      'openaire-publications': (panelId, lastFetched) => (
        <LazyPanels.LazyOpenAirePublicationsPanel
          publications={d('openAirePublications')}
          panelId={panelId}
          lastFetched={lastFetched}
        />
      ),
      'patents': (panelId, lastFetched) => <LazyPanels.LazyPatentsPanel patents={d('patents')} panelId={panelId} lastFetched={lastFetched} />,
      'sec': (panelId, lastFetched) => <LazyPanels.LazySecEdgarPanel filings={d('secFilings')} panelId={panelId} lastFetched={lastFetched} />,
      'literature': (panelId, lastFetched) => <LazyPanels.LazyLiteraturePanel results={d('literature')} panelId={panelId} lastFetched={lastFetched} />,
      'pubmed': (panelId, lastFetched) => <LazyPanels.LazyPubMedPanel articles={d('pubmedArticles')} panelId={panelId} lastFetched={lastFetched} />,
      'semantic-scholar': (panelId, lastFetched) => <LazyPanels.LazySemanticScholarPanel papers={d('semanticPapers')} panelId={panelId} lastFetched={lastFetched} />,
      'open-alex': (panelId, lastFetched) => <LazyPanels.LazyOpenAlexPanel works={d('openAlexWorks')} panelId={panelId} lastFetched={lastFetched} />,
      'open-citations': (panelId, lastFetched) => <LazyPanels.LazyOpenCitationsPanel metrics={d('citationMetrics')} panelId={panelId} lastFetched={lastFetched} />,
      'drugcentral': (panelId, lastFetched) => <LazyPanels.LazyDrugCentralPanel data={d('drugCentralEnhanced')} panelId={panelId} lastFetched={lastFetched} />,
      'metabolomics': (panelId, lastFetched) => <LazyPanels.LazyMetabolomicsPanel data={d('metabolomicsData')} panelId={panelId} lastFetched={lastFetched} />,
      'toxcast': (panelId, lastFetched) => <LazyPanels.LazyToxCastPanel data={d('toxcast')} panelId={panelId} lastFetched={lastFetched} />,
      'disgenet': (panelId, lastFetched) => <LazyPanels.LazyDisGeNETPanel associations={d('disgenetAssociations')} panelId={panelId} lastFetched={lastFetched} />,
      'orphanet': (panelId, lastFetched) => <LazyPanels.LazyOrphanetPanel diseases={d('orphanetDiseases')} panelId={panelId} lastFetched={lastFetched} />,
      'mychem': (panelId, lastFetched) => <LazyPanels.LazyMyChemPanel chemicals={d('myChemAnnotations')} panelId={panelId} lastFetched={lastFetched} />,
      'mygene': (panelId, lastFetched) => <LazyPanels.LazyMyGenePanel genes={d('myGeneAnnotations')} panelId={panelId} lastFetched={lastFetched} />,
      'bgee': (panelId, lastFetched) => <LazyPanels.LazyBgeePanel expressions={d('bgeeExpressions')} panelId={panelId} lastFetched={lastFetched} />,
      'ctd': (panelId, lastFetched) => <LazyPanels.LazyCTDPanel interactions={d('ctdInteractions')} diseaseAssociations={d('ctdDiseaseAssociations')} panelId={panelId} lastFetched={lastFetched} />,
      'ctd-diseases': (panelId, lastFetched) => <LazyPanels.LazyCTDPanel interactions={d('ctdInteractions')} diseaseAssociations={d('ctdDiseaseAssociations')} panelId={panelId} lastFetched={lastFetched} />,
      'hmdb': (panelId, lastFetched) => <LazyPanels.LazyHMDBPanel metabolites={d('hmdbMetabolites')} panelId={panelId} lastFetched={lastFetched} />,
      'sider': (panelId, lastFetched) => <LazyPanels.LazySIDERPanel sideEffects={d('siderSideEffects')} panelId={panelId} lastFetched={lastFetched} />,
      'omim': (panelId, lastFetched) => <LazyPanels.LazyOMIMPanel entries={d('omimEntries')} panelId={panelId} lastFetched={lastFetched} />,
      'iedb': (panelId, lastFetched) => <LazyPanels.LazyIEDBPanel epitopes={d('iedbEpitopes')} panelId={panelId} lastFetched={lastFetched} />,
      'peptideatlas': (panelId, lastFetched) => <LazyPanels.LazyPeptideAtlasPanel peptides={d('peptideAtlasEntries')} panelId={panelId} lastFetched={lastFetched} />,
      // New API panels
      'geo': (panelId, lastFetched) => <LazyPanels.LazyGEOPanel datasets={d('geoDatasets')} panelId={panelId} lastFetched={lastFetched} />,
      'dbsnp': (panelId, lastFetched) => <LazyPanels.LazyDbSNPPanel variants={d('dbSnpVariants')} panelId={panelId} lastFetched={lastFetched} />,
      'clingen': (panelId, lastFetched) => <LazyPanels.LazyClinGenPanel data={d('clinGenData')} panelId={panelId} lastFetched={lastFetched} />,
      'medgen': (panelId, lastFetched) => <LazyPanels.LazyMedGenPanel concepts={d('medGenConcepts')} panelId={panelId} lastFetched={lastFetched} />,
      'pride': (panelId, lastFetched) => <LazyPanels.LazyPRIDEPanel projects={d('prideProjects')} panelId={panelId} lastFetched={lastFetched} />,
      'massbank': (panelId, lastFetched) => <LazyPanels.LazyMassBankPanel spectra={d('massBankSpectra')} panelId={panelId} lastFetched={lastFetched} />,
      'biocyc': (panelId, lastFetched) => <LazyPanels.LazyBioCycPanel pathways={d('bioCycPathways')} panelId={panelId} lastFetched={lastFetched} />,
      'smpdb': (panelId, lastFetched) => <LazyPanels.LazySMPDBPanel pathways={d('smpdbPathways')} panelId={panelId} lastFetched={lastFetched} />,
      'crossref': (panelId, lastFetched) => <LazyPanels.LazyCrossRefPanel works={d('crossRefWorks')} panelId={panelId} lastFetched={lastFetched} />,
      'arxiv': (panelId, lastFetched) => <LazyPanels.LazyArXivPanel papers={d('arxivPapers')} panelId={panelId} lastFetched={lastFetched} />,
      // Tier 1 API panels

      'pharmgkb': (panelId, lastFetched) => <LazyPanels.LazyPharmGKBPanel drugs={d('pharmgkbDrugs')} panelId={panelId} lastFetched={lastFetched} />,
      'cpic': (panelId, lastFetched) => <LazyPanels.LazyCPICPanel guidelines={d('cpicGuidelines')} panelId={panelId} lastFetched={lastFetched} />,

      'isrctn': (panelId, lastFetched) => <LazyPanels.LazyISRCTNPanel trials={d('isrctnTrials')} panelId={panelId} lastFetched={lastFetched} />,
      'iris': (panelId, lastFetched) => <LazyPanels.LazyIRISPanel assessments={d('irisAssessments')} panelId={panelId} lastFetched={lastFetched} />,
      // Tier 2 API panels
      'chemspider': (panelId, lastFetched) => <LazyPanels.LazyChemSpiderPanel compounds={d('chemSpiderCompounds')} panelId={panelId} lastFetched={lastFetched} />,
      'cath': (panelId, lastFetched) => <LazyPanels.LazyCATHPanel data={d('cathData')} panelId={panelId} lastFetched={lastFetched} />,

      // Tier 3 API panels
      'metabolights': (panelId, lastFetched) => <LazyPanels.LazyMetaboLightsPanel data={d('metabolightsData')} panelId={panelId} lastFetched={lastFetched} />,
      'gnps': (panelId, lastFetched) => <LazyPanels.LazyGNPSPanel data={d('gnpsData')} panelId={panelId} lastFetched={lastFetched} />,
      'sabdab': (panelId, lastFetched) => <LazyPanels.LazySAbDabPanel entries={d('sabdabEntries')} panelId={panelId} lastFetched={lastFetched} />,
      'kegg': (panelId, lastFetched) => <LazyPanels.LazyKEGGPanel data={d('keggData')} panelId={panelId} lastFetched={lastFetched} />,
      // Missing panel renderers
      'drug-shortages': (panelId, lastFetched) => <LazyPanels.LazyDrugShortagesPanel shortages={d('drugShortages')} panelId={panelId} lastFetched={lastFetched} />,
      'therapeutic-landscape': (panelId, lastFetched) => <LazyPanels.LazyTherapeuticLandscapePanel chemblIndications={d('chemblIndications')} openTargetsDiseases={d('diseaseAssociations')} disgenetAssociations={d('disgenetAssociations')} orphanetDiseases={d('orphanetDiseases')} ctdDiseaseAssociations={d('ctdDiseaseAssociations')} panelId={panelId} lastFetched={lastFetched} />,
      'gsrs': (panelId, lastFetched) => <LazyPanels.LazyGSRSPanel substances={d('gsrsSubstances')} panelId={panelId} lastFetched={lastFetched} />,
      'lipidmaps': (panelId, lastFetched) => <LazyPanels.LazyLipidMapsPanel lipids={d('lipidMapsLipids')} panelId={panelId} lastFetched={lastFetched} />,
      'unichem': (panelId, lastFetched) => <LazyPanels.LazyUniChemPanel mappings={d('unichemMappings')} panelId={panelId} lastFetched={lastFetched} />,
      'foodb': (panelId, lastFetched) => <LazyPanels.LazyFooDBPanel compounds={d('foodbCompounds')} panelId={panelId} lastFetched={lastFetched} />,
      'lincs': (panelId, lastFetched) => <LazyPanels.LazyLINCSPanel signatures={d('lincsSignatures')} panelId={panelId} lastFetched={lastFetched} />,
      'ttd': (panelId, lastFetched) => (
        <LazyPanels.LazyTTDPanel
          targets={d('ttdTargets') ?? []}
          drugs={d('ttdDrugs') ?? []}
          panelId={panelId}
          lastFetched={lastFetched}
        />
      ),
      'uniprot-extended': (panelId, lastFetched) => <LazyPanels.LazyUniProtExtendedPanel proteins={d('uniprotProteins')} panelId={panelId} lastFetched={lastFetched} />,
      'ebi-proteomics': (panelId, lastFetched) => <LazyPanels.LazyEbiProteinsPanel variations={d('ebiProteinVariations')} proteomics={d('ebiProteomicsData')} crossReferences={d('ebiCrossReferences')} panelId={panelId} lastFetched={lastFetched} />,
      'human-protein-atlas': (panelId, lastFetched) => <LazyPanels.LazyHumanProteinAtlasPanel data={d('humanProteinAtlas')} panelId={panelId} lastFetched={lastFetched} />,
      'gtex': (panelId, lastFetched) => <LazyPanels.LazyGTExPanel expressions={d('gtexExpressions')} panelId={panelId} lastFetched={lastFetched} />,
      'go': (panelId, lastFetched) => <LazyPanels.LazyGeneOntologyPanel terms={d('goTerms')} panelId={panelId} lastFetched={lastFetched} />,
      'hpo': (panelId, lastFetched) => <LazyPanels.LazyHPOPanel terms={d('hpoTerms')} panelId={panelId} lastFetched={lastFetched} />,
      'ols': (panelId, lastFetched) => <LazyPanels.LazyOLSPanel terms={d('olsTerms')} panelId={panelId} lastFetched={lastFetched} />,
      'biomodels': (panelId, lastFetched) => <LazyPanels.LazyBioModelsPanel models={d('bioModelsModels')} panelId={panelId} lastFetched={lastFetched} />,
      'biosamples': (panelId, lastFetched) => <LazyPanels.LazyBioSamplesPanel samples={d('bioSamples')} panelId={panelId} lastFetched={lastFetched} />,
      'massive': (panelId, lastFetched) => <LazyPanels.LazyMassivePanel datasets={d('massiveDatasets')} panelId={panelId} lastFetched={lastFetched} />,
      'nci-cadsr': (panelId, lastFetched) => {
        if (isPanelSourceDisabled('nci-cadsr')) {
          return (
            <Panel
              panelId={panelId}
              title="NCI caDSR / EVS"
              lastFetched={lastFetched}
              loadStatus="disabled"
              empty="No live public endpoint configured."
            />
          )
        }
        const raw = d('cadsrData')
        const concepts = (raw?.data?.concepts ?? (Array.isArray(raw) ? raw : [])) as CadsrConcept[]
        return (
          <LazyPanels.LazyNciCadsrPanel
            data={concepts}
            isLoading={categoryStatusRef.current['nih-high-impact'] === 'loading'}
            panelId={panelId}
            lastFetched={lastFetched}
          />
        )
      },
      'ncats-translator': (panelId, lastFetched) => {
        const raw = d('translatorData')
        const associations = (raw?.data?.associations ??
          (Array.isArray(raw) ? raw : [])) as TranslatorAssociation[]
        return (
          <LazyPanels.LazyNcatsTranslatorPanel
            data={associations}
            isLoading={categoryStatusRef.current['nih-high-impact'] === 'loading'}
            panelId={panelId}
            lastFetched={lastFetched}
          />
        )
      },
      'nhgri-anvil': (panelId, lastFetched) => {
        const raw = d('anvilData')
        const datasets = (raw?.data?.datasets ?? (Array.isArray(raw) ? raw : [])) as AnvilDataset[]
        return (
          <LazyPanels.LazyNhgriAnvilPanel
            data={datasets}
            isLoading={categoryStatusRef.current['nih-high-impact'] === 'loading'}
            panelId={panelId}
            lastFetched={lastFetched}
          />
        )
      },
      'niaid-immport': (panelId, lastFetched) => {
        if (isPanelSourceDisabled('niaid-immport')) {
          return (
            <Panel
              panelId={panelId}
              title="NIAID ImmPort"
              lastFetched={lastFetched}
              loadStatus="disabled"
              empty="No live public ImmPort JSON search endpoint configured."
            />
          )
        }
        const raw = d('immPortData')
        const studies = (raw?.data?.studies ?? (Array.isArray(raw) ? raw : [])) as ImmPortStudy[]
        return (
          <LazyPanels.LazyNiaidImmportPanel
            data={studies}
            isLoading={categoryStatusRef.current['nih-high-impact'] === 'loading'}
            panelId={panelId}
            lastFetched={lastFetched}
          />
        )
      },
      'ninds-neurommsig': (panelId, lastFetched) => {
        const raw = d('neuroMMSigData')
        const signatures = (raw?.data?.signatures ??
          (Array.isArray(raw) ? raw : [])) as NeuroMMSigSignature[]
        return (
          <LazyPanels.LazyNindsNeurommsigPanel
            data={signatures}
            isLoading={categoryStatusRef.current['nih-high-impact'] === 'loading'}
            panelId={panelId}
            lastFetched={lastFetched}
          />
        )
      },
    } as Record<string, PanelRenderer>
  }, [d, molecularWeight, moleculeName, searchParams])

  const allLoaded = ALL_CATEGORY_IDS.every(id => categoryStatus[id] === 'loaded')

  // Run change detection once all categories finish loading
  useEffect(() => {
    if (!allLoaded || snapshotSaved) return
    const changes = detectChanges(cid, mergedData)
    setDetectedChanges(changes)
    saveSnapshot(cid, mergedData)
    setSnapshotSaved(true)
  }, [allLoaded, cid, mergedData, snapshotSaved])

  const graphData = useMemo(() => {
    if (!allLoaded) return null
    const molecule = { cid, name: moleculeName, formula: '', molecularWeight, synonyms: [], inchiKey: '', iupacName: '', classification: 'therapeutic' as const, structureImageUrl: '' }
    return buildGraphData(
      molecule,
      (mergedData.companies ?? []) as CompanyProduct[],
      (mergedData.routes ?? []) as SynthesisRoute[],
      (mergedData.patents ?? []) as Patent[],
      (mergedData.uniprotEntries ?? []) as UniprotEntry[],
    )
  }, [allLoaded, cid, moleculeName, molecularWeight, mergedData])

  const searchLower = searchQuery.toLowerCase()

  // filteredCategories is used for display filtering

  /**
   * Decision “All”: Core six only for decision categories.
   * Focused tab, or non-decision category with data → full panel set.
   */
  function showFullPanelsForCategory(catId: CategoryId): boolean {
    if (!isDecisionMode) return true
    if (activeCategory === catId) return true
    if (!DECISION_CATEGORY_IDS.includes(catId)) {
      const n = dataCounts[catId]?.withData ?? 0
      if (n > 0) return true
    }
    return false
  }

  function renderCategoryContent(catId: CategoryId, panels: typeof CATEGORIES[0]['panels']) {
    const status = categoryStatus[catId]
    const fullForCat = showFullPanelsForCategory(catId)
    const focused = activeCategory === catId

    // Never hide a category the user explicitly selected via tab / URL
    const suppressEmpty = hideEmpty && !focused && activeCategory !== 'all'

    if (suppressEmpty && status === 'idle') return null
    if (suppressEmpty && status === 'loading') return null

    if (status === 'idle') {
      return (
        <div className="col-span-2 flex justify-center py-8">
          <button
            onClick={() => loadCategory(catId)}
            disabled={isBusy}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid={`load-category-${catId}`}
          >
            Load data
          </button>
        </div>
      )
    }

    if (status === 'loading') {
      return (
        <div className="col-span-2 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {panels.slice(0, 4).map(p => (
              <div key={p.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-3 animate-pulse">
                <div className="h-3 w-32 bg-slate-700 rounded" />
                <div className="h-4 w-full bg-slate-700 rounded" />
                <div className="h-4 w-3/4 bg-slate-700 rounded" />
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (status === 'error') {
      const errMsg = categoryErrors[catId]
      return (
        <div className="col-span-2 flex flex-col items-center py-8">
          <p className="text-red-400 text-sm mb-1">Failed to load data</p>
          {errMsg && (
            <p className="text-[11px] text-red-400/70 mb-3 max-w-md text-center font-mono" data-testid="category-load-error">
              {errMsg}
            </p>
          )}
          <button
            onClick={() => loadCategory(catId, { force: true })}
            disabled={isBusy}
            className="text-indigo-400 hover:text-indigo-300 text-sm underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Retry
          </button>
        </div>
      )
    }

    // Loaded — render panels with freshness tracking
    const catPayload = categoryData[catId] as Record<string, unknown> | undefined
    const categoryFetchedAt = fetchedAt[catId] ?? resolveCategoryFetchedAt(catPayload)
    const sourceStatusMap = catPayload?._sourceStatus as
      | Record<string, { status?: string; error?: string }>
      | undefined
    const fromCache = Boolean(catPayload?._fromClientCache)

    // Decision “All”: Core six only. Focused category tab: full panel set for that category.
    const modePanels = fullForCat
      ? panels
      : isDecisionMode
        ? panels.filter((p) => DECISION_PANEL_ID_SET.has(p.id))
        : panels

    const visiblePanels = hideEmpty
      ? modePanels.filter(p => {
          // Always show panels that failed/timed out/disabled — scientific honesty
          // Resolve tracker source keys → panel ids (was broken: looked up panel id only)
          const st = sourceStatusForPanel(sourceStatusMap, p.id)?.status
          if (st === 'timeout' || st === 'error' || st === 'disabled') return true

          const value = mergedData[p.propKey]
          if (value === null || value === undefined) return false

          function hasRealData(v: unknown): boolean {
            if (v === null || v === undefined || v === '' || v === 0) return false
            if (Array.isArray(v)) return v.length > 0
            if (typeof v === 'object') {
              const obj = v as Record<string, unknown>
              // Wrapped API response: { data: { ... }, source, timestamp }
              if (obj.data && typeof obj.data === 'object') {
                return hasRealData(obj.data)
              }
              return Object.values(obj).some(vv => hasRealData(vv))
            }
            return true
          }

          if (p.isNullable) {
            return hasRealData(value)
          }
          return Array.isArray(value) ? value.length > 0 : hasRealData(value)
        })
      : modePanels
    const allowedVisible = allowedPanelSet
      ? visiblePanels.filter((p) => isPanelAllowed(p.id))
      : visiblePanels
    // Focused tab: always show something (empty state / honesty), never vanish
    if (allowedVisible.length === 0 && !focused) {
      if (hideEmpty || (isDecisionMode && !fullForCat)) return null
    }

    // Category-level honesty: count timeouts/errors/disabled from server metrics
    const statusEntries = sourceStatusMap ? Object.entries(sourceStatusMap) : []
    const nTimeout = statusEntries.filter(([, v]) => v.status === 'timeout').length
    const nError = statusEntries.filter(([, v]) => v.status === 'error').length
    const nDisabled = statusEntries.filter(([, v]) => v.status === 'disabled').length
    const hasActionableStatus = nTimeout > 0 || nError > 0 || nDisabled > 0

    if (allowedVisible.length === 0) {
      // Compact empty — no full-width “Source status” card that looks like blank UI
      return (
        <div
          className="rounded-lg border border-slate-800/80 bg-slate-900/30 px-3 py-2.5 text-[11px] text-slate-500"
          data-testid={`category-empty-${catId}`}
        >
          <p>
            {status === 'loaded'
              ? 'No panel data to show for this category (sources empty or timed out — not a missing layout).'
              : 'No panels to show yet.'}
          </p>
          {(hasActionableStatus || fromCache) && (
            <p className="mt-1 text-[10px] text-slate-600 flex flex-wrap gap-x-2 gap-y-0.5">
              {fromCache && (
                <span className="text-cyan-500/80">
                  cache
                  {categoryFetchedAt
                    ? ` · ${categoryFetchedAt.toLocaleString()}`
                    : ''}
                </span>
              )}
              {nTimeout > 0 && <span className="text-amber-400/80">{nTimeout} timed out</span>}
              {nError > 0 && <span className="text-red-400/80">{nError} errors</span>}
              {nDisabled > 0 && <span>{nDisabled} disabled</span>}
            </p>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-2" data-testid={`category-panels-${catId}`}>
        {/* Compact strip only when there is something actionable — not a tall empty grid cell */}
        {hasActionableStatus && (
          <div className="text-[10px] text-slate-500 px-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-slate-500 font-medium">Sources:</span>
            {nTimeout > 0 && (
              <span className="text-amber-400/90">{nTimeout} timed out</span>
            )}
            {nError > 0 && <span className="text-red-400/90">{nError} errors</span>}
            {nDisabled > 0 && <span className="text-slate-500">{nDisabled} disabled</span>}
            {fromCache && (
              <StyledTooltip content="Served from local profile cache">
                <span className="text-cyan-500/80">
                  · cache
                  {categoryFetchedAt ? ` ${categoryFetchedAt.toLocaleString()}` : ''}
                </span>
              </StyledTooltip>
            )}
          </div>
        )}
        {!hasActionableStatus && fromCache && (
          <StyledTooltip content="Served from local profile cache">
            <p className="text-[9px] text-slate-600 px-0.5">
              Local cache
              {categoryFetchedAt ? ` · fetched ${categoryFetchedAt.toLocaleString()}` : ''}
            </p>
          </StyledTooltip>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {allowedVisible.map((p) => (
            <div
              key={p.id}
              id={p.id}
              data-panel-id={p.id}
              className="scroll-mt-28 rounded-xl min-w-0"
            >
              <ErrorBoundary>
                {panelRegistry[p.id]?.(p.id, categoryFetchedAt) ?? null}
              </ErrorBoundary>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <ProfilePanelProvider value={panelContextValue}>
    <div className="relative">
      {showLoadingOverlay && (
        <LoadingOverlay categoryStatus={categoryStatus} dataCounts={dataCounts} />
      )}

      {!isEmbed && (
        <div
          className="sticky top-[var(--app-header-height)] z-30 bg-[#0f1117]/95 backdrop-blur-sm border-b border-slate-800/60 -mx-4 sm:-mx-6 px-4 sm:px-6 -mt-4 pt-3 mb-4"
          data-profile-sticky-chrome
        >
          <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-mono text-slate-500">
            <Link href="/" className="text-slate-500 hover:text-slate-300 shrink-0">Home</Link>
            <span className="text-slate-700">/</span>
            <span className="text-indigo-300/80">CID:{cid}</span>
            {inchiKey && (
              <>
                <span className="text-slate-700">|</span>
                <StyledTooltip content="InChIKey">
                  <span className="text-emerald-300/60">{inchiKey}</span>
                </StyledTooltip>
              </>
            )}
            {iupacName && (
              <>
                <span className="text-slate-700">|</span>
                <StyledTooltip content={iupacName}>
                  <span className="text-slate-400 truncate max-w-[200px]">{iupacName}</span>
                </StyledTooltip>
              </>
            )}
            <div className="ml-auto flex items-center gap-2">
              <ProfileModeToggle
                active={profileMode}
                onChange={handleProfileModeChange}
                disabled={isBusy}
              />
              <ViewToggle active={view} onChange={setView} disabled={isBusy || isDecisionMode} />
              <CiteButton data={mergedData} entityName={moleculeName} entityType="molecule" entityId={cid} />
              <ShareButton entityType="molecule" entityId={cid} entityName={moleculeName} data={mergedData} />
              <ExportButton data={mergedData} moleculeName={moleculeName} cid={cid} />
            </div>
          </div>
          <CategoryTabBar
            active={activeCategory}
            counts={dataCounts}
            onChange={scrollToCategory}
            freshness={freshnessMap}
            disabled={isBusy}
          />
          {isDecisionMode && (
            <div className="text-[10px] text-indigo-400/70 mt-1 flex items-center gap-1.5" data-testid="decision-mode-hint">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400" />
              Decision mode — Core six first; other categories (Genomics, NIH High-Impact, …) load next and open when
              they have data or you click their tab. Use Expand full profile for the full browser.
            </div>
          )}
          {fromDiscover && (
            <AutoLoadIndicator categoryStatus={categoryStatus} />
          )}
          {snapshotMeta && (
            <div className="text-[10px] text-amber-400/70 mt-1 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
              Viewing frozen snapshot from {new Date(snapshotMeta.createdAt).toLocaleString()} — APIs not queried.
            </div>
          )}
          {snapshotError && (
            <div className="text-[10px] text-red-400/80 mt-1">{snapshotError}</div>
          )}
        </div>
      )}

      {isPanelAllowed('summary') && (
        <div className="mb-4">
          <ErrorBoundary>
          <MoleculeSummary
            data={summaryData}
            onCategoryClick={isBusy || isEmbed ? () => {} : (id) => {
              setView('panels')
              scrollToCategory(id as CategoryId)
            }}
            onMetricClick={isBusy || isEmbed ? () => {} : (categoryId, panelId) => {
              const catId = categoryId as CategoryId
              setQuickViewPanel({ categoryId: catId, panelId })
              if (categoryStatus[catId] === 'idle') {
                loadCategory(catId)
              }
            }}
          />
          </ErrorBoundary>
        </div>
      )}

      {!isEmbed && (
        <>
          {/* DecisionStrip: always when decision mode OR project deep-link (anti-cosmetic DoD) */}
          {(isDecisionMode || !!projectParam) && (
            <ErrorBoundary>
              <DecisionStrip
                moleculeName={moleculeName}
                cid={cid}
                disease={diseaseParam}
                projectId={projectParam}
                projectName={projectMeta?.projectName}
                rank={rankParam || null}
                boardStatus={projectMeta?.boardStatus}
                scores={stripScores}
                claims={stripClaims}
                claimsLoading={stripClaimsLoading}
                coreReady={decisionReady}
                onLoadCorePanels={loadDecisionCategories}
              />
            </ErrorBoundary>
          )}

          {/* Primary: multi-source factual data hub (not AI narrative) */}
          <ErrorBoundary>
            <DataHubLedgerView
              ledger={moleculeDataHub}
              className="mb-4"
              testId="molecule-data-hub"
              density={isDecisionMode ? 'compact' : 'full'}
              onOpenPanel={(categoryId, panelId) => {
                const catId = categoryId as CategoryId
                setView('panels')
                setQuickViewPanel({ categoryId: catId, panelId })
                if (categoryStatus[catId] === 'idle') {
                  loadCategory(catId)
                }
                scrollToCategory(catId)
              }}
            />
          </ErrorBoundary>

          <ErrorBoundary>
            <CrossSourceStrip
              bundle={moleculeCrossSource}
              className="mb-4"
              testId="molecule-cross-source"
              title="Source coverage (counts)"
              density={isDecisionMode ? 'compact' : 'full'}
              onOpenPanel={(categoryId, panelId) => {
                const catId = categoryId as CategoryId
                setView('panels')
                setQuickViewPanel({ categoryId: catId, panelId })
                if (categoryStatus[catId] === 'idle') {
                  loadCategory(catId)
                }
                scrollToCategory(catId)
              }}
            />
          </ErrorBoundary>

          <ErrorBoundary>
            <LandscapeDualStrip
              moleculeName={moleculeName}
              data={mergedData as Record<string, unknown>}
              onOpenPanel={(categoryId, panelId) => {
                const catId = categoryId as CategoryId
                setView('panels')
                setQuickViewPanel({ categoryId: catId, panelId })
                if (categoryStatus[catId] === 'idle') {
                  loadCategory(catId)
                }
                scrollToCategory(catId)
              }}
            />
          </ErrorBoundary>

          <ErrorBoundary><DiscoverBreadcrumb disease={diseaseParam ?? ''} rank={rankParam} score={parseFloat(searchParams.get('score') ?? '0') || 0} /></ErrorBoundary>

          {!isDecisionMode && (
            <>
              <ErrorBoundary><PipelinePanel cid={cid} /></ErrorBoundary>

              <ErrorBoundary><VendorsPanel cid={cid} /></ErrorBoundary>

              <ErrorBoundary><GeneTargetStrip interactions={(mergedData.drugGeneInteractions ?? []) as Array<{ geneSymbol: string; geneName: string; interactionType: string; score: number }>} /></ErrorBoundary>

              <ErrorBoundary>
                <ChangeAlerts
                  changes={detectedChanges}
                  cid={cid}
                  projectId={projectParam}
                />
              </ErrorBoundary>

              {/* Secondary: derived / assistive — not of-record facts */}
              <div className="mb-4 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3" data-testid="derived-assistive-block">
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Derived assistive views
                  </h2>
                  <span className="rounded-full border border-slate-700 px-1.5 py-0.5 text-[9px] text-slate-500">
                    not of-record
                  </span>
                </div>
                <p className="mb-3 text-[10px] text-slate-600">
                  Charts, next steps, and research digests are conveniences over the public data above.
                  Prefer Data hub + siloed source panels for factual citation.
                </p>
                <div className="space-y-4">
                  <ErrorBoundary>
                    <NextStepsPanel
                      moleculeName={moleculeName}
                      data={{ ...mergedData, synonyms, cas, inchiKey }}
                      cid={cid}
                    />
                  </ErrorBoundary>
                  <ErrorBoundary>
                    <ResearchBrief data={mergedData} moleculeName={moleculeName} cid={cid} />
                  </ErrorBoundary>
                  <ErrorBoundary><SimilarMolecules cid={cid} /></ErrorBoundary>
                  <ErrorBoundary><InsightsSection data={mergedData} /></ErrorBoundary>
                </div>
              </div>
            </>
          )}
        </>
      )}

        {view === 'panels' || isDecisionMode ? (
          <div>
            {!isEmbed && (
              <div className="mb-4 flex items-center gap-3">
                <PanelSearch value={searchQuery} onChange={setSearchQuery} disabled={isBusy} />
                <button
                  onClick={() => setHideEmpty(!hideEmpty)}
                  disabled={isBusy}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                    hideEmpty
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                  }`}
                >
                  {hideEmpty ? 'Show all' : 'Hide empty'}
                </button>
                {isDecisionMode && (
                  <button
                    type="button"
                    onClick={() => handleProfileModeChange('full')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors shrink-0"
                    data-testid="decision-expand-full"
                  >
                    Expand full profile
                  </button>
                )}
              </div>
            )}
            <div className="space-y-6" id="profile-category-list">
              {(isDecisionMode
                ? [
                    ...MOLECULE_CATEGORIES.filter((c) => DECISION_CATEGORY_IDS.includes(c.id)),
                    ...MOLECULE_CATEGORIES.filter((c) => !DECISION_CATEGORY_IDS.includes(c.id)),
                  ]
                : MOLECULE_CATEGORIES
              ).map((cat) => {
                const focused = activeCategory === cat.id
                // When a specific tab is selected, only mount that category so the
                // matching title is the one in view (avoids scroll landing on neighbors).
                if (activeCategory !== 'all' && !focused) return null

                const count = dataCounts[cat.id] ?? {
                  withData: 0,
                  total: cat.panels.length,
                }
                const hasData = (count.withData ?? 0) > 0
                const isDecisionCat = DECISION_CATEGORY_IDS.includes(cat.id)
                // Decision “All”: Core six only. Focused tab OR non-core category with data:
                // show full panels so Genomics / NIH High-Impact / etc. are actually viewable.
                const expandFull =
                  !isDecisionMode ||
                  focused ||
                  (!isDecisionCat && hasData)

                const matchingPanels = cat.panels.filter((p) => {
                  if (searchQuery && !p.title.toLowerCase().includes(searchLower)) return false
                  if (!isPanelAllowed(p.id)) return false
                  if (expandFull) return true
                  return DECISION_PANEL_ID_SET.has(p.id)
                })

                // Mount when: focused, has decision panels, has data, or still loading/idle for focused path
                if (matchingPanels.length === 0 && !focused && !hasData) return null

                const withData = expandFull
                  ? count.withData
                  : matchingPanels.filter((p) => {
                      const value = mergedData[p.propKey]
                      if (value == null) return false
                      if (Array.isArray(value)) return value.length > 0
                      return true
                    }).length
                const total = expandFull ? count.total : matchingPanels.length

                // Hide empty non-focused categories (except keep focused tab always)
                if (
                  hideEmpty &&
                  !focused &&
                  withData === 0 &&
                  (categoryStatus[cat.id] === 'loaded' || categoryStatus[cat.id] === 'error')
                ) {
                  return null
                }
                // Decision “All”: skip empty non-decision categories that never loaded
                if (
                  isDecisionMode &&
                  !focused &&
                  !isDecisionCat &&
                  !hasData &&
                  categoryStatus[cat.id] !== 'loading'
                ) {
                  return null
                }

                return (
                  <div
                    key={cat.id}
                    id={`category-section-${cat.id}`}
                    data-category-id={cat.id}
                    data-category-label={cat.label}
                    data-testid={`category-section-${cat.id}`}
                    className="scroll-mt-[calc(var(--app-header-height)+5.5rem)]"
                  >
                    <CategorySection
                      icon={cat.icon}
                      label={cat.label}
                      withData={withData}
                      total={total}
                      categoryId={cat.id}
                      forceExpanded={focused}
                    >
                      {renderCategoryContent(
                        cat.id,
                        matchingPanels.length > 0 ? matchingPanels : cat.panels,
                      )}
                    </CategorySection>
                  </div>
                )
              })}
            </div>
          </div>
        ) : graphData ? (
          <NetworkGraph data={graphData} />
        ) : (
          <div className="relative p-8 text-center text-slate-500">
            <p className="text-sm">Network graph requires loading all categories first.</p>
            <button
              onClick={() => {
                for (const id of ALL_CATEGORY_IDS) {
                  if (categoryStatus[id] === 'idle') loadCategory(id)
                }
              }}
              disabled={isBusy}
              className="mt-3 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Load all data for network graph
            </button>
            {ALL_CATEGORY_IDS.some(id => categoryStatus[id] === 'loading') && (
              <p className="text-xs text-slate-600 mt-2 animate-pulse">Loading categories...</p>
            )}
          </div>
        )}

        {/* Quick View Modal — disabled in embed mode (no overlay UI) */}
        {!isEmbed && quickViewPanel && (() => {
          const catId = quickViewPanel.categoryId
          const status = categoryStatus[catId]

          // Find the human-readable title for the modal
          const panelDef = CATEGORIES
            .find(c => c.id === catId)?.panels
            .find(p => p.id === quickViewPanel.panelId)

          // We use a fallback title if not found
          const modalTitle = panelDef ? panelDef.title.replace(/([A-Z])/g, ' $1').trim() : 'Data Details'

          return (
            <Modal
              isOpen={true}
              onClose={() => setQuickViewPanel(null)}
              title={modalTitle}
            >
              {(status === 'loading' || status === 'idle') ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-400 text-sm animate-pulse">Loading {modalTitle} data...</p>
                </div>
              ) : status === 'error' ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-red-400 mb-3">Failed to load data for this component.</p>
                  <button
                    onClick={() => loadCategory(catId)}
                    disabled={isBusy}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 sm:p-4">
                  <ErrorBoundary>
                    {panelRegistry[quickViewPanel.panelId](quickViewPanel.panelId, fetchedAt[quickViewPanel.categoryId])}
                  </ErrorBoundary>
                </div>
              )}
            </Modal>
          )
        })()}
        {!isEmbed && (
          <AICopilot
            categoryData={categoryData}
            categoryStatus={categoryStatus}
            fetchedAt={fetchedAt}
            identity={{ name: moleculeName, cid, molecularWeight, inchiKey, iupacName }}
            diseaseName={fromDiscover ? (searchParams.get('disease') ?? undefined) : undefined}
            projectId={projectParam ?? undefined}
            refreshCategory={(catId) => {
              void loadCategory(catId, { force: true, refresh: true })
            }}
            loadCategory={(catId) => {
              void loadCategory(catId)
            }}
            onNavigateToPanel={(panelId) => {
              scrollToPanel(panelId)
            }}
          />
        )}
        {isEmbed && (
          <a
            href={`/molecule/${cid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-4 right-4 z-40 bg-slate-900/90 backdrop-blur-sm border border-slate-700 hover:border-indigo-500 hover:text-indigo-300 text-slate-300 text-xs px-3 py-1.5 rounded-full shadow-lg transition-colors"
          >
            View full profile →
          </a>
        )}
    </div>
    </ProfilePanelProvider>
  )
}
