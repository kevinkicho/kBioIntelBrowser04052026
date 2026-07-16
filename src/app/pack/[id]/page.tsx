import Link from 'next/link'
import { loadSnapshot } from '@/lib/snapshot/store'
import type { EvidencePack } from '@/lib/evidence/pack'
import { PackView } from '@/components/evidence/PackView'

export default function SharedPackPage({ params }: { params: { id: string } }) {
  const snap = loadSnapshot(params.id)
  if (!snap || snap.entity.type !== 'evidence-pack') {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-16">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-xl font-semibold text-slate-200">Pack not found</h1>
          <p className="mt-2 text-sm text-slate-500">
            This share link is missing or expired (30-day TTL).
          </p>
          <Link href="/" className="mt-6 inline-block text-sm text-indigo-400 hover:text-indigo-300">
            ← Home
          </Link>
        </div>
      </main>
    )
  }

  const pack = snap.data as unknown as EvidencePack

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-300">
            ← BioIntel
          </Link>
          <span className="text-[10px] text-slate-600">
            Shared pack · expires {new Date(snap.expiresAt).toLocaleDateString()}
          </span>
        </div>
        <h1 className="mb-1 text-2xl font-bold text-slate-100">{pack.title || snap.entity.name}</h1>
        <p className="mb-6 text-xs text-slate-500">
          Read-only snapshot · public free-data evidence · not for clinical use
        </p>
        <PackView pack={pack} />
      </div>
    </main>
  )
}
