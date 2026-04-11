'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { MoleculeSearch } from '@/components/compare/MoleculeSearch'

export function ComparePageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const cidA = searchParams.get('a') ?? ''
  const cidB = searchParams.get('b') ?? ''

  function handleSelect(side: 'a' | 'b', _name: string, cid: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set(side, String(cid))
    router.push(`/compare?${params.toString()}`)
  }

  return (
    <div className="grid grid-cols-2 gap-4 mb-8">
      <MoleculeSearch
        label="Molecule A"
        value={cidA}
        onSelect={(name, cid) => handleSelect('a', name, cid)}
      />
      <MoleculeSearch
        label="Molecule B"
        value={cidB}
        onSelect={(name, cid) => handleSelect('b', name, cid)}
      />
    </div>
  )
}
