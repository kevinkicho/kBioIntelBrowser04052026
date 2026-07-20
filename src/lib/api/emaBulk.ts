/**
 * EMA official bulk medicine data downloads (tier B — Excel/JSON dumps, not live REST).
 * Prefer deep links; optional future cache can pull xlsx server-side with revalidate.
 * @see https://www.ema.europa.eu/en/medicines/download-medicine-data
 * @see docs/design/public-apis-international.md
 */

export interface EmaBulkDownloadLink {
  id: string
  label: string
  description: string
  url: string
  format: 'xlsx' | 'json' | 'portal'
}

/** Official EMA download portals (stable entry points; file names may change overnight). */
export function getEmaBulkDownloadLinks(): EmaBulkDownloadLink[] {
  return [
    {
      id: 'ema-medicine-tables',
      label: 'EMA medicine data tables',
      description:
        'Official Excel tables: authorised medicines, withdrawn applications, opinions (updated overnight).',
      url: 'https://www.ema.europa.eu/en/medicines/download-medicine-data',
      format: 'portal',
    },
    {
      id: 'ema-medicines-xlsx',
      label: 'Medicines output report (Excel)',
      description:
        'Direct medicines-output Excel (may 404 if EMA renames; prefer portal if broken).',
      url: 'https://www.ema.europa.eu/en/documents/report/medicines-output-medicines-report_en.xlsx',
      format: 'xlsx',
    },
    {
      id: 'ema-website-json',
      label: 'EMA website JSON dumps',
      description: 'Structured website extracts (JSON), updated twice daily.',
      url: 'https://www.ema.europa.eu/en/about-us/about-website/download-website-data-json-data-format',
      format: 'json',
    },
    {
      id: 'ema-biosimilars-topic',
      label: 'EMA biosimilar medicines topic',
      description: 'EMA special-topic hub for biosimilar medicines (portal).',
      url: 'https://www.ema.europa.eu/en/human-regulatory-overview/biosimilar-medicines-overview',
      format: 'portal',
    },
  ]
}
