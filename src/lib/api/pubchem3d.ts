/**
 * PubChem 3D availability helpers.
 * MolView embed loads `…/sdf?record_type=3d` and crashes with
 * `Cannot read properties of undefined (reading 'replace')` when PubChem 404s
 * (many large / peptide / non-conformer CIDs have no 3D model).
 */

const BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug'

export function pubchem3dSdfUrl(cid: number): string {
  return `${BASE}/compound/cid/${cid}/SDF?record_type=3d`
}

/**
 * True when PubChem has at least one 3D conformer for this CID.
 * Uses ConformerCount3D property (lightweight JSON) with SDF HEAD fallback.
 */
export async function hasPubChem3dConformer(cid: number): Promise<boolean> {
  if (!Number.isFinite(cid) || cid <= 0) return false

  try {
    const propUrl = `${BASE}/compound/cid/${cid}/property/ConformerCount3D/JSON`
    const res = await fetch(propUrl, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (res.ok) {
      const data = (await res.json()) as {
        PropertyTable?: { Properties?: Array<{ ConformerCount3D?: number }> }
      }
      const count = data.PropertyTable?.Properties?.[0]?.ConformerCount3D
      if (typeof count === 'number') return count > 0
    }
  } catch {
    // fall through to SDF probe
  }

  try {
    const res = await fetch(pubchem3dSdfUrl(cid), {
      method: 'HEAD',
      cache: 'no-store',
    })
    if (res.ok) return true
    // Some CDNs reject HEAD; try a ranged GET
    if (res.status === 405 || res.status === 501) {
      const getRes = await fetch(pubchem3dSdfUrl(cid), {
        method: 'GET',
        cache: 'no-store',
        headers: { Range: 'bytes=0-64' },
      })
      return getRes.ok || getRes.status === 206
    }
    return false
  } catch {
    return false
  }
}

/** In-tab memo so ProfileHeader + MoleculeViewer3D share one probe per CID. */
const clientProbeCache = new Map<number, Promise<boolean>>()

/**
 * Browser-safe preflight via same-origin API (preferred in the client).
 * Dedupes concurrent/repeated probes for the same CID in this page session.
 * Falls back to direct PubChem probe if the API is unavailable.
 */
export async function probePubChem3dClient(cid: number): Promise<boolean> {
  if (!Number.isFinite(cid) || cid <= 0) return false
  const hit = clientProbeCache.get(cid)
  if (hit) return hit

  const promise = (async () => {
    try {
      const res = await fetch(`/api/pubchem/has-3d?cid=${cid}`, {
        method: 'GET',
        cache: 'no-store',
      })
      if (res.ok) {
        const data = (await res.json()) as { has3d?: boolean }
        if (typeof data.has3d === 'boolean') return data.has3d
      }
    } catch {
      /* fall through */
    }
    return hasPubChem3dConformer(cid)
  })()

  clientProbeCache.set(cid, promise)
  try {
    return await promise
  } catch (err) {
    clientProbeCache.delete(cid)
    throw err
  }
}

/** Test-only: clear client probe memo. */
export function clearPubChem3dClientProbeCache(): void {
  clientProbeCache.clear()
}
