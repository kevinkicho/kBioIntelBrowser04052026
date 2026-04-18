import { NextRequest, NextResponse } from 'next/server'

const CACHE_DURATION = 86400

interface VendorResult {
  name: string
  url: string | null
  sourceType: 'supplier' | 'database'
}

const SUPPLIER_TEMPLATES: { pattern: RegExp; name: string; urlTemplate: string }[] = [
  { pattern: /\bSigma-Aldrich\b/i, name: 'Sigma-Aldrich', urlTemplate: 'https://www.sigmaaldrich.com/US/en/search/{name}?focus=products' },
  { pattern: /\bTCI\b.*Chemical/i, name: 'TCI Chemicals', urlTemplate: 'https://www.tcichemicals.com/US/en/search/?q={name}' },
  { pattern: /\bFisher\s*Chem/i, name: 'Fisher Chemical', urlTemplate: 'https://www.fishersci.com/us/en/search/{name}' },
  { pattern: /\bThermo\s*Fisher/i, name: 'Thermo Fisher Scientific', urlTemplate: 'https://www.thermofisher.com/search?query={name}' },
  { pattern: /\bAlfa\s*(Aesar|Chemistry)/i, name: 'Alfa Aesar', urlTemplate: 'https://www.alfa.com/en/search?q={name}' },
  { pattern: /\bEnamine\b/i, name: 'Enamine', urlTemplate: 'https://enamine.net/catalog-search?term={name}' },
  { pattern: /\bMolPort\b/i, name: 'MolPort', urlTemplate: 'https://www.molport.com/shop/index/search?search_item={name}' },
  { pattern: /\bCombi-?Blocks\b/i, name: 'Combi-Blocks', urlTemplate: 'https://www.combiblocks.com/catalog/search?q={name}' },
  { pattern: /\bChemBridge\b/i, name: 'ChemBridge', urlTemplate: 'https://www.chembridge.com/search/?q={name}' },
  { pattern: /\bChemDiv\b/i, name: 'ChemDiv', urlTemplate: 'https://chemdiv.com/catalog-search?term={name}' },
  { pattern: /\bSelleck(?:Chem)?\b/i, name: 'Selleck Chemicals', urlTemplate: 'https://www.selleckchem.com/search.html?q={name}' },
  { pattern: /\bCayman\s*Chem/i, name: 'Cayman Chemical', urlTemplate: 'https://www.caymanchem.com/search?q={name}' },
  { pattern: /\bAmbeed\b/i, name: 'Ambeed', urlTemplate: 'https://www.ambeed.com/search.html?keyword={name}' },
  { pattern: /\bBLD\s*Pharm/i, name: 'BLD Pharmatech', urlTemplate: 'https://www.bldpharm.com/search?keyword={name}' },
  { pattern: /\bAK\s*Scientific/i, name: 'AK Scientific', urlTemplate: 'https://www.aksci.com/search?keyword={name}' },
  { pattern: /\bKey\s*Organics/i, name: 'Key Organics / BIONET', urlTemplate: 'https://www.keyorganics.net/search?q={name}' },
  { pattern: /\bLife\s*Chemicals?\b/i, name: 'Life Chemicals', urlTemplate: 'https://lifechemicals.com/search?query={name}' },
  { pattern: /\bTargetMol\b/i, name: 'TargetMol', urlTemplate: 'https://www.targetmol.com/search?q={name}' },
  { pattern: /\bBenchChem\b/i, name: 'BenchChem', urlTemplate: 'https://www.benchchem.com/search?q={name}' },
  { pattern: /\bVitas[-\s]M\b/i, name: 'Vitas-M Laboratory', urlTemplate: 'https://www.vitasm.com/search?q={name}' },
  { pattern: /\bBiorbyt\b/i, name: 'Biorbyt', urlTemplate: 'https://www.biorbyt.com/search?keyword={name}' },
  { pattern: /\bSmolecule\b/i, name: 'Smolecule', urlTemplate: 'https://www.smolecule.com/search?q={name}' },
  { pattern: /\beMolecules?\b/i, name: 'eMolecules', urlTemplate: 'https://www.emolecules.com/search-structure/?q={name}' },
  { pattern: /\bA2B\s*Chem\b/i, name: 'A2B Chem', urlTemplate: 'https://www.a2bchem.com/search/?q={name}' },
  { pattern: /\bBOC\s*Sciences\b/i, name: 'BOC Sciences', urlTemplate: 'https://www.bocsci.com/search?q={name}' },
  { pattern: /\bMedChem\s*Express\b/i, name: 'MedChem Express', urlTemplate: 'https://www.medchemexpress.com/search.html?q={name}' },
  { pattern: /\bCSNpharm/i, name: 'CSNpharm', urlTemplate: 'https://www.csnpharm.com/search?q={name}' },
  { pattern: /\bOtava\b/i, name: 'Otava Chemicals', urlTemplate: 'https://www.otavachemicals.com/search?q={name}' },
  { pattern: /\bUorsy\b/i, name: 'UORSY', urlTemplate: 'https://uorsy.com/search?q={name}' },
  { pattern: /\bAcros\s*Organics\b/i, name: 'Acros Organics', urlTemplate: 'https://www.fishersci.com/us/en/search/{name}' },
  { pattern: /\bApexBio\b/i, name: 'ApexBio', urlTemplate: 'https://www.apexbt.com/search?q={name}' },
  { pattern: /\bAbaChemScene\b/i, name: 'AbaChemScene', urlTemplate: 'https://www.abachemscene.com/search.html?q={name}' },
  { pattern: /\bAngene\s*Chem/i, name: 'Angene Chemical', urlTemplate: 'https://www.angene-chemical.com/search?q={name}' },
  { pattern: /\bBioVision\b/i, name: 'BioVision', urlTemplate: 'https://www.biovision.com/search?q={name}' },
  { pattern: /\bMedKoo\b/i, name: 'MedKoo', urlTemplate: 'https://www.medkoo.com/search?q={name}' },
]

