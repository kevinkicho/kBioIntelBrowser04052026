/**
 * GET /api/molecule/:id/research-kit
 * Server-side research kit bundle for CLI / agents (free public APIs only).
 * Of-record facts from identity + core category bags — not clinical decision support.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById, PubChemUpstreamError } from '@/lib/api/pubchem'
import {
  buildMoleculeDataHub,
  buildResearchKitBundle,
  type MoleculeIdentityInput,
} from '@/lib/dataHub'
import { logApiOutcome, startApiTimer } from '@/lib/serverLog'
import { getCategoryTimeout, withTimeout } from '@/lib/utils'
import { runWithApiAbort } from '@/lib/api/apiAbort'
import {
  fetchMolecularChemical,
  fetchClinicalSafety,
  fetchResearchLiterature,
  fetchBioactivityTargets,
  fetchPharmaceutical,
} from '@/lib/categoryFetchers'
import type { ApiParamValue } from '@/lib/apiIdentifiers'
import { getMoleculeIdentifiers, resolveApiQuery } from '@/lib/resolveApiQuery'

const DEFAULT_CATEGORIES = [
  'molecular-chemical',
  'clinical-safety',
  'research-literature',
  'bioactivity-targets',
  'pharmaceutical',
] as const

const VALID = new Set<string>(DEFAULT_CATEGORIES)

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const timer = startApiTimer()
  const cid = parseInt(params.id, 10)
  if (isNaN(cid) || cid < 1) {
    logApiOutcome({
      route: '/api/molecule/[id]/research-kit',
      method: 'GET',
      status: 400,
      ms: timer.ms(),
      cid: params.id,
    })
    return NextResponse.json({ error: 'Invalid molecule ID' }, { status: 400 })
  }

  const url = request.nextUrl
  const catsParam = url.searchParams.get('categories')
  const categories = (
    catsParam
      ? catsParam
          .split(/[,;]+/)
          .map((s) => s.trim())
          .filter((c) => VALID.has(c))
      : [...DEFAULT_CATEGORIES]
  ) as string[]

  try {
    const molecule = await getMoleculeById(cid)
    if (!molecule) {
      logApiOutcome({
        route: '/api/molecule/[id]/research-kit',
        method: 'GET',
        status: 404,
        ms: timer.ms(),
        cid,
        source: 'pubchem',
      })
      return NextResponse.json({ error: 'Molecule not found' }, { status: 404 })
    }

    const name = molecule.name
    const synonyms = molecule.synonyms || []
    const molecularWeight = molecule.molecularWeight || 0
    const apiParams: Record<string, ApiParamValue> = {}

    const identity: MoleculeIdentityInput = {
      cid,
      name: name || molecule.iupacName || `CID ${cid}`,
      formula: molecule.formula,
      molecularWeight: molecule.molecularWeight,
      inchiKey: molecule.inchiKey,
      iupacName: molecule.iupacName,
      synonyms,
    }

    const identifiers = await getMoleculeIdentifiers(cid).catch(() => null)
    const queryFor = (source: string): string => {
      if (identifiers) return resolveApiQuery(identifiers, source, {})
      return name
    }

    const bags: Record<string, unknown> = {}
    const loaded: string[] = []
    const failed: string[] = []

    await Promise.all(
      categories.map(async (categoryId) => {
        const categoryTimeout = Math.min(getCategoryTimeout(categoryId) || 12_000, 14_000)
        try {
          const ac = new AbortController()
          const data = await runWithApiAbort(
            ac,
            async () => {
              const fetchPromise = (async (): Promise<Record<string, unknown> | null> => {
                switch (categoryId) {
                  case 'pharmaceutical':
                    return (await fetchPharmaceutical(name, synonyms, queryFor, apiParams)) as Record<
                      string,
                      unknown
                    >
                  case 'clinical-safety':
                    return (await fetchClinicalSafety(name, queryFor, apiParams)) as Record<
                      string,
                      unknown
                    >
                  case 'molecular-chemical':
                    return (await fetchMolecularChemical(
                      name,
                      cid,
                      molecularWeight,
                      queryFor,
                      apiParams,
                    )) as Record<string, unknown>
                  case 'bioactivity-targets':
                    return (await fetchBioactivityTargets(name, queryFor, apiParams)) as Record<
                      string,
                      unknown
                    >
                  case 'research-literature':
                    return (await fetchResearchLiterature(name, queryFor, apiParams)) as Record<
                      string,
                      unknown
                    >
                  default:
                    return null
                }
              })()

              return await withTimeout(fetchPromise, categoryTimeout + 2000, {
                abortController: ac,
                signal: request.signal,
              })
            },
            [request.signal],
          )
          if (data && typeof data === 'object') {
            for (const [k, v] of Object.entries(data)) {
              if (k.startsWith('_')) continue
              bags[k] = v
            }
            loaded.push(categoryId)
          } else {
            failed.push(categoryId)
          }
        } catch {
          failed.push(categoryId)
        }
      }),
    )

    const ledger = buildMoleculeDataHub(identity, bags)
    const bundle = buildResearchKitBundle({
      ledger,
      includeEmpty: false,
      includePrefs: true,
    })

    logApiOutcome({
      route: '/api/molecule/[id]/research-kit',
      method: 'GET',
      status: 200,
      ms: timer.ms(),
      cid,
      source: 'research-kit',
    })

    return NextResponse.json({
      ...bundle,
      meta: {
        categoriesRequested: categories,
        categoriesLoaded: loaded,
        categoriesFailed: failed,
        factCount: ledger.rows.filter((r) => r.value && r.value !== '—').length,
        sourceCount: ledger.sourceCount,
        honesty: [
          'Free public APIs only',
          'Session/sample counts not universe totals',
          'Not clinical or regulatory decision support',
        ],
      },
    })
  } catch (error) {
    if (error instanceof PubChemUpstreamError) {
      logApiOutcome({
        route: '/api/molecule/[id]/research-kit',
        method: 'GET',
        status: 502,
        ms: timer.ms(),
        cid,
        source: 'pubchem',
        retryable: true,
        error: error.message.slice(0, 200),
      })
      return NextResponse.json(
        {
          error: 'Upstream molecule lookup unavailable',
          retryable: true,
          message: error.message,
        },
        { status: 502 },
      )
    }
    logApiOutcome({
      route: '/api/molecule/[id]/research-kit',
      method: 'GET',
      status: 500,
      ms: timer.ms(),
      cid,
      error: error instanceof Error ? error.message.slice(0, 200) : 'unknown',
    })
    return NextResponse.json({ error: 'Failed to build research kit' }, { status: 500 })
  }
}
