import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CampaignWorkspaceClient } from '@/components/campaign/CampaignWorkspaceClient'

export const metadata: Metadata = {
  title: 'Campaign workspace · BioIntel',
  description:
    'Multi-stage scientific campaigns: disease → shortlist → pack → hypothesis → Monday work. Free public APIs only; of-record Discover rank stays deterministic.',
}

export default function CampaignPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-400" data-testid="campaign-workspace-loading">
          Loading campaign workspace…
        </main>
      }
    >
      <CampaignWorkspaceClient />
    </Suspense>
  )
}
