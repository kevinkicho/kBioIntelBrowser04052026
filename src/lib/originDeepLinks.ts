/**
 * Deep links for Discover/board origin chips and Evidence Pack chips
 * → source search or record pages.
 * Prefer molecule-specific URLs (CID / name / ChEMBL) over bare homepages.
 */

export interface OriginLinkContext {
  /** Display name of the molecule */
  name?: string | null
  /** PubChem CID */
  cid?: number | null
  /** ChEMBL id e.g. CHEMBL25 */
  chemblId?: string | null
  /** Disease / indication name when known (Discover disease context) */
  diseaseName?: string | null
  /** Gene symbol for target-oriented sources */
  geneSymbol?: string | null
}

export interface OriginDeepLink {
  /** Chip label (unchanged source string) */
  label: string
  /** External deep URL, or null if no safe link */
  href: string | null
  /** Tooltip */
  title: string
}

/** Minimal disease shape for pack/board disease chips. */
export interface DiseaseLinkInput {
  name?: string | null
  id?: string | null
  idNamespace?: string | null
  xrefs?: Array<{ system: string; id: string }> | null
}

function enc(s: string): string {
  return encodeURIComponent(s)
}

function chemblSearch(ctx: OriginLinkContext): string | null {
  if (ctx.chemblId?.trim()) {
    const id = ctx.chemblId.trim().toUpperCase().startsWith('CHEMBL')
      ? ctx.chemblId.trim().toUpperCase()
      : `CHEMBL${ctx.chemblId.trim()}`
    return `https://www.ebi.ac.uk/chembl/compound_report_card/${id}/`
  }
  if (ctx.cid != null && ctx.cid > 0) {
    return `https://www.ebi.ac.uk/chembl/g/#search_results/all/query=${enc(String(ctx.cid))}`
  }
  if (ctx.name?.trim()) {
    return `https://www.ebi.ac.uk/chembl/g/#search_results/all/query=${enc(ctx.name.trim())}`
  }
  return null
}

/**
 * Map origin / evidence-breadth source labels to deep-research URLs.
 * Accepts both domain origins (`dgidb`) and display labels (`DGIdb`, `ClinicalTrials`).
 */
