import type { CategoryId } from './categoryConfig'
import type { CategoryLoadState } from './fetchCategory'

export interface CategoryFreshness {
  status: CategoryLoadState
  fetchedAt: Date | null
  health: 'ok' | 'loading' | 'error' | 'idle'
}

export type FreshnessMap = Record<CategoryId, CategoryFreshness>

export function getHealthFromStatus(status: CategoryLoadState): CategoryFreshness['health'] {
  switch (status) {
    case 'loaded': return 'ok'
    case 'loading': return 'loading'
    case 'error': return 'error'
    default: return 'idle'
  }
}

export function formatTimeSince(date: Date | null): string {
  if (!date) return 'Not loaded'
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 5) return 'Just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

export interface FreshnessConfig {
  maxAgeDays: number
  label: string
}

export const FRESHNESS_CONFIG: Record<string, FreshnessConfig> = {
  // Pharmaceutical
  'openfda': { maxAgeDays: 14, label: 'Updated biweekly' },
  'ndc': { maxAgeDays: 30, label: 'Updated monthly' },
  'orangebook': { maxAgeDays: 30, label: 'Updated monthly' },
  'nadac': { maxAgeDays: 7, label: 'Updated weekly' },
  'rxnorm': { maxAgeDays: 30, label: 'Updated monthly' },
  'dailymed': { maxAgeDays: 14, label: 'Updated biweekly' },
  'atc': { maxAgeDays: 90, label: 'Updated quarterly' },
  'drugcentral': { maxAgeDays: 90, label: 'Updated quarterly' },

  // Clinical & Safety
  'clinicaltrials': { maxAgeDays: 7, label: 'Updated weekly' },
  'adverseevents': { maxAgeDays: 14, label: 'Updated biweekly' },
  'recalls': { maxAgeDays: 3, label: 'Updated every 3 days' },
  'chembl-indications': { maxAgeDays: 30, label: 'Updated monthly' },
  'clinvar': { maxAgeDays: 7, label: 'Updated weekly' },
  'gwas': { maxAgeDays: 30, label: 'Updated monthly' },
  'toxcast': { maxAgeDays: 30, label: 'Updated monthly' },
  'sider': { maxAgeDays: 90, label: 'Updated quarterly' },

  // Molecular & Chemical
  'pubchem-properties': { maxAgeDays: 90, label: 'Updated quarterly' },
  'pubchem-hazards': { maxAgeDays: 90, label: 'Updated quarterly' },
  'chebi': { maxAgeDays: 90, label: 'Updated quarterly' },
  'comptox': { maxAgeDays: 30, label: 'Updated monthly' },
  'kegg': { maxAgeDays: 90, label: 'Updated quarterly' },
  'rhea': { maxAgeDays: 90, label: 'Updated quarterly' },
  'metabolomics': { maxAgeDays: 30, label: 'Updated monthly' },
  'mychem': { maxAgeDays: 30, label: 'Updated monthly' },
  'hmdb': { maxAgeDays: 90, label: 'Updated quarterly' },

  // Bioactivity & Targets
  'chembl': { maxAgeDays: 30, label: 'Updated monthly' },
  'bioassay': { maxAgeDays: 30, label: 'Updated monthly' },
  'chembl-mechanisms': { maxAgeDays: 30, label: 'Updated monthly' },
  'iuphar': { maxAgeDays: 90, label: 'Updated quarterly' },
  'bindingdb': { maxAgeDays: 30, label: 'Updated monthly' },
  'pharos': { maxAgeDays: 30, label: 'Updated monthly' },
  'dgidb': { maxAgeDays: 30, label: 'Updated monthly' },
  'opentargets': { maxAgeDays: 30, label: 'Updated monthly' },
  'ctd': { maxAgeDays: 30, label: 'Updated monthly' },
  'iedb': { maxAgeDays: 30, label: 'Updated monthly' },

  // Protein & Structure
  'uniprot': { maxAgeDays: 90, label: 'Updated quarterly' },
  'alphafold': { maxAgeDays: 180, label: 'Updated semi-annually' },
  'interpro': { maxAgeDays: 90, label: 'Updated quarterly' },
  'ebi-proteins': { maxAgeDays: 90, label: 'Updated quarterly' },
  'protein-atlas': { maxAgeDays: 90, label: 'Updated quarterly' },
  'quickgo': { maxAgeDays: 90, label: 'Updated quarterly' },
  'pdb': { maxAgeDays: 30, label: 'Updated monthly' },
  'pdbe-ligands': { maxAgeDays: 90, label: 'Updated quarterly' },
  'peptideatlas': { maxAgeDays: 90, label: 'Updated quarterly' },

  // Genomics & Disease
  'ncbi-gene': { maxAgeDays: 30, label: 'Updated monthly' },
  'ensembl': { maxAgeDays: 90, label: 'Updated quarterly' },
  'expression-atlas': { maxAgeDays: 90, label: 'Updated quarterly' },
  'monarch': { maxAgeDays: 30, label: 'Updated monthly' },
  'nci-thesaurus': { maxAgeDays: 90, label: 'Updated quarterly' },
  'mesh': { maxAgeDays: 90, label: 'Updated quarterly' },
  'disgenet': { maxAgeDays: 30, label: 'Updated monthly' },
  'orphanet': { maxAgeDays: 90, label: 'Updated quarterly' },
  'mygene': { maxAgeDays: 30, label: 'Updated monthly' },
  'bgee': { maxAgeDays: 90, label: 'Updated quarterly' },
  'omim': { maxAgeDays: 90, label: 'Updated quarterly' },

  // Interactions & Pathways
  'string-db': { maxAgeDays: 90, label: 'Updated quarterly' },
  'stitch': { maxAgeDays: 90, label: 'Updated quarterly' },
  'intact': { maxAgeDays: 30, label: 'Updated monthly' },
  'reactome': { maxAgeDays: 90, label: 'Updated quarterly' },
  'wikipathways': { maxAgeDays: 30, label: 'Updated monthly' },
  'pathway-commons': { maxAgeDays: 90, label: 'Updated quarterly' },
  'ctd-diseases': { maxAgeDays: 30, label: 'Updated monthly' },

  // Research & Literature
  'nihreporter': { maxAgeDays: 30, label: 'Updated monthly' },
  'patents': { maxAgeDays: 7, label: 'Updated weekly' },
  'secedgar': { maxAgeDays: 1, label: 'Updated daily' },
  'europepmc': { maxAgeDays: 3, label: 'Updated every 3 days' },
  'semantic-scholar': { maxAgeDays: 7, label: 'Updated weekly' },
  'openalex': { maxAgeDays: 7, label: 'Updated weekly' },
  'opencitations': { maxAgeDays: 30, label: 'Updated monthly' },
}

export function getFreshnessStatus(
  panelId: string,
  lastFetched: Date
): {
  isFresh: boolean
  statusText: string
  colorClass: string
} {
  const config = FRESHNESS_CONFIG[panelId] || { maxAgeDays: 30, label: 'Updated periodically' }
  const ageDays = (Date.now() - lastFetched.getTime()) / (1000 * 60 * 60 * 24)

  if (ageDays <= config.maxAgeDays) {
    return {
      isFresh: true,
      statusText: config.label,
      colorClass: 'text-emerald-600'
    }
  }

  const daysAgo = Math.floor(ageDays)
  return {
    isFresh: false,
    statusText: `Last updated ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`,
    colorClass: 'text-amber-600'
  }
}
