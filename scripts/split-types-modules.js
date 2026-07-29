#!/usr/bin/env node
/**
 * One-shot: split src/lib/types.ts into domain modules under src/lib/types/.
 * Keeps stable re-export at src/lib/types.ts → ./types
 */
'use strict'

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'src/lib/types.ts')
const DIR = path.join(ROOT, 'src/lib/types')

const src = fs.readFileSync(SRC, 'utf8')
// If already a re-export only, abort
if (src.trim().startsWith('/**') && src.includes("export * from './types'") && src.split('\n').length < 20) {
  console.log('types.ts already a barrel re-export; skip')
  process.exit(0)
}

const lines = src.split(/\r?\n/)

const rules = [
  ['molecule', /Molecule Classification|PubChem|Synthesis|Related Compound|Similar Molecule|MyChem|Molecule Data/i],
  ['pharmaceutical', /DrugBank|DrugCentral|FDA & Pharmaceutical|GSRS|Atc Classification|ATC Types/i],
  ['clinicalSafety', /Clinical & Safety|Clinical Pharmacogenetics|ISRCTN|Drug Shortage|SIDER|CPIC|Faers|Adverse|Recall|Drug Label|Drug Interaction|Drug Price|Clinical Trial|Ghs Hazard/i],
  ['bioactivity', /ChEMBL|BindingDB|BioAssay|IUPHAR|Pharos|TTD|STITCH|Drug-Gene Interaction|LINCS/i],
  ['proteinStructure', /Protein & Structure|AlphaFold|UniProt|PDBE|Protein Atlas|Protein Feature|Protein Interaction|InterPro|CATH|SAbDab|EMBL-EBI|Human Protein Atlas/i],
  ['geneGenomics', /Gene Info|Ensembl|Expression Types|GWAS|MyGene|Bgee|GTEx|dbSNP|ClinVar|ClinGen|Gene Ontology|GEO Types|PeptideAtlas|PRIDE/i],
  ['disease', /Disease Association|Monarch|DisGeNET|Orphanet|OMIM|MedGen|Human Phenotype|NeuroMMSig|NCI Thesaurus|MeSH/i],
  ['pathways', /Reactome|PathwayCommons|WikiPathways|BioCyc|SMPDB|KEGG/i],
  ['literature', /Literature|PubMed|OpenAlex|OpenCitations|CrossRef|arXiv|Semantic/i],
  ['metabolomics', /Metabolomics|HMDB|MassBank|MetaboLights|FooDB|PhytoHub|DFDB|LIPID|GNPS|MassIVE|ChemSpider|UniChem/i],
  ['toxicology', /ToxCast|CompTox|EPA IRIS/i],
  ['systems', /Graph|SEC Filing|Company Product|Patent|Nih Grant|BioModels|OLS|BioSamples|NCATS|NHGRI|NIAID|NCI caDSR|AnVIL|ImmPort|IntAct|STRING|String/i],
]

const buckets = Object.fromEntries(rules.map(([k]) => [k, []]))
buckets.misc = []

let current = 'misc'
for (const line of lines) {
  if (line.startsWith('// ')) {
    const hit = rules.find(([, re]) => re.test(line))
    if (hit) current = hit[0]
  }
  buckets[current].push(line)
}

fs.mkdirSync(DIR, { recursive: true })
const files = []
for (const [name, body] of Object.entries(buckets)) {
  while (body.length && !body[0].trim()) body.shift()
  while (body.length && !body[body.length - 1].trim()) body.pop()
  if (!body.length) continue
  const content =
    '/** Domain DTO types — split from monolithic types.ts for maintainability. */\n' +
    body.join('\n') +
    '\n'
  fs.writeFileSync(path.join(DIR, name + '.ts'), content)
  files.push(name)
  console.log(name.padEnd(18), body.length)
}

const index =
  '/** Barrel for domain DTO types. Prefer import from @/lib/types. */\n' +
  files.map((f) => `export * from './${f}'`).join('\n') +
  '\n'
fs.writeFileSync(path.join(DIR, 'index.ts'), index)

fs.writeFileSync(
  SRC,
  `/**
 * Domain DTO types (panel / free-API shapes).
 * Split under ./types/* — this file re-exports for stable \`@/lib/types\` imports.
 */
export * from './types'
`,
)

console.log('wrote', files.length, 'modules + barrel')
