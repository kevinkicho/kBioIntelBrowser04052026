// NCBI E-Utilities API Client
// Provides access to 38+ NCBI databases via 9 endpoints
// https://eutils.ncbi.nlm.nih.gov/

const BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'

const fetchOptions: RequestInit = {
  next: { revalidate: 3600 },
}

// NCBI credentials from environment
const NCBI_EMAIL = process.env.NCBI_EMAIL ?? ''
const NCBI_API_KEY = process.env.NCBI_API_KEY ?? ''

// Add email and tool for NCBI tracking
const getParams = (params: Record<string, string>) => {
  const result: Record<string, string> = {
    ...params,
    email: NCBI_EMAIL || 'biointel@example.com',
    tool: 'BioIntelExplorer',
  }
  // Add API key if available (increases rate limit from 3/sec to 10/sec)
  if (NCBI_API_KEY) {
    result.api_key = NCBI_API_KEY
  }
  return result
}

export interface ESearchResult {
  db: string
  queryKey: string
  webEnv: string
  count: number
  ids: string[]
}

export interface ESummaryDoc {
  uid: string
  [key: string]: unknown
}

export interface EInfoDbInfo {
  dbName: string
  dbDescription: string
  count: number
  lastUpdate: string
  fieldList: Array<{ name: string; fullName: string; description: string }>
  linkList: Array<{ name: string; dbTo: string }>
}

export interface ELinkResult {
  fromDb: string
  toDb: string
  links: Array<{ from: string; to: string }>
}

export interface ECitMatchResult {
  pmid: string
  status: string
  url?: string
}

/**
 * EInfo - Get database statistics and field information
 */
export async function einfo(db?: string): Promise<EInfoDbInfo | EInfoDbInfo[]> {
  try {
    const params = getParams(db ? { db } : {})
    const url = `${BASE_URL}/einfo.fcgi?${new URLSearchParams(params)}&retmode=json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) throw new Error('EInfo request failed')
    const data = await res.json()
    if (db) {
      const info = data.einfo.dbinfo
      return {
        dbName: info.DbName,
        dbDescription: info.DbDescription,
        count: parseInt(info.Count),
        lastUpdate: info.LastUpdate,
        fieldList: info.FieldList?.map((f: { Name: string; FullName: string; Description: string }) => ({
          name: f.Name,
          fullName: f.FullName,
          description: f.Description,
        })) ?? [],
        linkList: info.LinkList?.map((l: { Name: string; DbTo: string }) => ({
          name: l.Name,
          dbTo: l.DbTo,
        })) ?? [],
      }
    } else {
      return data.einfo.dblist.databases.map((d: { Name: string; Description: string }) => ({
        dbName: d.Name,
        dbDescription: d.Description,
        count: 0,
        lastUpdate: '',
        fieldList: [],
        linkList: [],
      }))
    }
  } catch {
    return db ? { dbName: db, dbDescription: '', count: 0, lastUpdate: '', fieldList: [], linkList: [] } : []
  }
}

/**
 * ESearch - Search a specific NCBI database
 */
export async function esearch(
  db: string,
  term: string,
  retmax = 20,
  useHistory = false,
): Promise<ESearchResult> {
  try {
    const params = getParams({
      db,
      term,
      retmax: retmax.toString(),
      retmode: 'json',
      ...(useHistory ? { usehistory: 'y' } : {}),
    })
    const url = `${BASE_URL}/esearch.fcgi?${new URLSearchParams(params)}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) throw new Error('ESearch request failed')
    const data = await res.json()
    return {
      db: data.esearchresult.db ?? db,
      queryKey: data.esearchresult.querykey ?? '',
      webEnv: data.esearchresult.webenv ?? '',
      count: parseInt(data.esearchresult.count ?? '0'),
      ids: data.esearchresult.idlist ?? [],
    }
  } catch {
    return { db, queryKey: '', webEnv: '', count: 0, ids: [] }
  }
}

/**
 * EPost - Upload UIDs to History server for later use
 */
export async function epost(db: string, ids: string[]): Promise<{ queryKey: string; webEnv: string } | null> {
  try {
    const params = getParams({ db, id: ids.join(','), retmode: 'json' })
    const url = `${BASE_URL}/epost.fcgi?${new URLSearchParams(params)}`
    const res = await fetch(url, { ...fetchOptions, method: 'POST' })
    if (!res.ok) throw new Error('EPost request failed')
    const data = await res.json()
    return {
      queryKey: data.epostresult?.querykey ?? '',
      webEnv: data.epostresult?.webenv ?? '',
    }
  } catch {
    return null
  }
}

