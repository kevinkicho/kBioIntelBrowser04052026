'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { FilterablePaginatedList } from '@/components/ui/FilterablePaginatedList'
import type { IRISAssessment } from '@/lib/types'
import { alphaSortOptions, dateSortOptions } from '@/lib/listControls'

function formatDose(
  value: number | null,
  units: string,
  display?: string,
): string | null {
  if (display?.trim()) return display.trim()
  if (value == null || !Number.isFinite(value)) return null
  // Prefer compact scientific form for small RfD/RfC values
  if (value !== 0 && (Math.abs(value) < 0.01 || Math.abs(value) >= 1000)) {
    return `${value.toExponential(2)} ${units}`.trim()
  }
  return `${value} ${units}`.trim()
}

function AssessmentItem({ assessment }: { assessment: IRISAssessment }) {
  const statusColors = {
    Final: 'bg-green-900/40 text-green-300 border-green-700/30',
    'Under Review': 'bg-yellow-900/40 text-yellow-300 border-yellow-700/30',
    Development: 'bg-blue-900/40 text-blue-300 border-blue-700/30',
  }

  const cancerColors: Record<string, string> = {
    Carcinogenic: 'text-red-400',
    'Likely Carcinogenic': 'text-red-300',
    Suggestive: 'text-yellow-400',
    Inadequate: 'text-slate-400',
    'Not Likely': 'text-green-400',
  }

  const oral = formatDose(assessment.oralRfD, assessment.oralRfDUnits, assessment.oralRfDDisplay)
  const inhalation = formatDose(
    assessment.inhalationRfC,
    assessment.inhalationRfCUnits,
    assessment.inhalationRfCDisplay,
  )
  const cas = assessment.casNumber?.trim()
  const hasTox = Boolean(oral || inhalation || assessment.criticalEffects?.length)
  const effects = assessment.criticalEffects || []
  const organs = assessment.organsAffected || []

  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-100 text-sm">{assessment.chemicalName}</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            CAS:{' '}
            {cas ? (
              <span className="font-mono text-slate-300">{cas}</span>
            ) : (
              <span className="text-slate-500 italic">not available</span>
            )}
          </p>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded shrink-0 border ${statusColors[assessment.assessmentStatus] || statusColors.Development}`}
        >
          {assessment.assessmentStatus}
        </span>
      </div>

      {(oral || inhalation) && (
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          {oral && (
            <div className="bg-slate-800/50 rounded p-2">
              <span className="text-slate-400">Oral RfD:</span>
              <span className="text-cyan-300 ml-1">{oral}</span>
              {assessment.oralRfDConfidence && (
                <span className="text-slate-500 ml-1">
                  ({assessment.oralRfDConfidence} confidence)
                </span>
              )}
            </div>
          )}
          {inhalation && (
            <div className="bg-slate-800/50 rounded p-2">
              <span className="text-slate-400">Inhalation RfC:</span>
              <span className="text-cyan-300 ml-1">{inhalation}</span>
              {assessment.inhalationRfCConfidence && (
                <span className="text-slate-500 ml-1">
                  ({assessment.inhalationRfCConfidence})
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {assessment.hasIrisData === false && !hasTox && (
        <p className="mt-2 text-[11px] text-slate-500">
          No published IRIS RfD/RfC values found in PubChem for this chemical. Open CompTox / IRIS
          for the latest assessment status.
        </p>
      )}

      {assessment.cancerClassification &&
        (assessment.hasIrisData || assessment.cancerClassification !== 'Inadequate') && (
          <div className="mt-2 text-xs">
            <span className="text-slate-400">Cancer:</span>
            <span
              className={`ml-1 ${cancerColors[assessment.cancerClassification] || 'text-slate-300'}`}
            >
              {assessment.cancerClassification}
            </span>
          </div>
        )}

      {effects.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {effects.slice(0, 3).map((effect, i) => (
            <span key={i} className="text-xs bg-red-900/30 text-red-300 px-1.5 py-0.5 rounded">
              {effect}
            </span>
          ))}
          {effects.length > 3 && (
            <span className="text-xs text-slate-400">+{effects.length - 3} more</span>
          )}
        </div>
      )}

      {organs.length > 0 && (
        <p className="text-xs text-slate-500 mt-1">Organs: {organs.join(', ')}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        {assessment.lastUpdated ? (
          <span className="text-xs text-slate-500">Last updated: {assessment.lastUpdated}</span>
        ) : (
          <span className="text-xs text-slate-600">EPA IRIS / CompTox</span>
        )}
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

export const IRISPanel = memo(function IRISPanel({
  assessments,
  panelId,
  lastFetched,
}: {
  assessments: IRISAssessment[]
  panelId?: string
  lastFetched?: Date
}) {
  const list = Array.isArray(assessments) ? assessments : []
  const isEmpty = list.length === 0

  const sortOptions = useMemo(
    () => [
      ...dateSortOptions<IRISAssessment>((a) => a.lastUpdated, {
        newest: 'Newest update',
        oldest: 'Oldest update',
      }),
      ...alphaSortOptions<IRISAssessment>((a) => a.chemicalName || ''),
    ],
    [],
  )

  return (
    <Panel
      title="EPA IRIS"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? 'No EPA IRIS toxicological assessments found for this molecule.' : undefined}
    >
      {!isEmpty && (
        <>
          <p className="text-xs text-slate-400 mb-3">
            Integrated Risk Information System — {list.length} assessment
            {list.length !== 1 ? 's' : ''}
          </p>
          <FilterablePaginatedList
            items={list}
            getSearchText={(a) =>
              [
                a.chemicalName,
                a.casNumber,
                a.assessmentStatus,
                a.cancerClassification,
                a.lastUpdated,
                a.oralRfDDisplay,
                a.inhalationRfCDisplay,
                ...(a.criticalEffects || []),
                ...(a.organsAffected || []),
              ]
                .filter(Boolean)
                .join(' ')
            }
            sortOptions={sortOptions}
            defaultSortId="date-desc"
            filterPlaceholder="Filter assessments…"
            getKey={(assessment, i) => `${assessment.id}-${i}`}
            renderItem={(assessment) => <AssessmentItem assessment={assessment} />}
          />
        </>
      )}
    </Panel>
  )
})
