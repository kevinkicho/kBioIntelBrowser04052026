import type { Metadata } from 'next'
import { CampaignWorkspaceClient } from '@/components/campaign/CampaignWorkspaceClient'

export const metadata: Metadata = {
  title: 'Campaign workspace · BioIntel',
  description:
    'Multi-stage scientific campaigns: disease → shortlist → pack → hypothesis → Monday work. Free public APIs only; of-record Discover rank stays deterministic.',
}

export default function CampaignPage() {
  return <CampaignWorkspaceClient />
}
