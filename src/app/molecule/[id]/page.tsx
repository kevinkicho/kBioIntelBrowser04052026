import { notFound } from 'next/navigation'
import { getMoleculeById } from '@/lib/api/pubchem'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ScrollToTop } from '@/components/ui/ScrollToTop'
import { ProfilePageClient } from './ProfilePageClient'

export default async function MoleculePage({ params }: { params: { id: string } }) {
  const cid = parseInt(params.id, 10)
  if (isNaN(cid)) notFound()

  const molecule = await getMoleculeById(cid)
  if (!molecule) notFound()

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col">
      <main className="flex-1 px-4 sm:px-6 py-4">
        <div className="mb-5">
          <ProfileHeader molecule={molecule} />
        </div>

        <ProfilePageClient
          cid={cid}
          moleculeName={molecule.name}
          molecularWeight={molecule.molecularWeight}
          inchiKey={molecule.inchiKey}
          iupacName={molecule.iupacName}
        />
      </main>
      <ScrollToTop />
    </div>
  )
}