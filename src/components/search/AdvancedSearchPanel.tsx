'use client'

import { useState, useMemo, useCallback } from 'react'
import { API_IDENTIFIER_CONFIGS, IDENTIFIER_TYPE_LABELS, API_PARAMETERS, type ApiIdentifierType, type SearchType, type ApiParamValue } from '@/lib/apiIdentifiers'
import { getPanelSource } from '@/lib/panelSources'
import { CATEGORIES, type CategoryId } from '@/lib/categoryConfig'

interface AdvancedSearchPanelProps {
  searchType: SearchType
  onSearchTypeChange: (type: SearchType) => void
  apiOverrides: Record<string, ApiIdentifierType>
  onApiOverrideChange: (panelId: string, idType: ApiIdentifierType) => void
  onResetOverrides: () => void
  apiParams: Record<string, ApiParamValue>
  onApiParamChange: (panelId: string, param: string, value: string | number | boolean) => void
  onResetParams: () => void
}

const SEARCH_TYPES: { value: SearchType; label: string; placeholder: string; description: string }[] = [
  { value: 'name', label: 'Name', placeholder: 'e.g. aspirin, metformin, caffeine', description: 'Common name, IUPAC name, or synonym' },
  { value: 'cid', label: 'CID', placeholder: 'e.g. 2244', description: 'PubChem Compound ID number' },
  { value: 'cas', label: 'CAS', placeholder: 'e.g. 50-78-2', description: 'CAS Registry Number' },
  { value: 'smiles', label: 'SMILES', placeholder: 'e.g. CC(=O)OC1=CC=CC=C1C(=O)O', description: 'Simplified Molecular Input Line Entry System' },
  { value: 'inchikey', label: 'InChIKey', placeholder: 'e.g. RYXSWKPIZGBOPP-UHFFFAOYSA-N', description: 'IUPAC International Chemical Identifier Key' },
  { value: 'inchi', label: 'InChI', placeholder: 'e.g. InChI=1S/C9H8O4/c1-6...', description: 'IUPAC International Chemical Identifier' },
  { value: 'formula', label: 'Formula', placeholder: 'e.g. C9H8O4', description: 'Molecular formula' },
]

