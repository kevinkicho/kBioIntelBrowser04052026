import { redirect, notFound } from 'next/navigation'
import {
  getMoleculeCidByName,
  getMoleculeCandidatesByName,
} from '@/lib/api/pubchem'

/**
 * Resolve a free-text molecule name → /molecule/{cid}.
 * On App Hosting, PubChem PUG often 503s; getMoleculeCidByName / candidates
 * fall back to MyChem (handles pubchem[] CID arrays).
 */
export default async function MoleculeByNamePage({
  params,
}: {
  params: { name: string }
}) {
  const name = decodeURIComponent(params.name).trim()
  if (!name) notFound()

  // 1) Direct CID resolution (PubChem → MyChem)
  let cid = await getMoleculeCidByName(name)

  // 2) Candidates path (same fallbacks; useful for multi-CID names)
  if (!cid) {
    const candidates = await getMoleculeCandidatesByName(name, 5)
    if (candidates.length > 0) {
      // Prefer lowest CID (usually parent compound)
      const sorted = [...candidates].sort((a, b) => a.cid - b.cid)
      cid = sorted[0]!.cid
    }
  }

  if (!cid) notFound()
  redirect(`/molecule/${cid}`)
}
