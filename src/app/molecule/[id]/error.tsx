'use client'

import { useEffect } from 'react'

export default function MoleculeError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[MoleculeError]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <div className="max-w-md text-center space-y-4 p-8">
        <div className="text-5xl">&#x1F9EA;</div>
        <h1 className="text-xl font-bold text-red-400">Failed to load molecule</h1>
        <p className="text-sm text-slate-400">
          {error.message || 'An unexpected error occurred while loading this molecule.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-sm rounded-lg transition-colors"
          >
            Try again
          </button>
          <a
            href="/"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-sm rounded-lg transition-colors"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  )
}