import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { IRISAssessment } from '@/lib/types'

function AssessmentItem({ assessment }: { assessment: IRISAssessment }) {
  const statusColors = {
    Final: 'bg-green-900/40 text-green-300 border-green-700/30',
    'Under Review': 'bg-yellow-900/40 text-yellow-300 border-yellow-700/30',
    Development: 'bg-blue-900/40 text-blue-300 border-blue-700/30',
  }

  const cancerColors = {
    Carcinogenic: 'text-red-400',
    'Likely Carcinogenic': 'text-red-300',
    Suggestive: 'text-yellow-400',
    Inadequate: 'text-slate-400',
    'Not Likely': 'text-green-400',
  }

  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-100 text-sm">{assessment.chemicalName}</h4>
          <p className="text-xs text-slate-400 mt-0.5">CAS: {assessment.casNumber}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${statusColors[assessment.assessmentStatus]}`}>
          {assessment.assessmentStatus}
        </span>
      </div>

      {(assessment.oralRfD || assessment.inhalationRfC) && (
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          {assessment.oralRfD && (
            <div className="bg-slate-800/50 rounded p-2">
              <span className="text-slate-400">Oral RfD:</span>
              <span className="text-cyan-300 ml-1">{assessment.oralRfD} {assessment.oralRfDUnits}</span>
              {assessment.oralRfDConfidence && (
                <span className="text-slate-500 ml-1">({assessment.oralRfDConfidence} confidence)</span>
              )}
            </div>
          )}
          {assessment.inhalationRfC && (
            <div className="bg-slate-800/50 rounded p-2">
              <span className="text-slate-400">Inhalation RfC:</span>
              <span className="text-cyan-300 ml-1">{assessment.inhalationRfC} {assessment.inhalationRfCUnits}</span>
              {assessment.inhalationRfCConfidence && (
                <span className="text-slate-500 ml-1">({assessment.inhalationRfCConfidence})</span>
              )}
            </div>
          )}
        </div>
      )}

      {assessment.cancerClassification && (
        <div className="mt-2 text-xs">
          <span className="text-slate-400">Cancer:</span>
          <span className={`ml-1 ${cancerColors[assessment.cancerClassification] || 'text-slate-300'}`}>
            {assessment.cancerClassification}
          </span>
        </div>
      )}

      {assessment.criticalEffects.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {assessment.criticalEffects.slice(0, 3).map((effect, i) => (
            <span key={i} className="text-xs bg-red-900/30 text-red-300 px-1.5 py-0.5 rounded">
              {effect}
            </span>
          ))}
          {assessment.criticalEffects.length > 3 && (
            <span className="text-xs text-slate-400">+{assessment.criticalEffects.length - 3} more</span>
          )}
        </div>
      )}

      {assessment.organsAffected.length > 0 && (
        <p className="text-xs text-slate-500 mt-1">
          Organs: {assessment.organsAffected.join(', ')}
        </p>
      )}

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-slate-500">Last updated: {assessment.lastUpdated || 'N/A'}</span>
        <a
          href={assessment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-cyan-400 hover:text-cyan-300"
        >
          Full Assessment →
        </a>
      </div>
    </div>
  )
}

export const IRISPanel = memo(function IRISPanel({ assessments, panelId, lastFetched }: { assessments: IRISAssessment[], panelId?: string, lastFetched?: Date }) {
  const isEmpty = assessments.length === 0
  return (
    <Panel
      title="EPA IRIS"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No EPA IRIS toxicological assessments found for this molecule." : undefined}
    >
      {!isEmpty && (
        <>
          <p className="text-xs text-slate-400 mb-3">
            Integrated Risk Information System — {assessments.length} assessment{assessments.length !== 1 ? 's' : ''}
          </p>
          <PaginatedList className="space-y-2">
            {assessments.map((assessment, i) => (
              <AssessmentItem key={`${assessment.id}-${i}`} assessment={assessment} />
            ))}
          </PaginatedList>
        </>
      )}
    </Panel>
  )
})