const DATABASE_BLACKLIST = new Set([
  'PubChem', 'ChEMBL', 'CHEMBL', 'DrugBank', 'KEGG', 'UniProt', 'PDB', 'RCSB PDB',
  'ChEBI', 'Wikipedia', 'Wikipedia (English)', 'ChemIDplus', 'NCI', 'EPA', 'FDA',
  'NIST', 'FDA UNII', 'HSDB', 'IPA', 'Merck Index', 'Human Metabolome Database',
  'HMDB', 'Drug Central', 'DrugCentral', 'IUPHAR', 'Guide to Pharmacology',
  'BindingDB', 'PDBe', 'Rhea', 'Reactome', 'ClinicalTrials.gov', 'ClinicalTrials',
  'FDA National Drug Code Directory', 'DailyMed', 'FDA Orange Book',
  'Open Targets', 'DisGeNET', 'Orphanet', 'ClinVar', 'GTR', 'MedGen',
  'UniProt Knowledgebase', 'AlphaFold DB', 'PDBe-KB', 'CATH', 'SCOP',
  'InterPro', 'Pfam', 'PROSITE', 'SMART', 'PANTHER', 'Gene Ontology',
  'BioCyc', 'MetaCyc', 'BioCyc', 'SMPDB', 'OMIM', 'PharmGKB', 'CPIC',
  'GEO', 'GTEx', 'Expression Atlas', 'Bgee', 'STRING', 'BioGRID',
  'IntAct', 'Pathway Commons', 'WikiPathways', 'KEGG COMPOUND',
  'GNPS', 'MassBank', 'MoNA', 'ChEBI', 'ChemSpider', 'CIR',
])

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cid = parseInt(params.id, 10)
  if (isNaN(cid)) {
    return NextResponse.json({ error: 'Invalid molecule ID' }, { status: 400 })
  }

  let moleculeName: string | null = null
  try {
    const molRes = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/IUPACName/JSON`, {
      next: { revalidate: CACHE_DURATION },
    })
    if (molRes.ok) {
      const molData = await molRes.json()
      moleculeName = molData.PropertyTable?.Properties?.[0]?.IUPACName ?? null
    }
  } catch {}

  try {
    const res = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/xrefs/SourceName/JSON`,
      { next: { revalidate: CACHE_DURATION } }
    )
    if (!res.ok) {
      return NextResponse.json({ vendors: [], databases: [] })
    }
    const data = await res.json()
    const sources: string[] = data.InformationList?.Information?.[0]?.SourceName ?? []

    const seen = new Set<string>()
    const suppliers: VendorResult[] = []
    const databases: VendorResult[] = []

    for (const source of sources) {
      const matched = SUPPLIER_TEMPLATES.find(t => t.pattern.test(source))
      const key = matched ? matched.name : source

      if (seen.has(key)) continue
      seen.add(key)

      if (matched) {
        const searchName = encodeURIComponent(moleculeName || String(cid))
        const url = matched.urlTemplate.replace('{name}', searchName)
        suppliers.push({ name: matched.name, url, sourceType: 'supplier' })
      } else if (!DATABASE_BLACKLIST.has(key)) {
        databases.push({ name: key, url: null, sourceType: 'database' })
      }
    }

    return NextResponse.json(
      { suppliers, databases, total: sources.length },
      { headers: { 'Cache-Control': `public, s-maxage=${CACHE_DURATION}` } }
    )
  } catch (error) {
    console.error('[api/molecule/vendors] Error:', error)
    return NextResponse.json({ vendors: [], databases: [] })
  }
}