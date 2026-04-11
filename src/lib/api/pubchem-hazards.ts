import type { GhsHazardData } from '../types'

const BASE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

interface PugViewSection {
  TOCHeading?: string
  Section?: PugViewSection[]
  Information?: PugViewInfo[]
}

interface PugViewInfo {
  Name?: string
  Value?: {
    StringWithMarkup?: {
      String?: string
      Markup?: { Type?: string; URL?: string }[]
    }[]
  }
}

function findSection(sections: PugViewSection[], heading: string): PugViewSection | undefined {
  for (const section of sections) {
    if (section.TOCHeading === heading) return section
    if (section.Section) {
      const found = findSection(section.Section, heading)
      if (found) return found
    }
  }
  return undefined
}

export async function getGhsHazardsByCid(cid: number): Promise<GhsHazardData | null> {
  try {
    const url = `${BASE_URL}/${cid}/JSON?heading=GHS+Classification`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()

    const ghsSection = findSection(data.Record?.Section ?? [], 'GHS Classification')
    if (!ghsSection?.Information) return null

    let signalWord = ''
    const pictogramUrls: string[] = []
    const hazardStatements: string[] = []
    const precautionaryStatements: string[] = []

    for (const info of ghsSection.Information) {
      const strings = info.Value?.StringWithMarkup ?? []

      if (info.Name === 'Signal') {
        signalWord = strings[0]?.String ?? ''
      } else if (info.Name === 'Pictogram(s)') {
        for (const s of strings) {
          for (const m of s.Markup ?? []) {
            if (m.Type === 'Icon' && m.URL) {
              pictogramUrls.push(m.URL)
            }
          }
        }
      } else if (info.Name === 'GHS Hazard Statements') {
        for (const s of strings) {
          if (s.String) hazardStatements.push(s.String)
        }
      } else if (info.Name === 'Precautionary Statement Codes') {
        for (const s of strings) {
          if (s.String) precautionaryStatements.push(s.String)
        }
      }
    }

    return { signalWord, pictogramUrls, hazardStatements, precautionaryStatements }
  } catch {
    return null
  }
}
