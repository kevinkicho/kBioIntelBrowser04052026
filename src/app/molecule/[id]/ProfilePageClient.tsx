'use client'

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ViewToggle } from '@/components/profile/ViewToggle'
import { CategoryTabBar } from '@/components/profile/CategoryTabBar'
import { Modal } from '@/components/ui/Modal'
import { CategorySection } from '@/components/profile/CategorySection'
import { PanelSearch } from '@/components/profile/PanelSearch'
import { CATEGORIES, getCategoryDataCounts, type CategoryId } from '@/lib/categoryConfig'
import { MoleculeSummary } from '@/components/profile/MoleculeSummary'
import { ExportButton } from '@/components/profile/ExportButton'
import { computeMoleculeSummary } from '@/lib/moleculeSummary'
import { fetchCategoryData, type CategoryLoadState } from '@/lib/fetchCategory'
import type { FreshnessMap } from '@/lib/dataFreshness'
import { buildGraphData } from '@/lib/buildGraphData'
import type { CompanyProduct, SynthesisRoute, Patent, UniprotEntry, CadsrConcept, TranslatorAssociation, AnvilDataset, ImmPortStudy, NeuroMMSigSignature } from '@/lib/types'
import * as LazyPanels from '@/lib/lazyPanels'
import { NetworkGraph } from '@/components/graph/NetworkGraph'
import { InsightsSection } from '@/components/profile/InsightsSection'
import { SimilarMolecules } from '@/components/profile/SimilarMolecules'
import { ChangeAlerts } from '@/components/profile/ChangeAlerts'
import { ResearchBrief } from '@/components/profile/ResearchBrief'
import { detectChanges, saveSnapshot, type ChangeItem } from '@/lib/changeDetection'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { LoadingOverlay } from '@/components/profile/LoadingOverlay'
import { AICopilot } from '@/components/ai/AICopilot'
import { sessionHistory } from '@/lib/sessionHistory'
import type { ApiIdentifierType, ApiParamValue } from '@/lib/apiIdentifiers'

interface Props {
  cid: number
  moleculeName: string
  molecularWeight: number
  inchiKey: string
  iupacName: string
}

type PanelRenderer = (panelId: string, lastFetched?: Date) => React.ReactNode

type CategoriesData = Partial<Record<CategoryId, Record<string, unknown>>>
type CategoriesStatus = Record<CategoryId, CategoryLoadState>

const ALL_CATEGORY_IDS: CategoryId[] = CATEGORIES.map(c => c.id)

function initStatus(): CategoriesStatus {
  const s = {} as CategoriesStatus
  for (const id of ALL_CATEGORY_IDS) s[id] = 'idle'
  return s
}

export function ProfilePageClient({ cid, moleculeName, molecularWeight, inchiKey, iupacName }: Props) {
  return (
    <Suspense fallback={<div className="animate-pulse h-96 bg-slate-800/50 rounded-xl" />}>
      <ProfilePageClientInner cid={cid} moleculeName={moleculeName} molecularWeight={molecularWeight} inchiKey={inchiKey} iupacName={iupacName} />
    </Suspense>
  )
}

