import { notFound } from 'next/navigation'
import { getMoleculeById } from '@/lib/api/pubchem'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ScrollToTop } from '@/components/ui/ScrollToTop'
import { ProfilePageClient } from './ProfilePageClient'
import Link from 'next/link'

export default async function MoleculePage({ params }: { params: { id: string } }) {
  const cid = parseInt(params.id, 10)
  if (isNaN(cid)) notFound()

  const molecule = await getMoleculeById(cid)
  if (!molecule) notFound()

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col">
      <header className="border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link href="/" className="text-slate-400 hover:text-slate-200 text-sm flex items-center gap-1.5">
          <span className="text-lg">🧬</span>
          <span className="font-semibold text-slate-200">BioIntel Explorer</span>
        </Link>
        <div className="text-xs text-slate-500">
          CID: {cid}
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-6">
        <div className="mb-6">
          <ProfileHeader molecule={molecule} />
        </div>

        <ProfilePageClient
          cid={cid}
          moleculeName={molecule.name}
          molecularWeight={molecule.molecularWeight}
        />
      </main>
      <ScrollToTop />
    </div>
  )
}
