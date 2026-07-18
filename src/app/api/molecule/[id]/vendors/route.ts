import { NextRequest, NextResponse } from 'next/server'
import {
  extractCasFromSynonyms,
  fillCatalogTemplate,
  SUPPLIER_CATALOG_TEMPLATES,
  type CatalogLinkVars,
} from '@/lib/vendorCatalogLinks'

const CACHE_DURATION = 86400

interface VendorResult {
  name: string
  /** Molecule-specific deep link (never bare homepage). */
  url: string | null
  sourceType: 'supplier' | 'database'
}

/**
 * Reference / deposit databases — molecule-specific URL templates only.
 * Placeholders: {name}, {cid}, {inchikey}, {inchikey_raw}, {cas}
 */
const DATABASE_TEMPLATES: { pattern: RegExp; name: string; urlTemplate: string }[] = [
  { pattern: /^ChemSpider$/i, name: 'ChemSpider', urlTemplate: 'https://www.chemspider.com/Search.aspx?q={name}' },
  { pattern: /^ZINC$/i, name: 'ZINC', urlTemplate: 'https://zinc.docking.org/substances/search/?q={name}' },
  { pattern: /SureChEMBL/i, name: 'SureChEMBL', urlTemplate: 'https://www.surechembl.org/search/?q={name}' },
  { pattern: /^ChEBI$/i, name: 'ChEBI', urlTemplate: 'https://www.ebi.ac.uk/chebi/advancedSearchFT.do?searchString={name}' },
  { pattern: /NIST.*Chemistry|Chemistry WebBook/i, name: 'NIST WebBook', urlTemplate: 'https://webbook.nist.gov/cgi/cbook.cgi?Name={name}&Units=SI' },
  { pattern: /CompTox|EPA DSSTox|DSSTox/i, name: 'EPA CompTox', urlTemplate: 'https://comptox.epa.gov/dashboard/chemical/search?search={name}' },
  { pattern: /^FooDB$/i, name: 'FooDB', urlTemplate: 'https://foodb.ca/unearth/q?utf8=%E2%9C%93&query={name}&searcher=compounds' },
  { pattern: /MassBank/i, name: 'MassBank', urlTemplate: 'https://massbank.eu/MassBank/Search?query={name}' },
  { pattern: /^MoNA$/i, name: 'MoNA', urlTemplate: 'https://mona.fiehnlab.ucdavis.edu/#/spectra/browse?query=compound.names=q=%22{name}%22' },
  { pattern: /Human Metabolome|HMDB/i, name: 'HMDB', urlTemplate: 'https://hmdb.ca/unearth/q?utf8=%E2%9C%93&query={name}&searcher=metabolites' },
  { pattern: /DrugCentral/i, name: 'DrugCentral', urlTemplate: 'https://drugcentral.org/?q={name}' },
  { pattern: /BindingDB/i, name: 'BindingDB', urlTemplate: 'https://www.bindingdb.org/rwd/bind/chemsearch/marvin/FMServlet?search_type=ByName&name={name}' },
  { pattern: /Guide to PHARMACOLOGY|IUPHAR/i, name: 'IUPHAR/BPS', urlTemplate: 'https://www.guidetopharmacology.org/GRAC/DatabaseSearchForward?searchString={name}&searchCategories=all&species=none&type=all&comments=includeComments&order=forward' },
  { pattern: /ClinicalTrials\.gov/i, name: 'ClinicalTrials.gov', urlTemplate: 'https://clinicaltrials.gov/search?term={name}' },
  { pattern: /DailyMed/i, name: 'DailyMed', urlTemplate: 'https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query={name}' },
  { pattern: /Orange Book/i, name: 'FDA Orange Book', urlTemplate: 'https://www.accessdata.fda.gov/scripts/cder/ob/search_product.cfm' },
  { pattern: /PDB|RCSB/i, name: 'RCSB PDB', urlTemplate: 'https://www.rcsb.org/search?request=%7B%22query%22%3A%7B%22type%22%3A%22terminal%22%2C%22service%22%3A%22full_text%22%2C%22parameters%22%3A%7B%22value%22%3A%22{name}%22%7D%7D%2C%22return_type%22%3A%22entry%22%7D' },
  { pattern: /KEGG/i, name: 'KEGG', urlTemplate: 'https://www.genome.jp/dbget-bin/www_bfind_sub?mode=bfind&max_hit=1000&dbkey=kegg&keywords={name}' },
  { pattern: /DrugBank/i, name: 'DrugBank', urlTemplate: 'https://go.drugbank.com/unearth/q?utf8=%E2%9C%93&searcher=drugs&query={name}' },
  { pattern: /ChEMBL/i, name: 'ChEMBL', urlTemplate: 'https://www.ebi.ac.uk/chembl/explore/compounds/QUERYSTRING:{name}' },
  { pattern: /Wikipedia/i, name: 'Wikipedia', urlTemplate: 'https://en.wikipedia.org/w/index.php?search={name}' },
  { pattern: /ChemIDplus/i, name: 'ChemIDplus', urlTemplate: 'https://pubchem.ncbi.nlm.nih.gov/compound/{cid}' },
  { pattern: /NCI\/CADD|NCI Open/i, name: 'NCI CADD', urlTemplate: 'https://cactus.nci.nih.gov/chemical/structure/{name}/file?format=sdf' },
  { pattern: /MetaboLights/i, name: 'MetaboLights', urlTemplate: 'https://www.ebi.ac.uk/metabolights/search?freeTextQuery={name}' },
  { pattern: /LOTUS/i, name: 'LOTUS', urlTemplate: 'https://lotus.naturalproducts.net/search/simple/{name}' },
  { pattern: /NPAtlas|Natural Product Atlas/i, name: 'NP Atlas', urlTemplate: 'https://www.npatlas.org/explore/compounds?search={name}' },
  { pattern: /COCONUT/i, name: 'COCONUT', urlTemplate: 'https://coconut.naturalproducts.net/search?query={name}' },
  { pattern: /PubChem/i, name: 'PubChem', urlTemplate: 'https://pubchem.ncbi.nlm.nih.gov/compound/{cid}' },
]

