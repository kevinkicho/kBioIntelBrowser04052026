'use client'

import type { MoleculeSummaryData } from '@/lib/moleculeSummary'
import {
  emptyDataClass,
  isEmptyMetric,
  summaryCardHasData,
} from '@/lib/summaryEmpty'

interface MoleculeSummaryProps {
  data: MoleculeSummaryData
  onCategoryClick: (categoryId: string) => void
  onMetricClick?: (categoryId: string, panelId: string) => void
}

/** Re-export for tests / call sites that imported from the component. */
export { isEmptyMetric as isEmptySummaryValue } from '@/lib/summaryEmpty'

export function MoleculeSummary({ data, onCategoryClick, onMetricClick }: MoleculeSummaryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {data.cards.map((card) => {
        const emptyCard = !summaryCardHasData(card)
        const emptyPrimary = isEmptyMetric(card.primaryValue)

        return (
          <div
            key={card.id}
            data-testid={`summary-card-${card.id}`}
            data-empty={emptyCard ? 'true' : 'false'}
            className={`bg-slate-800/50 border border-slate-700 ${card.accentColor} border-t-2 rounded-xl text-left transition-colors flex flex-col w-full ${emptyDataClass(emptyCard)}`}
          >
            <button
              onClick={() => onCategoryClick(card.categoryId)}
              className="w-full text-left p-4 pb-2 hover:bg-slate-700/50 transition-colors rounded-t-xl"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <span>{card.icon}</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {card.title}
                </span>
              </div>

              <div
                className={`mt-1 flex flex-col items-start group ${emptyDataClass(emptyPrimary)}`}
                data-testid={`summary-primary-${card.id}`}
                data-empty={emptyPrimary ? 'true' : 'false'}
                onClick={(e) => {
                  if (onMetricClick && card.primaryPanelId) {
                    e.stopPropagation()
                    onMetricClick(card.categoryId, card.primaryPanelId)
                  }
                }}
              >
                <p className="text-2xl font-bold text-slate-100 group-hover:text-indigo-400 transition-colors cursor-pointer inline-flex items-center gap-2">
                  {card.primaryValue}
                  {card.primaryPanelId && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                      <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                    </svg>
                  )}
                </p>
                <p className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors cursor-pointer">
                  {card.primaryLabel}
                </p>
              </div>
            </button>

            <div className="p-4 pt-0 space-y-1">
              {card.secondaryMetrics.map((metric) => {
                const emptyMetric = isEmptyMetric(metric.value)
                const dimRow = emptyMetric && !emptyCard
                return (
                  <div
                    key={metric.label}
                    data-testid={`summary-metric-${card.id}-${metric.label}`}
                    data-empty={emptyMetric ? 'true' : 'false'}
                    className={`text-xs text-slate-400 py-1 ${emptyDataClass(dimRow)}`}
                  >
                    {metric.panelId ? (
                      <button
                        onClick={() => {
                          if (onMetricClick) onMetricClick(card.categoryId, metric.panelId as string)
                        }}
                        className="group flex items-center gap-1 hover:text-indigo-300 transition-colors w-full text-left"
                      >
                        <span className="text-slate-300 font-medium group-hover:text-white">
                          {metric.value}
                        </span>{' '}
                        {metric.label}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                          <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                        </svg>
                      </button>
                    ) : (
                      <span>
                        <span className="text-slate-300 font-medium">{metric.value}</span>{' '}
                        {metric.label}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