const PANEL_FIELDS: Record<string, string[]> = {
  companies: ['Brand', 'Manufacturer', 'Route', 'Active Ingredients'],
  ndc: ['Product', 'Generic', 'Route', 'Form'],
  'orange-book': ['Ingredient', 'Appl Type', 'Applicant', 'Patent No'],
  nadac: ['Drug', 'NADAC/Unit', 'Change', 'Effective Date'],
  'drug-interactions': ['Drug Pair', 'Severity', 'Description'],
  dailymed: ['Product', 'Label Type', 'Manufacturer', 'Package'],
  atc: ['Code', 'Level', 'Name', 'Parent'],
  drugcentral: ['Name', 'Indications', 'Targets', 'Routes', 'ATC', 'FAERS'],
  gsrs: ['Substance', 'UNII', 'Definition'],
  pharmgkb: ['Name', 'Class', 'Gene', 'Level', 'Guidelines'],
  cpic: ['Drug', 'Gene', 'Guideline', 'Recommendation'],
  'clinical-trials': ['Title', 'Status', 'Phase', 'Sponsor', 'NCT ID'],
  'adverse-events': ['Reaction', 'Serious', 'Count'],
  recalls: ['Product', 'Reason', 'Classification', 'Date'],
  'chemml-indications': ['Indication', 'Phase', 'Mechanism'],
  clinvar: ['Variant', 'Significance', 'Gene', 'Condition'],
  gwas: ['Trait', 'P-value', 'Odds Ratio', 'EFO'],
  toxcast: ['Assay', 'Endpoint', 'Hit', 'IC50'],
  sider: ['Side Effect', 'Frequency', 'Label'],
  iris: ['Assessment', 'Status', 'RfD', 'Cancer'],
  'drug-shortages': ['Drug', 'Status', 'Category', 'Date'],
  properties: ['MW', 'XLogP', 'TPSA', 'HBD/HBA', 'RotBonds'],
  hazards: ['Signal', 'H-Code', 'Category', 'P-Code'],
  chebi: ['Name', 'ID', 'Definition', 'Formula', 'Mass'],
  comptox: ['DTXSID', 'CAS', 'SMILES', 'ToxCast', 'Exposure'],
  mychem: ['CHEMBL', 'DrugBank', 'PubChem', 'InChIKey'],
  hmdb: ['Metabolite', 'Formula', 'Mass', 'Ontology'],
  massbank: ['Spectrum', 'Ion Mode', 'Mass', 'Instrument'],
  chemspider: ['Compound', 'CSID', 'SMILES'],
  metabolights: ['Study', 'Organism', 'Technique'],
  gnps: ['Spectrum', 'Library', 'Precursor'],
  lipidmaps: ['Lipid', 'Category', 'LMID', 'Formula'],
  unichem: ['Source', 'ID', 'InChIKey'],
  foodb: ['Compound', 'Food', 'Content'],
  chembl: ['Target', 'Type', 'Value', 'Units', 'Assay'],
  bioassay: ['AID', 'Name', 'Type', 'Outcome'],
  'chembl-mechanisms': ['MOA', 'Action', 'Target', 'Phase'],
  iuphar: ['Target', 'Type', 'Affinity', 'Species'],
  bindingdb: ['Target', 'Ki/IC50', 'Ligand'],
  pharos: ['Target', 'Family', 'Development Level'],
  dgidb: ['Gene', 'Interaction', 'Source', 'Score'],
  opentargets: ['Disease', 'Therapeutic Area', 'Score'],
  ctd: ['Gene', 'Interaction', 'Evidence', 'PMID'],
  iedb: ['Epitope', 'Organism', 'Assay Type', 'Response'],
  lincs: ['Perturbation', 'Cell Line', 'Z-Score', 'Dose'],
  ttd: ['Target', 'Drug', 'Clinical Status'],
  uniprot: ['Protein', 'Gene', 'Organism', 'Accession', 'Function'],
  'uniprot-extended': ['Protein', 'Mass', 'Length', 'Domains'],
  interpro: ['Type', 'Name', 'Description'],
  'ebi-proteins': ['Variant', 'Position', 'Consequence', 'Source'],
  'ebi-proteomics': ['Peptide', 'Position', 'Modification'],
  'ebi-crossrefs': ['Database', 'ID', 'Name'],
  'protein-atlas': ['Gene', 'Tissue', 'Level'],
  'human-protein-atlas': ['Gene', 'Tissue', 'Cell Type', 'Level'],
  quickgo: ['GO ID', 'Name', 'Aspect', 'Evidence'],
  go: ['GO ID', 'Name', 'Aspect', 'Evidence'],
  pdb: ['PDB ID', 'Method', 'Resolution', 'Chain', 'Organism'],
  'pdbe-ligands': ['Ligand', 'PDB Count', 'Formula'],
  alphafold: ['UniProt', 'Model', 'pLDDT', 'Rank'],
  peptideatlas: ['Peptide', 'Protein', 'N-Obs'],
  pride: ['Project', 'Organism', 'Instrument'],
  cath: ['Domain', 'Class', 'Superfamily'],
  sabdab: ['PDB', 'Antibody', 'Antigen', 'Heavy/Light'],
  'gene-info': ['Gene', 'Symbol', 'Chromosome', 'Description'],
  ensembl: ['Gene', 'Biotype', 'Chr', 'Description'],
  'expression-atlas': ['Gene', 'Condition', 'Expression', 'Fold Change'],
  gtex: ['Tissue', 'TPM', 'Percentile', 'N'],
  geo: ['Dataset', 'Title', 'Organism', 'Samples'],
  dbsnp: ['RS ID', 'Clinical', 'Gene', 'Alleles'],
  clingen: ['Gene', 'Disease', 'Classification', 'Assertion'],
  medgen: ['Concept', 'Semantic Type', 'Definition'],
  monarch: ['Disease', 'Category', 'Inheritance'],
  'nci-thesaurus': ['Code', 'Name', 'Synonyms', 'Definition'],
  mesh: ['UI', 'Name', 'Tree Number', 'Scope'],
  disgenet: ['Disease', 'Score', 'Source', 'PMID'],
  orphanet: ['Disease', 'ORPHA', 'Prevalence', 'Gene'],
  mygene: ['Gene', 'Symbol', 'Entrez', 'Ensembl'],
  bgee: ['Gene', 'Tissue', 'Stage', 'Expression'],
  omim: ['Entry', 'Phenotype', 'Gene', 'Inheritance'],
  hpo: ['Term', 'Synonyms', 'Definition'],
  ols: ['Term', 'Ontology', 'Definition'],
  biomodels: ['Model', 'Format', 'SBML'],
  biosamples: ['Sample', 'Organism', 'Tissue'],
  massive: ['Dataset', 'Organism', 'Instrument'],
  string: ['Protein A', 'Protein B', 'Score', 'Exp', 'DB', 'Text'],
  stitch: ['Chemical', 'Protein', 'Score', 'Exp', 'DB'],
  intact: ['Protein A', 'Protein B', 'Score', 'Type'],
  reactome: ['Pathway', 'StId', 'Species', 'Summation'],
  wikipathways: ['ID', 'Name', 'Species'],
  'pathway-commons': ['Pathway', 'Type', 'Source', 'Data Source'],
  biocyc: ['Pathway', 'Organism', 'Reaction'],
  smpdb: ['Pathway', 'Category', 'Subject'],
  'ctd-diseases': ['Disease', 'Gene', 'Evidence', 'Score'],
  kegg: ['Pathway', 'Compound', 'Drug', 'Enzyme'],
  'ncats-translator': ['Subject', 'Predicate', 'Object', 'Source'],
  'nci-cadsr': ['Concept', 'Context', 'Class', 'Workflow'],
  'nhgri-anvil': ['Dataset', 'Study', 'Consent'],
  'niaid-immport': ['Study', 'Assay', 'Species', 'Disease'],
  'ninds-neurommsig': ['Signature', 'Pathway', 'Gene'],
  literature: ['Title', 'Authors', 'Journal', 'Year', 'DOI'],
  pubmed: ['Title', 'Authors', 'Journal', 'PMID'],
  'semantic-scholar': ['Title', 'Authors', 'Year', 'Citations'],
  'open-alex': ['Title', 'Authors', 'Year', 'Citations'],
  'open-citations': ['DOI', 'Cited By', 'References'],
  crossref: ['Title', 'DOI', 'Authors', 'Publisher'],
  arxiv: ['Title', 'Authors', 'Category', 'Year'],
  patents: ['Patent', 'Inventor', 'Date', 'Abstract'],
  'nih-reporter': ['Project', 'PI', ' Institution', 'Funding'],
  sec: ['Company', 'Filing', 'Date', 'Type'],
}

