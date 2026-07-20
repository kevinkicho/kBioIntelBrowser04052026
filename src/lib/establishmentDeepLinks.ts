/**
 * Portal-first manufacturing / establishment deep links (FDA FEI, DRLS, inspections).
 * No free product→plant graph API — honest empty joins avoided; search portals only.
 * @see docs/design/biologics-biosimilars-sources.md
 */

export interface EstablishmentDeepLink {
  id: string
  label: string
  description: string
  url: string
  kind: 'search' | 'portal' | 'registry'
}

/**
 * Build public search / registry links for a firm or product name.
 * Used on biologics / Purple Book panels for manufacturing-plant discovery.
 */
export function buildEstablishmentDeepLinks(firmOrProductHint: string): EstablishmentDeepLink[] {
  const q = firmOrProductHint.trim()
  const enc = encodeURIComponent(q)
  const links: EstablishmentDeepLink[] = [
    {
      id: 'fda-data-dashboard',
      label: 'FDA Data Dashboard (inspections)',
      description: 'Public inspections / compliance dashboards (search firm name)',
      url: 'https://datadashboard.fda.gov/oii/cd/inspections.htm',
      kind: 'portal',
    },
    {
      id: 'fda-firm-supplier',
      label: 'FDA firm / supplier evaluation',
      description: 'FSMA firm and supplier public search',
      url: 'https://datadashboard.fda.gov/oii/fd/fser.htm',
      kind: 'portal',
    },
    {
      id: 'drls',
      label: 'Drug Establishments Current Registration (DRLS)',
      description: 'Registered drug manufacturing / processing establishments',
      url: 'https://www.accessdata.fda.gov/scripts/cder/drls/default.cfm',
      kind: 'registry',
    },
    {
      id: 'fei-portal',
      label: 'FDA FEI Portal',
      description: 'Firm Establishment Identifier lookup (account may be required)',
      url: 'https://www.accessdata.fda.gov/scripts/feiportal/index.cfm?action=portal.login',
      kind: 'portal',
    },
  ]
  if (q) {
    links.unshift({
      id: 'drls-hint',
      label: `DRLS search hint: ${q.slice(0, 40)}${q.length > 40 ? '…' : ''}`,
      description: 'Open DRLS and search this firm/product name in the public registration site',
      url: `https://www.accessdata.fda.gov/scripts/cder/drls/default.cfm`,
      kind: 'search',
    })
    // Drugs@FDA / openFDA labeler context is already in-app; add Google site search as soft discovery
    links.push({
      id: 'fda-gov-search',
      label: 'FDA.gov site search (firm)',
      description: 'Public FDA.gov search for establishment / warning letters context',
      url: `https://www.fda.gov/search?s=${enc}`,
      kind: 'search',
    })
  }
  return links
}

export function fdaEstablishmentSearchUrl(sponsorOrPlantHint: string): string {
  const q = sponsorOrPlantHint.trim()
  return q
    ? `https://www.fda.gov/search?s=${encodeURIComponent(q)}`
    : 'https://datadashboard.fda.gov/oii/cd/inspections.htm'
}
