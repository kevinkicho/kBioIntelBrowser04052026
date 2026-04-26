import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getMoleculeById } from '@/lib/api/pubchem'
import { buildStructureImageUrl } from '@/lib/utils'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ScrollToTop } from '@/components/ui/ScrollToTop'
import { ProfilePageClient } from './ProfilePageClient'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const cid = parseInt(params.id, 10)
  if (isNaN(cid)) return { title: 'BioIntel Explorer' }
  const molecule = await getMoleculeById(cid).catch(() => null)
  if (!molecule) return { title: 'BioIntel Explorer' }

  const title = `${molecule.name} · BioIntel Explorer`
  // Prefer IUPAC name (truncated), fall back to short description, fall back to synonyms
  let desc = molecule.iupacName?.slice(0, 160) || ''
  if (!desc) desc = (molecule.description || '').slice(0, 160)
  if (!desc && molecule.synonyms?.length) {
    desc = `Also known as: ${molecule.synonyms.slice(0, 5).join(', ')}`.slice(0, 160)
  }
  const image = buildStructureImageUrl(cid)

  return {
    title,
    description: desc || `Explore ${molecule.name} on BioIntel Explorer`,
    openGraph: {
      title,
      description: desc,
      images: [{ url: image, alt: `Structure of ${molecule.name}` }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [image],
    },
  }
}

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