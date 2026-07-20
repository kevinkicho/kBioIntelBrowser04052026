/**
 * Portal-first deep links for foreign medicines regulators (MHRA, TGA, PMDA, EMA downloads).
 * No scrape — official public search / download URLs only.
 * @see docs/design/public-apis-international.md
 */

export type RegulatorId = 'ema' | 'mhra' | 'tga' | 'pmda' | 'health_canada' | 'fda'

export interface RegulatorDeepLink {
  id: RegulatorId | string
  label: string
  region: string
  description: string
  url: string
  kind: 'search' | 'download' | 'portal'
}

export function buildInternationalRegulatorLinks(moleculeName: string): RegulatorDeepLink[] {
  const q = moleculeName.trim()
  if (!q) return []

  const enc = encodeURIComponent(q)

  return [
    {
      id: 'ema',
      label: 'EMA medicines search',
      region: 'EU',
      description: 'European Medicines Agency public medicine search',
      url: `https://www.ema.europa.eu/en/search?search_api_fulltext=${enc}`,
      kind: 'search',
    },
    {
      id: 'ema-download',
      label: 'EMA medicine data downloads',
      region: 'EU',
      description: 'Official Excel medicine lists (EPAR, referrals, shortages, …)',
      url: 'https://www.ema.europa.eu/en/medicines/download-medicine-data',
      kind: 'download',
    },
    {
      id: 'ema-json',
      label: 'EMA website JSON dumps',
      region: 'EU',
      description: 'Structured JSON website extracts (updated twice daily)',
      url: 'https://www.ema.europa.eu/en/about-us/about-website/download-website-data-json-data-format',
      kind: 'download',
    },
    {
      id: 'mhra',
      label: 'MHRA products (SPC / PIL)',
      region: 'UK',
      description: 'UK product information (SmPC, patient leaflets, PARs)',
      url: `https://products.mhra.gov.uk/?search=${enc}`,
      kind: 'search',
    },
    {
      id: 'mhra-yellow-card',
      label: 'MHRA Yellow Card',
      region: 'UK',
      description: 'Suspected adverse reaction reporting / interactive drug analysis prints',
      url: 'https://yellowcard.mhra.gov.uk/',
      kind: 'portal',
    },
    {
      id: 'tga',
      label: 'TGA ARTG search',
      region: 'Australia',
      description: 'Australian Register of Therapeutic Goods public search',
      url: `https://www.tga.gov.au/resources/artg?search_api_fulltext=${enc}`,
      kind: 'search',
    },
    {
      id: 'tga-artg-advanced',
      label: 'ARTG advanced search',
      region: 'Australia',
      description: 'Compliance ARTG visualisation / larger-screen search',
      url: 'https://compliance.health.gov.au/artg/',
      kind: 'portal',
    },
    {
      id: 'pmda',
      label: 'PMDA (Japan) English portal',
      region: 'Japan',
      description: 'Pharmaceuticals and Medical Devices Agency — reviews & safety (English hub)',
      url: 'https://www.pmda.go.jp/english/',
      kind: 'portal',
    },
    {
      id: 'pmda-search',
      label: 'PMDA site search',
      region: 'Japan',
      description: 'Search PMDA English site for this molecule name',
      url: `https://www.pmda.go.jp/english/search.html?q=${enc}`,
      kind: 'search',
    },
    {
      id: 'health_canada',
      label: 'Health Canada DPD search',
      region: 'Canada',
      description: 'Drug Product Database (also available as free JSON API in-app)',
      url: `https://health-products.canada.ca/dpd-bdpp/dispatch-repartition.do?lang=en&type=search&q=${enc}`,
      kind: 'search',
    },
    {
      id: 'fda',
      label: 'openFDA / Drugs@FDA search',
      region: 'US',
      description: 'US FDA public drug information (also wired via openFDA panels)',
      url: `https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=BasicSearch.process&ApplNo=&ProductNo=&SponsorName=&DrugName=${enc}`,
      kind: 'search',
    },
  ]
}
