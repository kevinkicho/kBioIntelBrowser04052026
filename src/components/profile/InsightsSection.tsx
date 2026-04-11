'use client'

import { TrialPhaseChart } from '@/components/charts/TrialPhaseChart'
import { AdverseEventChart } from '@/components/charts/AdverseEventChart'
import { BioactivityChart } from '@/components/charts/BioactivityChart'
import { PublicationTimeline } from '@/components/charts/PublicationTimeline'
import { MoleculeTimeline } from '@/components/charts/MoleculeTimeline'
import { ResearchDigest } from '@/components/profile/ResearchDigest'
import { CompetitiveLandscape } from '@/components/profile/CompetitiveLandscape'
import type { ClinicalTrial, AdverseEvent, ChemblActivity, LiteratureResult, Patent, DrugRecall, OrangeBookEntry, CompanyProduct, SemanticPaper } from '@/lib/types'

interface Props {
  data: Record<string, unknown>
}

export function InsightsSection({ data }: Props) {
  const trials = Array.isArray(data.clinicalTrials) ? data.clinicalTrials as ClinicalTrial[] : []
  const events = Array.isArray(data.adverseEvents) ? data.adverseEvents as AdverseEvent[] : []
  const activities = Array.isArray(data.chemblActivities) ? data.chemblActivities as ChemblActivity[] : []
  const papers = Array.isArray(data.literature) ? data.literature as LiteratureResult[] : []
  const patents = Array.isArray(data.patents) ? data.patents as Patent[] : []
  const recalls = Array.isArray(data.drugRecalls) ? data.drugRecalls as DrugRecall[] : []
  const orangeBook = Array.isArray(data.orangeBookEntries) ? data.orangeBookEntries as OrangeBookEntry[] : []
  const companies = Array.isArray(data.companies) ? data.companies as CompanyProduct[] : []
  const semanticPapers = Array.isArray(data.semanticPapers) ? data.semanticPapers as SemanticPaper[] : []

  const hasChartData = trials.length > 0 || events.length > 0 || activities.length > 0 || papers.length > 0
  const hasTimelineData = patents.length > 0 || trials.length > 0 || recalls.length > 0 || orangeBook.length > 0
  const hasDigestData = semanticPapers.some(p => p.tldr && p.tldr.length > 10)
  const currentChemblId = activities[0]?.chemblId || ''

  if (!hasChartData && !hasTimelineData && !hasDigestData) return null

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Insights</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {hasTimelineData && (
          <MoleculeTimeline
            patents={patents}
            trials={trials}
            recalls={recalls}
            orangeBookEntries={orangeBook}
            companies={companies}
          />
        )}
        {hasDigestData && (
          <ResearchDigest
            semanticPapers={semanticPapers}
            literature={papers}
          />
        )}
        {activities.length > 0 && (
          <CompetitiveLandscape 
            activities={activities} 
            currentChemblId={currentChemblId} 
          />
        )}
        {trials.length > 0 && <TrialPhaseChart trials={trials} />}
        {events.length > 0 && <AdverseEventChart events={events} />}
        {activities.length > 0 && <BioactivityChart activities={activities} />}
        {papers.length > 0 && <PublicationTimeline results={papers} />}
      </div>
    </div>
  )
}