function ProfilePageClientInner({ cid, moleculeName, molecularWeight, inchiKey, iupacName }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab = searchParams.get('tab')
  const initialView = searchParams.get('view')
  const pendingRef = useRef<Set<CategoryId>>(new Set())

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
  const [activeCategory, setActiveCategory] = useState<'all' | CategoryId>(() => {
    if (!initialTab) return 'pharmaceutical'
    if (initialTab === 'all') return 'all'
    if (ALL_CATEGORY_IDS.includes(initialTab as CategoryId)) return initialTab as CategoryId
    return 'pharmaceutical'
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryData, setCategoryData] = useState<CategoriesData>({})
  const [categoryStatus, setCategoryStatus] = useState<CategoriesStatus>(initStatus)
  const categoryStatusRef = useRef(categoryStatus)
  categoryStatusRef.current = categoryStatus
  const [quickViewPanel, setQuickViewPanel] = useState<{ categoryId: CategoryId, panelId: string } | null>(null)
  const [fetchedAt, setFetchedAt] = useState<Partial<Record<CategoryId, Date>>>({})
  const [hideEmpty, setHideEmpty] = useState(true)

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

  useEffect(() => {
    const params = new URLSearchParams()
    if (activeCategory !== 'pharmaceutical') params.set('tab', activeCategory)
    if (view !== 'panels') params.set('view', view)
    const search = params.toString()
    router.replace(search ? `?${search}` : '?', { scroll: false })
  }, [activeCategory, view, router])



  const loadCategory = useCallback(async (catId: CategoryId) => {
    if (pendingRef.current.has(catId)) return
    if (categoryStatusRef.current[catId] === 'loaded' || categoryStatusRef.current[catId] === 'loading') return
    pendingRef.current.add(catId)
    setCategoryStatus(prev => ({ ...prev, [catId]: 'loading' }))
    try {
      const data = await fetchCategoryData(cid, catId, apiOverrides, apiParams)
      setCategoryData(prev => ({ ...prev, [catId]: data }))
      setCategoryStatus(prev => ({ ...prev, [catId]: 'loaded' }))
      setFetchedAt(prev => ({ ...prev, [catId]: new Date() }))
    } catch {
      setCategoryStatus(prev => ({ ...prev, [catId]: 'error' }))
    } finally {
      pendingRef.current.delete(catId)
    }
  }, [cid, apiOverrides, apiParams])

  // Scroll to category section
  const scrollToCategory = useCallback((catId: CategoryId | 'all') => {
    if (catId === 'all') {
      setActiveCategory('all')
      return
    }
    setActiveCategory(catId)
    if (categoryStatusRef.current[catId] === 'idle') loadCategory(catId)
    requestAnimationFrame(() => {
      const el = document.getElementById(catId)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [loadCategory])

  // Auto-load the active category when it changes
  useEffect(() => {
    if (activeCategory === 'all') return
    if (categoryStatusRef.current[activeCategory] === 'idle') {
      loadCategory(activeCategory)
    }
  }, [activeCategory, loadCategory])

  // Auto-load default category on mount
  useEffect(() => {
    loadCategory('pharmaceutical')
  }, [loadCategory])

  // When hideEmpty is toggled on, load all idle categories so we can evaluate them
  useEffect(() => {
    if (!hideEmpty) return
    for (const id of ALL_CATEGORY_IDS) {
      if (categoryStatusRef.current[id] === 'idle') loadCategory(id)
    }
  }, [hideEmpty, loadCategory])

  // Background pre-fetch: once pharmaceutical loads, silently load remaining categories
  const pharmaceuticalLoaded = categoryStatus['pharmaceutical'] === 'loaded'

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
    if (!pharmaceuticalLoaded) return

    const prefetchOrder: CategoryId[] = [
      'clinical-safety',
      'research-literature',
      'bioactivity-targets',
      'molecular-chemical',
      'protein-structure',
      'genomics-disease',
      'interactions-pathways',
    ]

    let cancelled = false
    async function prefetchSequentially() {
      for (const catId of prefetchOrder) {
        if (cancelled) break
        if (categoryStatusRef.current[catId] !== 'idle') continue
        await new Promise(r => setTimeout(r, 300))
        if (cancelled) break
        loadCategory(catId)
        await new Promise(r => setTimeout(r, 1500))
      }
    }

    const timer = setTimeout(prefetchSequentially, 500)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [pharmaceuticalLoaded, loadCategory])

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
      'nadac': (panelId, lastFetched) => <LazyPanels.LazyNadacPanel prices={d('drugPrices')} panelId={panelId} lastFetched={lastFetched} />,
      'drug-interactions': (panelId, lastFetched) => <LazyPanels.LazyDrugInteractionsPanel interactions={d('drugInteractions')} panelId={panelId} lastFetched={lastFetched} />,
      'dailymed': (panelId, lastFetched) => <LazyPanels.LazyDailyMedPanel labels={d('drugLabels')} panelId={panelId} lastFetched={lastFetched} />,
      'atc': (panelId, lastFetched) => <LazyPanels.LazyAtcPanel classifications={d('atcClassifications')} panelId={panelId} lastFetched={lastFetched} />,
      'clinical-trials': (panelId, lastFetched) => <LazyPanels.LazyClinicalTrialsPanel trials={d('clinicalTrials')} panelId={panelId} lastFetched={lastFetched} />,
      'adverse-events': (panelId, lastFetched) => <LazyPanels.LazyAdverseEventsPanel adverseEvents={d('adverseEvents')} panelId={panelId} lastFetched={lastFetched} />,
      'recalls': (panelId, lastFetched) => <LazyPanels.LazyRecallsPanel recalls={d('drugRecalls')} panelId={panelId} lastFetched={lastFetched} />,
      'chembl-indications': (panelId, lastFetched) => <LazyPanels.LazyChemblIndicationsPanel indications={d('chemblIndications')} panelId={panelId} lastFetched={lastFetched} />,
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
      'gsrs': (panelId, lastFetched) => <LazyPanels.LazyGSRSPanel substances={d('gsrsSubstances')} panelId={panelId} lastFetched={lastFetched} />,
      'lipidmaps': (panelId, lastFetched) => <LazyPanels.LazyLipidMapsPanel lipids={d('lipidMapsLipids')} panelId={panelId} lastFetched={lastFetched} />,
      'unichem': (panelId, lastFetched) => <LazyPanels.LazyUniChemPanel mappings={d('unichemMappings')} panelId={panelId} lastFetched={lastFetched} />,
      'foodb': (panelId, lastFetched) => <LazyPanels.LazyFooDBPanel compounds={d('foodbCompounds')} panelId={panelId} lastFetched={lastFetched} />,
      'lincs': (panelId, lastFetched) => <LazyPanels.LazyLINCSPanel signatures={d('lincsSignatures')} panelId={panelId} lastFetched={lastFetched} />,
      'ttd': (panelId, lastFetched) => <LazyPanels.LazyTTDPanel targets={d('ttdTargets')} drugs={d('ttdDrugs')} panelId={panelId} lastFetched={lastFetched} />,
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      'nci-cadsr': (panelId, lastFetched) => {
        const raw = d('cadsrData')
        const concepts = (raw?.data?.concepts ?? (Array.isArray(raw) ? raw : [])) as CadsrConcept[]
        return <LazyPanels.LazyNciCadsrPanel data={concepts} isLoading={categoryStatusRef.current['nih-high-impact'] === 'loading'} />
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      'ncats-translator': (panelId, lastFetched) => {
        const raw = d('translatorData')
        const associations = (raw?.data?.associations ?? (Array.isArray(raw) ? raw : [])) as TranslatorAssociation[]
        return <LazyPanels.LazyNcatsTranslatorPanel data={associations} isLoading={categoryStatusRef.current['nih-high-impact'] === 'loading'} />
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      'nhgri-anvil': (panelId, lastFetched) => {
        const raw = d('anvilData')
        const datasets = (raw?.data?.datasets ?? (Array.isArray(raw) ? raw : [])) as AnvilDataset[]
        return <LazyPanels.LazyNhgriAnvilPanel data={datasets} isLoading={categoryStatusRef.current['nih-high-impact'] === 'loading'} />
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      'niaid-immport': (panelId, lastFetched) => {
        const raw = d('immPortData')
        const studies = (raw?.data?.studies ?? (Array.isArray(raw) ? raw : [])) as ImmPortStudy[]
        return <LazyPanels.LazyNiaidImmportPanel data={studies} isLoading={categoryStatusRef.current['nih-high-impact'] === 'loading'} />
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      'ninds-neurommsig': (panelId, lastFetched) => {
        const raw = d('neuroMMSigData')
        const signatures = (raw?.data?.signatures ?? (Array.isArray(raw) ? raw : [])) as NeuroMMSigSignature[]
        return <LazyPanels.LazyNindsNeurommsigPanel data={signatures} isLoading={categoryStatusRef.current['nih-high-impact'] === 'loading'} />
      },
    } as Record<string, PanelRenderer>
  }, [d, molecularWeight, moleculeName])

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

  function renderCategoryContent(catId: CategoryId, panels: typeof CATEGORIES[0]['panels']) {
    const status = categoryStatus[catId]

    if (hideEmpty && status === 'idle') return null
    if (hideEmpty && status === 'loading') return null

    if (status === 'idle') {
      return (
        <div className="col-span-2 flex justify-center py-8">
          <button
            onClick={() => loadCategory(catId)}
            disabled={isBusy}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
      return (
        <div className="col-span-2 flex flex-col items-center py-8">
          <p className="text-red-400 text-sm mb-3">Failed to load data</p>
          <button
            onClick={() => loadCategory(catId)}
            disabled={isBusy}
            className="text-indigo-400 hover:text-indigo-300 text-sm underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Retry
          </button>
        </div>
      )
    }

    // Loaded — render panels with freshness tracking
    const categoryFetchedAt = fetchedAt[catId]
    const visiblePanels = hideEmpty
      ? panels.filter(p => {
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
      : panels
    if (visiblePanels.length === 0 && hideEmpty) return null
    return visiblePanels.map(p => (
      <div key={p.id}>
        <ErrorBoundary>
          {panelRegistry[p.id](p.id, categoryFetchedAt)}
        </ErrorBoundary>
      </div>
    ))
  }

  return (
    <div className="relative">
      {showLoadingOverlay && (
        <LoadingOverlay categoryStatus={categoryStatus} dataCounts={dataCounts} />
      )}

      <div className="sticky top-0 z-30 bg-[#0f1117]/95 backdrop-blur-sm border-b border-slate-800/60 -mx-4 sm:-mx-6 px-4 sm:px-6 -mt-4 pt-3 mb-4">
        <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-mono text-slate-500">
          <Link href="/" className="text-slate-500 hover:text-slate-300 shrink-0">Home</Link>
          <span className="text-slate-700">/</span>
          <span className="text-indigo-300/80">CID:{cid}</span>
          {inchiKey && <><span className="text-slate-700">|</span><span className="text-emerald-300/60" title="InChIKey">{inchiKey}</span></>}
          {iupacName && <><span className="text-slate-700">|</span><span className="text-slate-400 truncate max-w-[200px]" title={iupacName}>{iupacName}</span></>}
          <div className="ml-auto flex items-center gap-2">
            <ViewToggle active={view} onChange={setView} disabled={isBusy} />
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
      </div>

      <div className="mb-4">
        <ErrorBoundary>
        <MoleculeSummary
          data={summaryData}
          onCategoryClick={isBusy ? () => {} : (id) => {
            setView('panels')
            scrollToCategory(id as CategoryId)
          }}
          onMetricClick={isBusy ? () => {} : (categoryId, panelId) => {
            const catId = categoryId as CategoryId
            setQuickViewPanel({ categoryId: catId, panelId })
            if (categoryStatus[catId] === 'idle') {
              loadCategory(catId)
            }
          }}
        />
        </ErrorBoundary>
      </div>

      <ErrorBoundary><ChangeAlerts changes={detectedChanges} cid={cid} /></ErrorBoundary>

      <ErrorBoundary><ResearchBrief data={mergedData} moleculeName={moleculeName} /></ErrorBoundary>

      <ErrorBoundary><SimilarMolecules cid={cid} /></ErrorBoundary>

      <ErrorBoundary><InsightsSection data={mergedData} /></ErrorBoundary>

        {view === 'panels' ? (
          <div>
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
            </div>
            <div className="space-y-6">
              {CATEGORIES.map(cat => {
                const matchingPanels = cat.panels.filter(p =>
                  !searchQuery || p.title.toLowerCase().includes(searchLower)
                )
                if (matchingPanels.length === 0) return null
                const count = dataCounts[cat.id]

                if (hideEmpty && count.withData === 0 && categoryStatus[cat.id] === 'loaded') return null

                 return (<div key={cat.id} id={cat.id}>
                  <CategorySection
                    icon={cat.icon}
                    label={cat.label}
                    withData={count.withData}
                    total={count.total}
                  >
                    {renderCategoryContent(cat.id, matchingPanels)}
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

        {/* Quick View Modal */}
        {quickViewPanel && (() => {
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
        <AICopilot
          categoryData={categoryData}
          categoryStatus={categoryStatus}
          fetchedAt={fetchedAt}
          identity={{ name: moleculeName, cid, molecularWeight, inchiKey, iupacName }}
        />
    </div>
  )
}