const SBURL_HOST_HINTS: { host: RegExp; name: string }[] = [
  { host: /chemspider\.com/i, name: 'ChemSpider' },
  { host: /zinc\.docking\.org|zinc15\.docking\.org/i, name: 'ZINC' },
  { host: /surechembl\.org/i, name: 'SureChEMBL' },
  { host: /ebi\.ac\.uk\/chebi/i, name: 'ChEBI' },
  { host: /ebi\.ac\.uk\/chembl/i, name: 'ChEMBL' },
  { host: /webbook\.nist\.gov/i, name: 'NIST WebBook' },
  { host: /comptox\.epa\.gov/i, name: 'EPA CompTox' },
  { host: /hmdb\.ca/i, name: 'HMDB' },
  { host: /foodb\.ca/i, name: 'FooDB' },
  { host: /drugcentral\.org/i, name: 'DrugCentral' },
  { host: /bindingdb\.org/i, name: 'BindingDB' },
  { host: /guidetopharmacology\.org/i, name: 'IUPHAR/BPS' },
  { host: /clinicaltrials\.gov/i, name: 'ClinicalTrials.gov' },
  { host: /dailymed\.nlm\.nih\.gov/i, name: 'DailyMed' },
  { host: /rcsb\.org/i, name: 'RCSB PDB' },
  { host: /drugbank\.com/i, name: 'DrugBank' },
  { host: /massbank/i, name: 'MassBank' },
  { host: /mona\.fiehnlab/i, name: 'MoNA' },
  { host: /genome\.jp|kegg\.jp/i, name: 'KEGG' },
  { host: /wikipedia\.org/i, name: 'Wikipedia' },
  { host: /pubchem\.ncbi\.nlm\.nih\.gov/i, name: 'PubChem' },
]

const DATABASE_BLACKLIST = new Set(['PubChem Substance'])