export function originSourceDeepLink(
  source: string,
  ctx: OriginLinkContext = {},
): OriginDeepLink {
  const label = source
  const raw = source.trim()
  const key = raw.toLowerCase().replace(/[_/]+/g, ' ').replace(/\s+/g, ' ').trim()
  const name = ctx.name?.trim() || ''
  const disease = ctx.diseaseName?.trim() || ''
  const gene = ctx.geneSymbol?.trim() || ''
  const cid = ctx.cid != null && ctx.cid > 0 ? ctx.cid : null
  const q = name || disease || gene

  // --- PubChem / similarity ---
  if (
    key === 'pubchem' ||
    key.includes('pubchem') ||
    key === 'similarity' ||
    key.includes('pubchem-similarity') ||
    key.includes('pubchem similarity')
  ) {
    if (cid) {
      const href =
        key.includes('similar')
          ? `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}#section=Similar-Compounds`
          : `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`
      return { label, href, title: `Open PubChem compound ${cid}` }
    }
    if (name) {
      return {
        label,
        href: `https://pubchem.ncbi.nlm.nih.gov/#query=${enc(name)}`,
        title: `Search PubChem for ${name}`,
      }
    }
  }

  // --- DGIdb ---
  if (key === 'dgidb' || key.includes('dgidb')) {
    const term = gene || name
    if (term) {
      return {
        label,
        href: `https://www.dgidb.org/search?searchType=interactions&searchTerms=${enc(term)}`,
        title: `DGIdb interactions for ${term}`,
      }
    }
    return {
      label,
      href: 'https://www.dgidb.org/search',
      title: 'DGIdb search',
    }
  }

  // --- ClinicalTrials.gov ---
  if (
    key.includes('clinicaltrial') ||
    key.includes('clinical trial') ||
    key.includes('clinicaltrials') ||
    key === 'ct.gov'
  ) {
    const term = [name, disease].filter(Boolean).join(' ')
    if (term) {
      return {
        label,
        href: `https://clinicaltrials.gov/search?term=${enc(term)}&aggFilters=status:rec%20act%20not`,
        title: `ClinicalTrials.gov search: ${term}`,
      }
    }
    return {
      label,
      href: 'https://clinicaltrials.gov/',
      title: 'ClinicalTrials.gov',
    }
  }

  // --- ChEMBL ---
  if (key.includes('chembl')) {
    const href = chemblSearch(ctx)
    return {
      label,
      href,
      title: href ? `ChEMBL: ${name || ctx.chemblId || cid}` : 'ChEMBL',
    }
  }

  // --- Open Targets ---
  if (key.includes('open target') || key.includes('opentargets') || key.includes('opentarget')) {
    if (disease) {
      return {
        label,
        href: `https://platform.opentargets.org/search?q=${enc(disease)}&page=1`,
        title: `Open Targets search: ${disease}`,
      }
    }
    if (gene) {
      return {
        label,
        href: `https://platform.opentargets.org/search?q=${enc(gene)}&page=1`,
        title: `Open Targets search: ${gene}`,
      }
    }
    if (name) {
      return {
        label,
        href: `https://platform.opentargets.org/search?q=${enc(name)}&page=1`,
        title: `Open Targets search: ${name}`,
      }
    }
  }

  // --- BindingDB ---
  if (key.includes('bindingdb') || key.includes('binding-db') || key.includes('binding db')) {
    if (name) {
      return {
        label,
        href: `https://www.bindingdb.org/rwd/bind/chemsearch/marvin/MolStructure.jsp?monomerid=&submit=Search&smiles=&name=${enc(name)}`,
        title: `BindingDB search: ${name}`,
      }
    }
    // Reliable entry: compound name search landing
    return {
      label,
      href: 'https://www.bindingdb.org/rwd/bind/chemsearch/marvin/AdvancedSearch.jsp',
      title: 'BindingDB advanced search',
    }
  }

  // --- DisGeNET ---
  if (key.includes('disgenet')) {
    const term = gene || disease || name
    if (term) {
      return {
        label,
        href: `https://www.disgenet.org/browser/0/1/0/${enc(term)}/0/25/0/`,
        title: `DisGeNET: ${term}`,
      }
    }
  }

  // --- Orphanet ---
  if (key.includes('orphan')) {
    const term = disease || name
    if (term) {
      return {
        label,
        href: `https://www.orpha.net/en/disease/search?s=${enc(term)}`,
        title: `Orphanet: ${term}`,
      }
    }
  }

  // --- UniProt ---
  if (key.includes('uniprot')) {
    const term = gene || name
    if (term) {
      return {
        label,
        href: `https://www.uniprot.org/uniprotkb?query=${enc(term)}`,
        title: `UniProt: ${term}`,
      }
    }
  }

  // --- EuropePMC / literature ---
  if (key.includes('europepmc') || key.includes('europe pmc') || key.includes('literature')) {
    const term = [name, disease].filter(Boolean).join(' ')
    if (term) {
      return {
        label,
        href: `https://europepmc.org/search?query=${enc(term)}`,
        title: `Europe PMC: ${term}`,
      }
    }
  }

  // --- PubMed ---
  if (key.includes('pubmed')) {
    const term = [name, disease].filter(Boolean).join(' ')
    if (term) {
      return {
        label,
        href: `https://pubmed.ncbi.nlm.nih.gov/?term=${enc(term)}`,
        title: `PubMed: ${term}`,
      }
    }
  }

  // --- openFDA / FAERS / labels ---
  if (key.includes('openfda') || key.includes('faers') || key.includes('adverse') || key.includes('dailymed')) {
    if (name) {
      return {
        label,
        href: `https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${enc(name)}`,
        title: `DailyMed labels for ${name}`,
      }
    }
  }

  // --- DrugCentral ---
  if (key.includes('drugcentral')) {
    if (name) {
      return {
        label,
        href: `https://drugcentral.org/?q=${enc(name)}`,
        title: `DrugCentral: ${name}`,
      }
    }
  }

  // --- IUPHAR / GtoPdb ---
  if (key.includes('iuphar') || key.includes('gtopdb') || key.includes('guidetopharmacology')) {
    if (name || gene) {
      const term = name || gene
      return {
        label,
        href: `https://www.guidetopharmacology.org/GRAC/DatabaseSearchForward?searchString=${enc(term!)}&searchCategories=all&species=Human&type=all`,
        title: `IUPHAR/BPS Guide to Pharmacology: ${term}`,
      }
    }
  }

  // --- Reactome ---
  if (key.includes('reactome')) {
    const term = gene || name
    if (term) {
      return {
        label,
        href: `https://reactome.org/content/query?q=${enc(term)}&species=Homo%20sapiens&species=Entries%20without%20species&cluster=true`,
        title: `Reactome: ${term}`,
      }
    }
  }

  // --- Internal / non-deep-linkable ---
  if (
    key === 'manual' ||
    key.includes('hypothesis') ||
    key.includes('pinned') ||
    key.includes('board')
  ) {
    return {
      label,
      href: null,
      title: 'Internal origin (no external deep link)',
    }
  }

  // --- Fallback: search Open Targets + name, or PubChem name ---
  if (q) {
    if (cid) {
      return {
        label,
        href: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
        title: `${label} → PubChem CID ${cid} (generic deep link)`,
      }
    }
    return {
      label,
      href: `https://pubchem.ncbi.nlm.nih.gov/#query=${enc(q)}`,
      title: `${label} → PubChem search for ${q}`,
    }
  }

  return {
    label,
    href: null,
    title: `${label} — no molecule context for a deep link`,
  }
}