const CAT_TABS: { label: string; id: CategoryId }[] = [
  { label: 'Pharma', id: 'pharmaceutical' },
  { label: 'Clinical', id: 'clinical-safety' },
  { label: 'Molecular', id: 'molecular-chemical' },
  { label: 'Bioact.', id: 'bioactivity-targets' },
  { label: 'Protein', id: 'protein-structure' },
  { label: 'Genomics', id: 'genomics-disease' },
  { label: 'Pathways', id: 'interactions-pathways' },
  { label: 'Literature', id: 'research-literature' },
]

const PANEL_TO_CAT: Record<string, CategoryId> = {}
for (const cat of CATEGORIES) {
  for (const p of cat.panels) {
    PANEL_TO_CAT[p.id] = cat.id
  }
}
const CAT_LABELS: Record<CategoryId, string> = {
  pharmaceutical: 'Pharma',
  'clinical-safety': 'Clinical',
  'molecular-chemical': 'Molecular',
  'bioactivity-targets': 'Bioact.',
  'protein-structure': 'Protein',
  'genomics-disease': 'Genomics',
  'interactions-pathways': 'Pathways',
  'research-literature': 'Literature',
  'nih-high-impact': 'NIH',
}

function ParamCell({ panelId, params, currentParams, onParamChange }: {
  panelId: string
  params: typeof API_PARAMETERS[string] | undefined
  currentParams: ApiParamValue
  onParamChange: (panelId: string, param: string, value: string | number | boolean) => void
}) {
  if (!params || params.length === 0) return <span className="text-slate-700/50">—</span>
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      {params.map(param => {
        const currentVal = currentParams[param.key]
        if (param.type === 'select' && param.options) {
          return (
            <select key={param.key} value={String(currentVal ?? param.default)}
              onChange={(e) => onParamChange(panelId, param.key, e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded text-[9px] text-slate-300 px-1 py-px h-[16px]"
              title={param.label}>
              {param.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          )
        }
        if (param.type === 'number') {
          return (
            <input key={param.key} type="number" min={param.min} max={param.max}
              value={String(currentVal ?? param.default)}
              onChange={(e) => onParamChange(panelId, param.key, Number(e.target.value))}
              className="bg-slate-700 border border-slate-600 rounded text-[9px] text-slate-300 px-1 py-px w-10 h-[16px] text-center"
              title={param.label} />
          )
        }
        if (param.type === 'toggle') {
          const on = !!(currentVal ?? param.default)
          return (
            <button key={param.key} onClick={() => onParamChange(panelId, param.key, !on)}
              className={`relative w-5 h-3 rounded-full transition-colors ${on ? 'bg-indigo-600' : 'bg-slate-600'}`}
              title={param.label}>
              <span className={`absolute top-px left-px w-[10px] h-[10px] rounded-full bg-white transition-transform ${on ? 'translate-x-2' : ''}`} />
            </button>
          )
        }
        return null
      })}
    </span>
  )
}

function ApiDetailDrawer({ panelId, source, onClose }: {
  panelId: string
  source: ReturnType<typeof getPanelSource>
  onClose: () => void
}) {
  const [healthStatus, setHealthStatus] = useState<'idle' | 'checking' | 'up' | 'down' | 'slow'>('idle')
  const [healthMs, setHealthMs] = useState<number | null>(null)
  const fields = PANEL_FIELDS[panelId]

  const checkHealth = useCallback(async () => {
    if (!source?.endpoint) return
    setHealthStatus('checking')
    const start = performance.now()
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      const res = await fetch(source.endpoint, { method: 'HEAD', mode: 'no-cors', signal: controller.signal })
      clearTimeout(timeout)
      const ms = Math.round(performance.now() - start)
      setHealthMs(ms)
      if (ms > 3000) setHealthStatus('slow')
      else setHealthStatus(res.type === 'opaque' ? 'up' : res.ok ? 'up' : 'down')
    } catch {
      setHealthMs(Math.round(performance.now() - start))
      setHealthStatus('down')
    }
  }, [source?.endpoint])

  const healthColor = healthStatus === 'up' ? 'text-emerald-400' : healthStatus === 'down' ? 'text-red-400' : healthStatus === 'slow' ? 'text-amber-400' : 'text-slate-500'
  const healthLabel = healthStatus === 'up' ? 'Reachable' : healthStatus === 'down' ? 'Unreachable' : healthStatus === 'slow' ? 'Slow' : healthStatus === 'checking' ? 'Checking...' : 'Test'
  const healthBg = healthStatus === 'up' ? 'bg-emerald-900/30 border-emerald-700/30' : healthStatus === 'down' ? 'bg-red-900/30 border-red-700/30' : healthStatus === 'slow' ? 'bg-amber-900/30 border-amber-700/30' : 'bg-slate-700/30 border-slate-600/30'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative bg-slate-800 border border-slate-600 rounded-xl p-4 w-[420px] max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{source?.api ?? panelId}</h3>
            <span className="text-[10px] text-slate-500">{source?.source ?? ''}</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg leading-none p-1">&times;</button>
        </div>

        {source?.description && (
          <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">{source.description}</p>
        )}

        {fields && fields.length > 0 && (
          <div className="mb-3">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-medium">Data fields</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {fields.map(f => (
                <span key={f} className="px-1.5 py-px bg-slate-700/50 border border-slate-600/40 rounded text-[9px] text-slate-400">{f}</span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <button onClick={checkHealth} disabled={healthStatus === 'checking'}
            className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors ${healthBg} ${healthColor} disabled:opacity-50`}>
            {healthLabel} {healthMs !== null ? `${healthMs}ms` : ''}
          </button>

          {source?.docs && (
            <a href={source.docs} target="_blank" rel="noopener noreferrer"
              className="px-2 py-1 rounded text-[10px] font-medium bg-slate-700/30 border border-slate-600/40 text-slate-400 hover:text-indigo-400 hover:border-indigo-600/40 transition-colors">
              API Docs
            </a>
          )}

          {source?.endpoint && (
            <a href={source.endpoint} target="_blank" rel="noopener noreferrer"
              className="px-2 py-1 rounded text-[10px] font-medium bg-slate-700/30 border border-slate-600/40 text-slate-400 hover:text-indigo-400 hover:border-indigo-600/40 transition-colors">
              Endpoint
            </a>
          )}
        </div>

        {source?.endpoint && (
          <div className="bg-slate-900/50 border border-slate-700/40 rounded px-2 py-1.5 mb-2">
            <span className="text-[9px] text-slate-600 block mb-0.5">Endpoint</span>
            <code className="text-[9px] text-slate-400 break-all font-mono">{source.endpoint}</code>
          </div>
        )}
      </div>
    </div>
  )
}

interface FlatApi {
  id: string
  label: string
  catLabel: string
  config: typeof API_IDENTIFIER_CONFIGS[number] | undefined
  params: typeof API_PARAMETERS[string] | undefined
  source: ReturnType<typeof getPanelSource>
}

export function AdvancedSearchPanel({ searchType, onSearchTypeChange, apiOverrides, onApiOverrideChange, onResetOverrides, apiParams, onApiParamChange, onResetParams }: AdvancedSearchPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [activeCat, setActiveCat] = useState<CategoryId | null>(null)
  const [detailPanel, setDetailPanel] = useState<string | null>(null)
  const current = SEARCH_TYPES.find(t => t.value === searchType) ?? SEARCH_TYPES[0]
  const totalCustomized = Object.keys(apiOverrides).length + Object.keys(apiParams).filter(k => Object.keys(apiParams[k]).length > 0).length

  const flatApis = useMemo<FlatApi[]>(() => {
    const list: FlatApi[] = []
    try {
      for (const cat of CATEGORIES) {
        for (const p of cat.panels) {
          try {
            const config = API_IDENTIFIER_CONFIGS.find(c => c.panelId === p.id)
            const params = API_PARAMETERS[p.id]
            if (config || params) {
              list.push({ id: p.id, label: config?.label ?? p.title ?? p.id, catLabel: CAT_LABELS[cat.id] ?? cat.label ?? cat.id, config, params, source: getPanelSource(p.id) })
            }
          } catch { /* skip broken panels */ }
        }
      }
    } catch { /* return empty list on error */ }
    return list
  }, [])

  const filtered = useMemo(() => {
    let list = flatApis
    if (activeCat) list = list.filter(a => PANEL_TO_CAT[a.id] === activeCat)
    if (filter.trim()) {
      const q = filter.toLowerCase()
      list = list.filter(a => a.label.toLowerCase().includes(q) || a.id.toLowerCase().includes(q))
    }
    return list
  }, [flatApis, activeCat, filter])

  const detailSource = detailPanel ? getPanelSource(detailPanel) : null

  return (
    <div className="w-full mt-2">
      <button onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors py-1">
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        Advanced search
        {searchType !== 'name' && (
          <span className="px-1.5 py-0.5 rounded bg-indigo-900/40 text-indigo-300 text-[10px] font-mono">{current.label}</span>
        )}
        {totalCustomized > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 text-[10px]">{totalCustomized} customized</span>
        )}
        {totalCustomized > 0 && !isOpen && (
          <button onClick={(e) => { e.stopPropagation(); onResetOverrides(); onResetParams() }}
            className="text-[10px] text-red-400/70 hover:text-red-400 transition-colors px-1.5 py-0.5 rounded border border-red-800/40 hover:border-red-700/60">
            Reset
          </button>
        )}
      </button>

      {isOpen && (
        <div className="mt-2 p-3 bg-slate-800/60 border border-slate-700 rounded-xl space-y-3">
          <div>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {SEARCH_TYPES.map(type => (
                <button key={type.value} onClick={() => onSearchTypeChange(type.value)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all border ${
                    searchType === type.value
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-800/50 border-slate-700 hover:border-slate-600'
                  }`}>
                  {type.label}
                </button>
              ))}
            </div>
            {searchType !== 'name' && (
              <p className="text-[10px] text-slate-600">
                <span className="text-slate-500">{current.description}</span> &mdash; <span className="font-mono text-slate-400">{current.placeholder}</span>
              </p>
            )}
          </div>

          <div className="border-t border-slate-700/50 pt-2">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Per-API settings</span>
              <div className="flex items-center gap-2">
                {totalCustomized > 0 && (
                  <button onClick={() => { onResetOverrides(); onResetParams() }}
                    className="text-[10px] text-red-400/70 hover:text-red-400 transition-colors px-1.5 py-px rounded border border-red-800/40 hover:border-red-700/60">
                    Reset all
                  </button>
                )}
                <input type="text" value={filter} onChange={e => setFilter(e.target.value)}
                  placeholder="Filter..."
                  className="bg-slate-700/50 border border-slate-600/50 rounded text-[10px] text-slate-300 px-2 py-px w-20 placeholder-slate-600 focus:outline-none focus:border-slate-500" />
              </div>
            </div>

            <div className="flex gap-1 mb-1.5 flex-wrap">
              <button onClick={() => setActiveCat(null)}
                className={`px-1.5 py-px rounded text-[9px] font-medium transition-colors ${activeCat === null ? 'bg-slate-600 text-slate-200' : 'text-slate-500 hover:text-slate-300'}`}>
                All
              </button>
              {CAT_TABS.map(cat => (
                <button key={cat.id} onClick={() => setActiveCat(activeCat === cat.id ? null : cat.id)}
                  className={`px-1.5 py-px rounded text-[9px] font-medium transition-colors ${activeCat === cat.id ? 'bg-slate-600 text-slate-200' : 'text-slate-500 hover:text-slate-300'}`}>
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="max-h-[28rem] overflow-y-auto overflow-x-auto -mx-3 px-3">
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left text-slate-600 font-medium py-1 pr-2 whitespace-nowrap uppercase tracking-wider text-[8px]">API</th>
                    <th className="text-left text-slate-600 font-medium py-1 pr-2 whitespace-nowrap uppercase tracking-wider text-[8px] w-6">Cat</th>
                    <th className="text-left text-slate-600 font-medium py-1 pr-1 whitespace-nowrap uppercase tracking-wider text-[8px]">Identifier</th>
                    <th className="text-left text-slate-600 font-medium py-1 pl-1 whitespace-nowrap uppercase tracking-wider text-[8px]">Params</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(api => {
                    const override = apiOverrides[api.id]
                    const defaultType = api.config?.defaultType ?? 'name'
                    const selectedType = override ?? defaultType
                    const supportedTypes = api.config?.supportedTypes ?? ['name']
                    const hasIdOverride = !!override
                    const currentParams = apiParams[api.id] ?? {}
                    const hasParamChanges = Object.keys(currentParams).length > 0
                    const isModified = hasIdOverride || hasParamChanges

                    return (
                      <tr key={api.id}
                        className={`border-b border-slate-800/30 whitespace-nowrap transition-colors ${isModified ? 'bg-slate-700/15' : 'hover:bg-slate-700/10'}`}>
                        <td className="py-[3px] pr-2 whitespace-nowrap">
                          <button onClick={() => setDetailPanel(api.id)}
                            className={`text-left hover:underline decoration-slate-500 underline-offset-2 ${isModified ? 'text-amber-300/90' : 'text-slate-300'} font-medium`}>
                            {api.label}
                          </button>
                        </td>
                        <td className="py-[3px] pr-2 whitespace-nowrap text-slate-600">{api.catLabel}</td>
                        <td className="py-[3px] pr-1 whitespace-nowrap">
                          <span className="inline-flex gap-px">
                            {supportedTypes.map(idType => {
                              const label = IDENTIFIER_TYPE_LABELS[idType]
                              const isActive = selectedType === idType
                              const isDefault = idType === defaultType
                              return (
                                <button key={idType} onClick={() => onApiOverrideChange(api.id, idType)}
                                  className={`px-1 py-px rounded transition-all text-[9px] leading-[14px] ${
                                    isActive
                                      ? isDefault && !hasIdOverride
                                        ? 'bg-slate-600/80 text-slate-300'
                                        : 'bg-amber-700/50 text-amber-200 border border-amber-600/30'
                                      : 'text-slate-600 hover:text-slate-400 hover:bg-slate-700/40'
                                  }`}>
                                  {label.short}
                                </button>
                              )
                            })}
                          </span>
                        </td>
                        <td className="py-[3px] pl-1 whitespace-nowrap">
                          <ParamCell panelId={api.id} params={api.params} currentParams={currentParams} onParamChange={onApiParamChange} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-3 text-[10px] text-slate-600">No APIs match filter</div>
            )}
          </div>
        </div>
      )}

      {detailPanel && (
        <ApiDetailDrawer
          panelId={detailPanel}
          source={detailSource}
          onClose={() => setDetailPanel(null)}
        />
      )}
    </div>
  )
}