/**
 * ESummary - Get document summaries
 */
export async function esummary(
  db: string,
  ids: string[],
  useHistory = false,
  queryKey?: string,
  webEnv?: string,
): Promise<ESummaryDoc[]> {
  try {
    const params = getParams({
      db,
      id: ids.join(','),
      retmode: 'json',
      ...(useHistory && queryKey && webEnv ? { query_key: queryKey, webenv: webEnv } : {}),
    })
    const url = `${BASE_URL}/esummary.fcgi?${new URLSearchParams(params)}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) throw new Error('ESummary request failed')
    const data = await res.json()
    const result = data.result
    if (!result) return []
    return Object.keys(result)
      .filter((k) => k !== 'uids' && k !== 'count')
      .map((uid) => ({ uid, ...result[uid] }))
  } catch {
    return []
  }
}

/**
 * EFetch - Get full data records
 */
export async function efetch(
  db: string,
  ids: string[],
  rettype = 'full',
  retmode = 'xml',
): Promise<string | null> {
  try {
    const params = getParams({ db, id: ids.join(','), rettype, retmode })
    const url = `${BASE_URL}/efetch.fcgi?${new URLSearchParams(params)}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) throw new Error('EFetch request failed')
    return await res.text()
  } catch {
    return null
  }
}

/**
 * ELink - Find related items across databases
 */
export async function elink(
  fromDb: string,
  toDb: string,
  ids: string[],
): Promise<ELinkResult> {
  try {
    const params = getParams({
      db_from: fromDb,
      db_to: toDb,
      id: ids.join(','),
      retmode: 'json',
    })
    const url = `${BASE_URL}/elink.fcgi?${new URLSearchParams(params)}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) throw new Error('ELink request failed')
    const data = await res.json()
    const linksets = data.linksets ?? []
    const links = linksets[0]?.linksetdbs?.[0]?.links?.map((l: { from: string; to: string }) => ({
      from: l.from,
      to: l.to,
    })) ?? []
    return { fromDb, toDb, links }
  } catch {
    return { fromDb, toDb, links: [] }
  }
}

/**
 * EGQuery - Global query across all databases
 */
export async function egquery(term: string): Promise<Array<{ db: string; count: number; status: string }>> {
  try {
    const params = getParams({ term, retmode: 'json' })
    const url = `${BASE_URL}/egquery.fcgi?${new URLSearchParams(params)}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) throw new Error('EGQuery request failed')
    const data = await res.json()
    return (data.eGQueryResult?.dbcounts ?? []).map((d: { DbName: string; Count: string; Status: string }) => ({
      db: d.DbName,
      count: parseInt(d.Count),
      status: d.Status,
    }))
  } catch {
    return []
  }
}

/**
 * ESpell - Get spelling suggestions
 */
export async function espell(db: string, term: string): Promise<string | null> {
  try {
    const params = getParams({ db, term, retmode: 'json' })
    const url = `${BASE_URL}/espell.fcgi?${new URLSearchParams(params)}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) throw new Error('ESpell request failed')
    const data = await res.json()
    return data.espellresult?.correctedquery ?? null
  } catch {
    return null
  }
}

/**
 * ECitMatch - Batch citation matching for PubMed
 */
export async function ecitMatch(citations: Array<{
  journal: string
  year: string
  volume: string
  page: string
  author: string
}>): Promise<ECitMatchResult[]> {
  try {
    const citationStr = citations
      .map((c) => `${c.journal}|${c.year}|${c.volume}|${c.page}|${c.author}`)
      .join('\n')
    const params = getParams({ db: 'pubmed', retmode: 'json' })
    const url = `${BASE_URL}/ecitmatch.cgi?${new URLSearchParams(params)}`
    const res = await fetch(url, {
      ...fetchOptions,
      method: 'POST',
      body: citationStr,
      headers: { 'Content-Type': 'text/plain' },
    })
    if (!res.ok) throw new Error('ECitMatch request failed')
    const data = await res.json()
    return (data.ecitmatchresult ?? []).map((r: { PMID: string; Status: string; URL: string }) => ({
      pmid: r.PMID,
      status: r.Status,
      url: r.URL,
    }))
  } catch {
    return []
  }
}
