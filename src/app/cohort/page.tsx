import Link from 'next/link'
import { Suspense } from 'react'
import { CohortClient } from './CohortClient'

export const metadata = {
  title: 'Cohort Comparison · BioIntel Explorer',
  description:
    'Build a cohort of 5–10 molecules and compare them as a heatmap matrix across molecular, pharmaceutical, clinical, bioactivity, and research attributes.',
}

export default function CohortPage() {
  return (
    <div className="min-h-screen bg-[#0f1117]">
      <header className="border-b border-slate-800 px-6 py-4">
        <Link href="/" className="text-slate-400 hover:text-slate-200 text-sm">← BioIntel Explorer</Link>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Suspense fallback={<div className="animate-pulse h-96 bg-slate-800/50 rounded-xl" />}>
          <CohortClient />
        </Suspense>
      </main>
    </div>
  )
}