function fillDbTemplate(template: string, vars: CatalogLinkVars): string {
  return fillCatalogTemplate(template, vars)
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

function isMoleculeDeepLink(url: string): boolean {
  try {
    const u = new URL(url)
    const path = u.pathname.replace(/\/+$/, '')
    if (!path || path === '') return false
    if (path.split('/').filter(Boolean).length >= 1) return true
    if (u.search && u.search.length > 1) return true
    return false
  } catch {
    return false
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const cid = parseInt(params.id, 10)
  if (isNaN(cid)) {
    return NextResponse.json({ error: 'Invalid molecule ID' }, { status: 400 })
  }

  let moleculeName: string | null = null
  let inchiKey: string | null = null
  let cas: string | null = null
  try {
    const [molRes, synRes] = await Promise.all([
      fetch(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/Title,IUPACName,InChIKey/JSON`,
        { next: { revalidate: CACHE_DURATION } },
      ),
      fetch(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`,
        { next: { revalidate: CACHE_DURATION } },
      ),
    ])
    if (molRes.ok) {
      const molData = await molRes.json()
      const props = molData.PropertyTable?.Properties?.[0]
      moleculeName = props?.Title || props?.IUPACName || null
      inchiKey = props?.InChIKey || null
    }
    if (synRes.ok) {
      const synData = await synRes.json()
      const syns: string[] =
        synData.InformationList?.Information?.[0]?.Synonym?.slice(0, 40) ?? []
      cas = extractCasFromSynonyms(syns)
    }
  } catch {
    /* non-fatal */
  }

  const displayName = moleculeName || String(cid)
  // Prefer CAS for catalog queries when present (disambiguates salts / forms)
  const searchName = cas || displayName
  const linkVars: CatalogLinkVars = {
    name: searchName,
    cid,
    cas,
    inchiKey,
  }

  let sburls: string[] = []
  try {
    const sbRes = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/xrefs/SBURL/JSON`,
      { next: { revalidate: CACHE_DURATION } },
    )
    if (sbRes.ok) {
      const sbData = await sbRes.json()
      const raw: unknown = sbData.InformationList?.Information?.[0]?.SBURL
      if (Array.isArray(raw)) {
        sburls = raw.filter((u): u is string => typeof u === 'string' && isMoleculeDeepLink(u))
      }
    }
  } catch {
    /* non-fatal */
  }

  const sburlByName = new Map<string, string>()
  for (const url of sburls) {
    const host = hostnameOf(url)
    for (const hint of SBURL_HOST_HINTS) {
      if (hint.host.test(url) || hint.host.test(host)) {
        if (!sburlByName.has(hint.name)) sburlByName.set(hint.name, url)
      }
    }
  }

  try {
    const res = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/xrefs/SourceName/JSON`,
      { next: { revalidate: CACHE_DURATION } },
    )
    if (!res.ok) {
      return NextResponse.json({
        suppliers: [],
        databases: [],
        total: 0,
        moleculeName: displayName,
        cas,
        inchiKey,
      })
    }
    const data = await res.json()
    const sources: string[] = data.InformationList?.Information?.[0]?.SourceName ?? []

    const seen = new Set<string>()
    const suppliers: VendorResult[] = []
    const databases: VendorResult[] = []

    for (const source of sources) {
      const supplierMatch = SUPPLIER_CATALOG_TEMPLATES.find((t) => t.pattern.test(source))
      if (supplierMatch) {
        if (seen.has(supplierMatch.name)) continue
        seen.add(supplierMatch.name)
        // Prefer PubChem SBURL when it is a true record deep link for this supplier
        const sb = sburls.find((u) => {
          try {
            return supplierMatch.pattern.test(u) || u.toLowerCase().includes(supplierMatch.name.split(' ')[0]!.toLowerCase())
          } catch {
            return false
          }
        })
        suppliers.push({
          name: supplierMatch.name,
          url: sb && isMoleculeDeepLink(sb)
            ? sb
            : fillCatalogTemplate(supplierMatch.urlTemplate, linkVars),
          sourceType: 'supplier',
        })
        continue
      }

      if (DATABASE_BLACKLIST.has(source)) continue

      const dbMatch = DATABASE_TEMPLATES.find((t) => t.pattern.test(source))
      const key = dbMatch ? dbMatch.name : source
      if (seen.has(key)) continue
      seen.add(key)

      let url: string | null = null
      if (dbMatch) {
        url = fillDbTemplate(dbMatch.urlTemplate, linkVars)
        if (dbMatch.urlTemplate.includes('{inchikey') && !inchiKey) {
          url = sburlByName.get(key) ?? null
        }
      }
      if (!url) url = sburlByName.get(key) ?? null
      if (!url) url = `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`

      databases.push({ name: key, url, sourceType: 'database' })
    }

    sburlByName.forEach((url, name) => {
      if (seen.has(name)) return
      seen.add(name)
      databases.push({ name, url, sourceType: 'database' })
    })

    return NextResponse.json(
      {
        suppliers,
        databases,
        total: sources.length,
        moleculeName: displayName,
        cas,
        inchiKey,
        searchTerm: searchName,
      },
      { headers: { 'Cache-Control': `public, s-maxage=${CACHE_DURATION}` } },
    )
  } catch (error) {
    console.error('[api/molecule/vendors] Error:', error)
    return NextResponse.json({ suppliers: [], databases: [], total: 0 })
  }
}
