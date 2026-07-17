/**
 * Deep-link catalog search URLs for chemical vendors.
 * Prefer query-string search endpoints that land on results pages
 * without re-typing the molecule name / CAS / CID.
 *
 * Placeholders (always URI-encoded where used in query strings):
 *   {name}  — display name or synonym
 *   {cas}   — CAS RN if known, else falls back to name
 *   {cid}   — PubChem CID
 *   {inchikey} / {inchikey_raw}
 *
 * @see Order Compound panel, /api/molecule/[id]/vendors
 */

export interface CatalogLinkVars {
  name: string
  cid?: number | null
  cas?: string | null
  inchiKey?: string | null
}

export interface CatalogLink {
  name: string
  url: string
  hint: string
}

export interface CatalogTemplate {
  /** Match PubChem SourceName / chip label */
  pattern: RegExp
  name: string
  /** Prefer patterns verified to return search results (not 404). */
  urlTemplate: string
  hint?: string
}

/**
 * Fill template. `{name}` and `{cas}` are encodeURIComponent'd.
 * `{cid}` and `{inchikey_raw}` are not double-encoded.
 */
export function fillCatalogTemplate(template: string, vars: CatalogLinkVars): string {
  const nameEnc = encodeURIComponent(vars.name.trim() || String(vars.cid || ''))
  const casRaw = (vars.cas && vars.cas.trim()) || vars.name.trim() || String(vars.cid || '')
  const casEnc = encodeURIComponent(casRaw)
  const cid = vars.cid && vars.cid > 0 ? String(vars.cid) : ''
  const ik = vars.inchiKey || ''
  // Path slug: prefer safer unencoded alnum-ish; still encode fully for safety
  const pathSlug = nameEnc
  return template
    .split('{name}').join(nameEnc)
    .split('{cas}').join(casEnc)
    .split('{path}').join(pathSlug)
    .split('{cid}').join(cid)
    .split('{inchikey}').join(encodeURIComponent(ik))
    .split('{inchikey_raw}').join(ik)
}

/**
 * Supplier catalog templates — query-param based where possible.
 * Updated 2026-07 after 404 audit of path-style legacy URLs.
 */
