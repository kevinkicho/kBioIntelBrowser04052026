'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="bg-[#0f1117] text-slate-200 min-h-screen flex items-center justify-center">
        <div className="max-w-md text-center space-y-4 p-8">
          <div className="text-5xl">&#x26A0;&#xFE0F;</div>
          <h1 className="text-xl font-bold text-red-400">Something went wrong</h1>
          <p className="text-sm text-slate-400">
            {error.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-sm rounded-lg transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}