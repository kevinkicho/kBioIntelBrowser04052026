'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MoleculeSearch } from '@/components/compare/MoleculeSearch'
import { clientFetch } from '@/lib/clientFetch'

interface Selection {
  name: string
  cid: number
}

export function ComparePageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const cidAParam = searchParams.get('a')
  const cidBParam = searchParams.get('b')

  const [selectionA, setSelectionA] = useState<Selection | null>(null)
  const [selectionB, setSelectionB] = useState<Selection | null>(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    async function resolve() {
      const cidA = cidAParam ? parseInt(cidAParam, 10) : NaN
      const cidB = cidBParam ? parseInt(cidBParam, 10) : NaN

      if (!isNaN(cidA) && cidA > 0) {
        try {
          const res = await clientFetch(`/api/search/resolve?cid=${cidA}`)
          if (res.ok) {
            const data = await res.json()
            setSelectionA({ name: data.name ?? `CID ${cidA}`, cid: cidA })
          } else {
            setSelectionA({ name: `CID ${cidA}`, cid: cidA })
          }
        } catch {
          setSelectionA({ name: `CID ${cidA}`, cid: cidA })
        }
      }
      if (!isNaN(cidB) && cidB > 0) {
        try {
          const res = await clientFetch(`/api/search/resolve?cid=${cidB}`)
          if (res.ok) {
            const data = await res.json()
            setSelectionB({ name: data.name ?? `CID ${cidB}`, cid: cidB })
          } else {
            setSelectionB({ name: `CID ${cidB}`, cid: cidB })
          }
        } catch {
          setSelectionB({ name: `CID ${cidB}`, cid: cidB })
        }
      }
      setInitialized(true)
    }
    resolve()
  }, [cidAParam, cidBParam])

  const bothSelected = selectionA !== null && selectionB !== null
  const currentUrlA = cidAParam ? parseInt(cidAParam, 10) : null
  const currentUrlB = cidBParam ? parseInt(cidBParam, 10) : null
  const matchesUrl =
    bothSelected &&
    selectionA.cid === currentUrlA &&
    selectionB.cid === currentUrlB

  function handleCompare() {
    if (!bothSelected) return
    router.push(`/compare?a=${selectionA.cid}&b=${selectionB.cid}`)
  }

  function handleClear(side: 'a' | 'b') {
    if (side === 'a') setSelectionA(null)
    else setSelectionB(null)
  }

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative">
          <MoleculeSearch
            label="Molecule A"
            initialName={initialized ? (selectionA?.name ?? '') : ''}
            onSelect={(name, cid) => setSelectionA({ name, cid })}
          />
          {selectionA && (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-xs text-indigo-300 bg-indigo-900/30 border border-indigo-800/40 px-2 py-0.5 rounded-full">
                {selectionA.name} (CID {selectionA.cid})
              </span>
              <button
                onClick={() => handleClear('a')}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                clear
              </button>
            </div>
          )}
        </div>
        <div className="relative">
          <MoleculeSearch
            label="Molecule B"
            initialName={initialized ? (selectionB?.name ?? '') : ''}
            onSelect={(name, cid) => setSelectionB({ name, cid })}
          />
          {selectionB && (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-xs text-indigo-300 bg-indigo-900/30 border border-indigo-800/40 px-2 py-0.5 rounded-full">
                {selectionB.name} (CID {selectionB.cid})
              </span>
              <button
                onClick={() => handleClear('b')}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                clear
              </button>
            </div>
          )}
        </div>
      </div>

      {bothSelected && !matchesUrl && (
        <div className="mt-4 text-center">
          <button
            onClick={handleCompare}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Compare {selectionA.name} vs {selectionB.name}
          </button>
        </div>
      )}

      {bothSelected && matchesUrl && (
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500">
            Showing comparison — change a selection above to compare different molecules
          </p>
        </div>
      )}
    </div>
  )
}