export const SUPPLIER_CATALOG_TEMPLATES: CatalogTemplate[] = [
  {
    pattern: /\bSigma-Aldrich\b|MilliporeSigma|Merck\s*KGaA/i,
    name: 'Sigma-Aldrich',
    // MilliporeSigma: path slug + term + type=product lands on product results
    urlTemplate:
      'https://www.sigmaaldrich.com/US/en/search/{path}?focus=products&page=1&perpage=30&sort=relevance&term={name}&type=product',
    hint: 'MilliporeSigma product search',
  },
  {
    pattern: /\bTCI\b.*Chemical|Tokyo Chemical/i,
    name: 'TCI Chemicals',
    urlTemplate: 'https://www.tcichemicals.com/US/en/search?text={name}',
    hint: 'TCI catalog text search',
  },
  {
    pattern: /\bFisher\s*(Scientific|Chem)/i,
    name: 'Fisher Scientific',
    urlTemplate: 'https://www.fishersci.com/us/en/catalog/search/products?keyword={name}',
    hint: 'Fisher catalog product search',
  },
  {
    pattern: /\bAcros\s*Organics\b/i,
    name: 'Acros Organics',
    urlTemplate: 'https://www.fishersci.com/us/en/catalog/search/products?keyword={name}',
    hint: 'Via Fisher Scientific catalog',
  },
  {
    pattern: /\bThermo\s*Fisher/i,
    name: 'Thermo Fisher Scientific',
    urlTemplate: 'https://www.thermofisher.com/search/results?query={name}',
    hint: 'Thermo Fisher results page',
  },
  {
    pattern: /\bAlfa\s*(Aesar|Chemistry)/i,
    name: 'Alfa Aesar',
    // Alfa is Thermo-hosted; /en/search/?q= works
    urlTemplate: 'https://www.alfa.com/en/search/?q={name}',
    hint: 'Alfa Aesar (Thermo) search',
  },
  {
    pattern: /\bCayman\s*Chem/i,
    name: 'Cayman Chemical',
    urlTemplate: 'https://www.caymanchem.com/product/s?term={name}',
    hint: 'Cayman product search',
  },
  {
    pattern: /\bSelleck(?:Chem)?\b/i,
    name: 'Selleck Chemicals',
    urlTemplate:
      'https://www.selleckchem.com/search.html?searchDTO.searchValue={name}&searchDTO.searchSites=Selleck',
    hint: 'Selleck inhibitors search',
  },
  {
    pattern: /\bMedChem\s*Express\b|MCE\b/i,
    name: 'MedChemExpress',
    urlTemplate: 'https://www.medchemexpress.com/search.html?q={name}&ft=&fa=&f=1',
    hint: 'MCE catalog search',
  },
  {
    pattern: /\bEnamine\b/i,
    name: 'Enamine',
    urlTemplate: 'https://enamine.net/search?q={name}',
    hint: 'Enamine building blocks search',
  },
  {
    pattern: /\bTargetMol\b/i,
    name: 'TargetMol',
    urlTemplate: 'https://www.targetmol.com/search?keyword={name}',
    hint: 'TargetMol keyword search',
  },
  {
    pattern: /\bMolPort\b/i,
    name: 'MolPort',
    // Site is SPA; name search is embedded in hash/query on find-chemicals
    urlTemplate: 'https://www.molport.com/shop/find-chemicals?searchTerm={name}',
    hint: 'MolPort marketplace search',
  },
  {
    pattern: /\beMolecules?\b/i,
    name: 'eMolecules',
    urlTemplate: 'https://www.emolecules.com/#/search/{path}',
    hint: 'eMolecules free-text search',
  },
  {
    pattern: /\bAmbeed\b/i,
    name: 'Ambeed',
    urlTemplate: 'https://www.ambeed.com/products.html?search={name}',
    hint: 'Ambeed product search',
  },
  {
    pattern: /\bBLD\s*Pharm/i,
    name: 'BLD Pharmatech',
    urlTemplate: 'https://www.bldpharm.com/search.html?searchKeyword={name}',
    hint: 'BLD catalog search',
  },
  {
    pattern: /\bAK\s*Scientific/i,
    name: 'AK Scientific',
    urlTemplate: 'https://aksci.com/searchresult.php?searchall=1&searchName={name}',
    hint: 'AK Scientific search',
  },
  {
    pattern: /\bCombi-?Blocks\b/i,
    name: 'Combi-Blocks',
    urlTemplate: 'https://www.combiblocks.com/search?q={name}',
    hint: 'Combi-Blocks search',
  },
  {
    pattern: /\bChemBridge\b/i,
    name: 'ChemBridge',
    urlTemplate: 'https://www.hit2lead.com/search.do?searchString={name}',
    hint: 'ChemBridge Hit2Lead search',
  },
  {
    pattern: /\bBOC\s*Sciences\b/i,
    name: 'BOC Sciences',
    urlTemplate: 'https://www.bocsci.com/search?q={name}',
    hint: 'BOC Sciences search',
  },
  {
    pattern: /\bApexBio\b/i,
    name: 'ApexBio',
    urlTemplate: 'https://www.apexbt.com/catalogsearch/result/?q={name}',
    hint: 'ApexBio search',
  },
  {
    pattern: /\bMedKoo\b/i,
    name: 'MedKoo',
    urlTemplate: 'https://www.medkoo.com/products?utf8=%E2%9C%93&search={name}',
    hint: 'MedKoo products search',
  },
  {
    pattern: /\bBenchChem\b/i,
    name: 'BenchChem',
    urlTemplate: 'https://www.benchchem.com/product/search?q={name}',
    hint: 'BenchChem search',
  },
  {
    pattern: /\bKey\s*Organics/i,
    name: 'Key Organics / BIONET',
    urlTemplate: 'https://www.keyorganics.net/services/custom-bionet-search.html?search={name}',
    hint: 'Key Organics / BIONET',
  },
  {
    pattern: /\bLife\s*Chemicals?\b/i,
    name: 'Life Chemicals',
    urlTemplate: 'https://lifechemicals.com/screening-libraries/search?query={name}',
    hint: 'Life Chemicals search',
  },
  {
    pattern: /\bChemDiv\b/i,
    name: 'ChemDiv',
    urlTemplate: 'https://www.chemdiv.com/catalog/search/?q={name}',
    hint: 'ChemDiv catalog',
  },
]

