import { redirect } from 'next/navigation'
import { getMoleculeCidByName } from '@/lib/api/pubchem'
import { notFound } from 'next/navigation'

export default async function MoleculeByNamePage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name)
  const cid = await getMoleculeCidByName(name)
  if (!cid) notFound()
  redirect(`/molecule/${cid}`)
}