/**
 * Deep link for a disease chip (pack header / project disease).
 * Prefers Open Targets disease page when an EFO/OT id is available.
 */
export function diseaseDeepLink(disease: DiseaseLinkInput): OriginDeepLink {
  const name = disease.name?.trim() || ''
  const label = name || disease.id?.trim() || 'disease'
  const ns = (disease.idNamespace || '').toLowerCase()
  const id = disease.id?.trim() || ''

  const otXref = disease.xrefs?.find(
    (x) =>
      x.system &&
      x.id &&
      ['ot', 'efo', 'mondo', 'open targets', 'opentargets'].includes(x.system.toLowerCase()),
  )
  const otId =
    otXref?.id ||
    (ns === 'ot' || ns === 'efo' || ns === 'mondo' ? id : null) ||
    (id && /^(EFO|MONDO|Orphanet|OTAR)[_:]/i.test(id) ? id : null)

  if (otId) {
    return {
      label,
      href: `https://platform.opentargets.org/disease/${enc(otId)}`,
      title: `Open Targets disease: ${otId}`,
    }
  }

  if (ns === 'orphanet' && id) {
    return {
      label,
      href: `https://www.orpha.net/en/disease/list/name/${enc(id)}`,
      title: `Orphanet: ${id}`,
    }
  }

  if (name) {
    return {
      label,
      href: `https://platform.opentargets.org/search?q=${enc(name)}&page=1`,
      title: `Open Targets search: ${name}`,
    }
  }

  return {
    label,
    href: null,
    title: 'No disease context for a deep link',
  }
}

/**
 * Deep link for EvidenceClaimType chips in pack view.
 * Routes each facet to a representative free public source search/page.
 */
export function claimTypeDeepLink(
  claimType: string,
  ctx: OriginLinkContext = {},
): OriginDeepLink {
  const type = claimType.trim().toLowerCase()
  const label = claimType
  const name = ctx.name?.trim() || ''
  const disease = ctx.diseaseName?.trim() || ''
  const gene = ctx.geneSymbol?.trim() || ''
  const cid = ctx.cid != null && ctx.cid > 0 ? ctx.cid : null

  switch (type) {
    case 'binds-target':
    case 'mechanism': {
      const chembl = chemblSearch(ctx)
      if (chembl) {
        return {
          label,
          href: chembl,
          title: `ChEMBL (${type}): ${name || ctx.chemblId || cid || 'search'}`,
        }
      }
      break
    }
    case 'trial': {
      const term = [name, disease].filter(Boolean).join(' ')
      if (term) {
        return {
          label,
          href: `https://clinicaltrials.gov/search?term=${enc(term)}&aggFilters=status:rec%20act%20not`,
          title: `ClinicalTrials.gov: ${term}`,
        }
      }
      return {
        label,
        href: 'https://clinicaltrials.gov/',
        title: 'ClinicalTrials.gov',
      }
    }
    case 'safety': {
      if (name) {
        return {
          label,
          href: `https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${enc(name)}`,
          title: `DailyMed / labels: ${name}`,
        }
      }
      break
    }
    case 'indicated-for': {
      const term = disease || name
      if (term) {
        return {
          label,
          href: `https://platform.opentargets.org/search?q=${enc(term)}&page=1`,
          title: `Open Targets: ${term}`,
        }
      }
      break
    }
    case 'literature': {
      const term = [name, disease, gene].filter(Boolean).join(' ')
      if (term) {
        return {
          label,
          href: `https://europepmc.org/search?query=${enc(term)}`,
          title: `Europe PMC: ${term}`,
        }
      }
      break
    }
    case 'property':
    case 'other': {
      if (cid) {
        return {
          label,
          href: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
          title: `PubChem CID ${cid}`,
        }
      }
      if (name) {
        return {
          label,
          href: `https://pubchem.ncbi.nlm.nih.gov/#query=${enc(name)}`,
          title: `PubChem search: ${name}`,
        }
      }
      break
    }
    default:
      break
  }

  // Fallback: reuse source mapper with claim type as a soft key
  const viaSource = originSourceDeepLink(claimType, ctx)
  if (viaSource.href) {
    return { label, href: viaSource.href, title: viaSource.title }
  }

  return {
    label,
    href: null,
    title: `${label} — no context for a deep link`,
  }
}

/**
 * Prefer explicit claim provenance URL; otherwise map provenance.source via origin mapper.
 */
export function claimProvenanceDeepLink(
  provenance: { source: string; sourceUrl?: string | null },
  ctx: OriginLinkContext = {},
): OriginDeepLink {
  const label = provenance.source
  if (provenance.sourceUrl?.trim()) {
    return {
      label,
      href: provenance.sourceUrl.trim(),
      title: `Open source: ${label}`,
    }
  }
  return originSourceDeepLink(provenance.source, ctx)
}