/** Curated quick-order set (Order Compound panel). */
export const ORDER_PANEL_VENDORS: { name: string; urlTemplate: string; hint: string }[] = [
  {
    name: 'Sigma-Aldrich',
    urlTemplate:
      'https://www.sigmaaldrich.com/US/en/search/{path}?focus=products&page=1&perpage=30&sort=relevance&term={name}&type=product',
    hint: 'Product results (name / CAS)',
  },
  {
    name: 'TCI Chemicals',
    urlTemplate: 'https://www.tcichemicals.com/US/en/search?text={name}',
    hint: 'Catalog text search',
  },
  {
    name: 'Fisher Scientific',
    urlTemplate: 'https://www.fishersci.com/us/en/catalog/search/products?keyword={name}',
    hint: 'Catalog product search',
  },
  {
    name: 'Thermo Fisher',
    urlTemplate: 'https://www.thermofisher.com/search/results?query={name}',
    hint: 'Search results page',
  },
  {
    name: 'Cayman Chemical',
    urlTemplate: 'https://www.caymanchem.com/product/s?term={name}',
    hint: 'Product search results',
  },
  {
    name: 'Selleck Chemicals',
    urlTemplate:
      'https://www.selleckchem.com/search.html?searchDTO.searchValue={name}&searchDTO.searchSites=Selleck',
    hint: 'Inhibitor catalog results',
  },
  {
    name: 'MedChemExpress',
    urlTemplate: 'https://www.medchemexpress.com/search.html?q={name}&ft=&fa=&f=1',
    hint: 'MCE search results',
  },
  {
    name: 'Enamine',
    urlTemplate: 'https://enamine.net/search?q={name}',
    hint: 'Building-block search results',
  },
  {
    name: 'TargetMol',
    urlTemplate: 'https://www.targetmol.com/search?keyword={name}',
    hint: 'Keyword search results',
  },
  {
    name: 'eMolecules',
    urlTemplate: 'https://www.emolecules.com/#/search/{path}',
    hint: 'Free-text catalog search',
  },
  {
    name: 'Alfa Aesar',
    urlTemplate: 'https://www.alfa.com/en/search/?q={name}',
    hint: 'Thermo/Alfa catalog search',
  },
]

/**
 * Build Order Compound catalog chips.
 * Prefer CAS in the search term when available (better vendor hits).
 */
export function buildOrderCatalogLinks(vars: CatalogLinkVars): CatalogLink[] {
  const searchName = (vars.cas && vars.cas.trim()) || vars.name
  const filledVars: CatalogLinkVars = { ...vars, name: searchName }
  const links: CatalogLink[] = ORDER_PANEL_VENDORS.map((v) => ({
    name: v.name,
    url: fillCatalogTemplate(v.urlTemplate, filledVars),
    hint: v.hint,
  }))
  if (vars.cid && vars.cid > 0) {
    links.push({
      name: 'PubChem (CID)',
      url: `https://pubchem.ncbi.nlm.nih.gov/compound/${vars.cid}`,
      hint: 'Identity + Chemical Vendors section',
    })
    links.push({
      name: 'PubChem Vendors',
      url: `https://pubchem.ncbi.nlm.nih.gov/compound/${vars.cid}#section=Chemical-Vendors`,
      hint: 'PubChem vendor cross-refs (deep section)',
    })
  }
  if (vars.cas) {
    // CAS-specific Sigma often resolves better than long IUPAC names
    links.unshift({
      name: 'Sigma (CAS)',
      url: fillCatalogTemplate(
        'https://www.sigmaaldrich.com/US/en/search/{path}?focus=products&page=1&perpage=30&sort=relevance&term={cas}&type=cas_number',
        { ...vars, name: vars.cas },
      ),
      hint: `CAS ${vars.cas} product search`,
    })
  }
  return links
}

/** Match a PubChem source name to a supplier template URL, or null. */
export function supplierUrlForSource(
  sourceName: string,
  vars: CatalogLinkVars,
): { name: string; url: string } | null {
  for (const t of SUPPLIER_CATALOG_TEMPLATES) {
    if (t.pattern.test(sourceName)) {
      return { name: t.name, url: fillCatalogTemplate(t.urlTemplate, vars) }
    }
  }
  return null
}

/** Extract first CAS RN from synonym list (###-##-# pattern). */
export function extractCasFromSynonyms(synonyms: string[] | undefined | null): string | null {
  if (!synonyms?.length) return null
  const casRe = /^\d{2,7}-\d{2}-\d$/
  for (const s of synonyms) {
    const t = String(s).trim()
    if (casRe.test(t)) return t
  }
  // Sometimes "CAS-RN: 50-78-2"
  for (const s of synonyms) {
    const m = String(s).match(/\b(\d{2,7}-\d{2}-\d)\b/)
    if (m) return m[1]
  }
  return null
}
