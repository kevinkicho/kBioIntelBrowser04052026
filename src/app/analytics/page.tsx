'use client'

import { ProductFunnelPanel } from '@/components/analytics/ProductFunnelPanel'
import { RequestMetricsPanel } from '@/components/analytics/RequestMetricsPanel'
import { API_METADATA } from '@/lib/analytics/api-meta'
import { StyledTooltip } from '@/components/ui/StyledTooltip'
import {
  ApiMetaInfo,
  healthDot,
  timeAgo,
  fmtMs,
  apiName,
  endpointLabel,
  Sparkline,
  MiniBar,
  ApiSummaryList,
  type ViewMode,
} from '@/components/analytics/analyticsPageUi'
import { useAnalyticsDashboard } from '@/hooks/useAnalyticsDashboard'

export default function AnalyticsPage() {
  const {
    view,
    setView,
    layout,
    setLayout,
    since,
    setSince,
    filter,
    setFilter,
    categories,
    flatApis,
    trend,
    errors,
    loading,
    expanded,
    detailSource,
    detail,
    detailLoading,
    fetchData,
    openDetail,
    closeDetail,
    toggleCategory,
  } = useAnalyticsDashboard()

  return (
    <div className="page-canvas text-slate-100">
      <div className="w-full min-w-0">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Analytics</h1>
            <p className="text-slate-400 mt-1">
              Product funnel (M1–M9) and API health, response times, and data availability
            </p>
          </div>
          <div className="flex items-center gap-3">
            {view === 'summary' && (
              <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700">
                <button
                  onClick={() => setLayout('grouped')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-l-lg ${layout === 'grouped' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Grouped
                </button>
                <button
                  onClick={() => setLayout('flat')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-r-lg ${layout === 'flat' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Table
                </button>
              </div>
            )}
            <select
              value={since}
              onChange={e => setSince(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
            <StyledTooltip content="Refresh">
              <button
                onClick={fetchData}
                className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
                aria-label="Refresh"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </StyledTooltip>
            <a href="/" className="text-indigo-400 hover:text-indigo-300 text-sm">Back to app</a>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {(['summary', 'trend', 'errors'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                (v === 'summary' && view === 'summary') || (v === 'table' && view === 'table')
                  ? 'bg-indigo-600 text-white'
                  : view === v
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {v === 'summary' ? 'Overview' : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* Always show product funnel on overview (local + server product source) */}
        {view === 'summary' && (
          <div className="mb-6 space-y-4">
            <ProductFunnelPanel />
            <RequestMetricsPanel />
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-slate-500 animate-pulse">Loading analytics...</div>
        ) : view === 'summary' && layout === 'flat' ? (
          <div>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Filter APIs by name..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            {(() => {
              const filtered = flatApis.filter(
                (api) =>
                  !filter ||
                  apiName(api.source).toLowerCase().includes(filter.toLowerCase()) ||
                  api.categoryLabel.toLowerCase().includes(filter.toLowerCase()),
              )
              if (filtered.length === 0) {
                return (
                  <p className="py-8 text-center text-slate-500">No APIs match your filter.</p>
                )
              }
              return (
                <ApiSummaryList apis={filtered} onOpen={openDetail} flat />
              )
            })()}
          </div>
        ) : view === 'summary' ? (
          <div>
            {categories.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                No API calls recorded yet. Browse some molecules to start collecting data.
              </div>
            )}
            {categories.map(cat => (
              <div key={cat.id} className="mb-3">
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-5 py-4 rounded-xl transition-colors ${
                    expanded.has(cat.id)
                      ? 'bg-slate-800/80 border border-slate-700/50'
                      : 'bg-slate-800/40 border border-slate-700/30 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{cat.icon}</span>
                    <span className="font-semibold text-white text-lg">{cat.label}</span>
                    <span className="text-slate-400 text-sm">
                      {cat.success_count}/{cat.total_requests} OK
                    </span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-sm text-slate-400">{healthDot(cat.success_rate)} {cat.success_rate}%</span>
                    <span className="text-sm text-slate-400">{cat.avg_duration_ms}ms avg</span>
                    <span className="text-sm">
                      {cat.error_count > 0 && <span className="text-red-400">{cat.error_count} errors</span>}
                      {cat.empty_count > 0 && cat.error_count > 0 && <span className="text-slate-600"> {'\u00B7'} </span>}
                      {cat.empty_count > 0 && <span className="text-yellow-400/70">{cat.empty_count} empty</span>}
                    </span>
                    <svg
                      className={`w-5 h-5 text-slate-400 transition-transform ${expanded.has(cat.id) ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                {expanded.has(cat.id) && (
                  <div
                    className="mt-1 rounded-b-xl border border-t-0 border-slate-800/50 bg-slate-950/40"
                    data-testid={`analytics-cat-list-${cat.id}`}
                  >
                    {/* Same fixed grid for Search, Other, and every category → columns align */}
                    <ApiSummaryList apis={cat.apis} onOpen={openDetail} />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : view === 'errors' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="text-left py-3 px-4">Time</th>
                  <th className="text-left py-3 px-4">Source</th>
                  <th className="text-center py-3 px-4">Status</th>
                  <th className="text-right py-3 px-4">Duration</th>
                  <th className="text-left py-3 px-4">Error</th>
                </tr>
              </thead>
              <tbody>
                {errors.map(e => (
                  <tr
                    key={e.id}
                    onClick={() => openDetail(e.source)}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer"
                  >
                    <td className="py-2 px-4 text-slate-400">{new Date(e.timestamp).toLocaleString()}</td>
                    <td className="py-2 px-4 hover:text-indigo-300">{apiName(e.source)}</td>
                    <td className="py-2 px-4 text-center text-red-400">{e.status}</td>
                    <td className="py-2 px-4 text-right text-slate-300">{e.duration_ms}ms</td>
                    <td className="py-2 px-4 text-red-300 text-xs">{e.error || '\u2014'}</td>
                  </tr>
                ))}
                {errors.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      No errors recorded. Everything looks good!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Source</th>
                  <th className="text-right py-3 px-4">Requests</th>
                  <th className="text-right py-3 px-4">Success</th>
                  <th className="text-right py-3 px-4">Errors</th>
                  <th className="text-right py-3 px-4">Avg Time</th>
                </tr>
              </thead>
              <tbody>
                {trend.map((t, i) => (
                  <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-2 px-4 text-slate-400">{t.date}</td>
                    <td className="py-2 px-4">{apiName(t.source)}</td>
                    <td className="py-2 px-4 text-right text-slate-300">{t.total_requests}</td>
                    <td className="py-2 px-4 text-right text-emerald-400">{t.success_count}</td>
                    <td className="py-2 px-4 text-right text-red-400">{t.error_count}</td>
                    <td className="py-2 px-4 text-right text-slate-300">{Math.round(t.avg_duration_ms)}ms</td>
                  </tr>
                ))}
                {trend.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No trend data yet. Browse some molecules over a few days to see patterns.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailSource && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={closeDetail} />
          <div className="relative w-full max-w-2xl bg-slate-900 border-l border-slate-700 overflow-y-auto">
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 px-4 py-2 z-10">
              <div className="flex items-center gap-4">
                <div className="shrink-0">
                  <h2 className="text-base font-bold text-white leading-tight">{apiName(detailSource)}</h2>
                  <p className="text-[9px] text-slate-500 font-mono">{detailSource}</p>
                </div>
                {!detailLoading && detail && (
                  <div className="flex items-center gap-3 ml-auto">
                    {[
                      { label: 'Min', value: detail.min_ms, hl: false },
                      { label: 'P50', value: detail.p50_ms, hl: false },
                      { label: 'Avg', value: detail.avg_duration_ms, hl: false },
                      { label: 'P95', value: detail.p95_ms, hl: true },
                      { label: 'P99', value: detail.p99_ms, hl: true },
                    ].map(t => (
                      <div key={t.label} className="text-center">
                        <div className="text-[9px] text-slate-500">{t.label}</div>
                        <div className={`text-xs font-semibold ${t.hl ? 'text-orange-400' : 'text-slate-300'}`}>{fmtMs(t.value)}</div>
                      </div>
                    ))}
                    <div className="text-center pl-2 border-l border-slate-700/40">
                      <div className="text-[9px] text-slate-500">Rate</div>
                      <div className={`text-xs font-bold ${detail.success_rate >= 95 ? 'text-emerald-400' : detail.success_rate >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>{detail.success_rate}%</div>
                    </div>
                  </div>
                )}
                <button onClick={closeDetail} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {detailLoading ? (
              <div className="p-8 text-center text-slate-500 animate-pulse">Loading...</div>
            ) : detail ? (
              <div className="px-4 py-3 space-y-3">

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-white font-semibold">{detail.total_requests}<span className="text-slate-500 font-normal ml-0.5">reqs</span></span>
                  <span className={`${detail.success_rate >= 95 ? 'text-emerald-400' : detail.success_rate >= 70 ? 'text-yellow-400' : 'text-red-400'} font-bold`}>{detail.success_rate}%</span>
                  <span className="text-emerald-400">{detail.success_count}<span className="text-slate-500 ml-0.5">ok</span></span>
                  <span className="text-red-400">{detail.error_count}<span className="text-slate-500 ml-0.5">err</span></span>
                  <span className="text-yellow-400/70">{detail.empty_count}<span className="text-slate-500 ml-0.5">empty</span></span>
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    {detail.consecutive_successes > 0 && <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-px rounded text-[10px] font-medium">{detail.consecutive_successes}ok</span>}
                    {detail.consecutive_errors > 0 && <span className="bg-red-500/20 text-red-400 px-1.5 py-px rounded text-[10px] font-medium">{detail.consecutive_errors}err</span>}
                  </span>
                </div>

                {detail.max_ms > detail.p95_ms * 2 && (
                  <div className="text-[10px] text-orange-400/60 px-1">Max: {fmtMs(detail.max_ms)} — significant tail latency</div>
                )}

                {detail.status_codes.length > 0 && (
                  <div className="bg-slate-800/40 rounded px-3 py-2 space-y-1">
                    <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-1">Status codes</div>
                    {detail.status_codes.map(sc => (
                      <div key={sc.status} className="flex items-center gap-2 text-xs">
                        <span className={`font-mono w-8 ${sc.status >= 200 && sc.status < 300 ? 'text-emerald-400' : sc.status >= 400 ? 'text-red-400' : 'text-yellow-400'}`}>{sc.status}</span>
                        <div className="flex-1"><MiniBar pct={(sc.count / detail.total_requests) * 100} color={sc.status >= 200 && sc.status < 300 ? 'bg-emerald-500' : sc.status >= 400 ? 'bg-red-500' : 'bg-yellow-500'} /></div>
                        <span className="text-slate-500 w-14 text-right">{sc.count} <span className="opacity-60">({Math.round((sc.count / detail.total_requests) * 100)}%)</span></span>
                      </div>
                    ))}
                  </div>
                )}

                {detail.top_errors.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Top errors</div>
                    {detail.top_errors.map((e, i) => (
                      <div key={i} className="bg-red-950/20 border border-red-900/30 rounded px-2 py-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-red-300 font-medium">{e.count}x</span>
                          <span className="text-slate-500">{timeAgo(e.last_at)}</span>
                        </div>
                        <code className="text-red-400/70 break-all text-[10px] leading-tight">{e.message}</code>
                      </div>
                    ))}
                  </div>
                )}

                {API_METADATA[detailSource] && <ApiMetaInfo meta={API_METADATA[detailSource]} />}

                <div className="text-[10px] text-slate-600 px-1 flex items-center gap-3">
                  <span>First: {detail.first_seen ? new Date(detail.first_seen).toLocaleString() : '\u2014'}</span>
                  <span>Last: {detail.last_seen ? new Date(detail.last_seen).toLocaleString() : '\u2014'}</span>
                  {detail.category && <span>Cat: {detail.category.icon} {detail.category.label}</span>}
                </div>

                {detail.hourly_distribution.length > 1 && (
                  <div className="pt-1">
                    <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-1">Hourly volume</div>
                    <Sparkline data={detail.hourly_distribution.map(h => h.total)} key_="total" />
                    <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
                      <span>{detail.hourly_distribution[0]?.hour.slice(11)}</span>
                      <span>{detail.hourly_distribution[detail.hourly_distribution.length - 1]?.hour.slice(11)}</span>
                    </div>
                  </div>
                )}

                {detail.daily_trend.length > 1 && (
                  <div className="pt-1">
                    <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-1">Daily trend</div>
                    <div className="grid grid-cols-3 gap-1 mb-1.5">
                      <div><div className="text-[9px] text-slate-500">Vol</div><Sparkline data={detail.daily_trend.map(d => d.total_requests)} key_="total" /></div>
                      <div><div className="text-[9px] text-slate-500">Lat</div><Sparkline data={detail.daily_trend.map(d => d.avg_duration_ms)} key_="avg_ms" /></div>
                      <div><div className="text-[9px] text-slate-500">Err</div><Sparkline data={detail.daily_trend.map(d => d.error_count)} key_="errors" /></div>
                    </div>
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="text-slate-600">
                          <th className="text-left py-0.5 px-1 font-medium">Date</th>
                          <th className="text-right py-0.5 px-1 font-medium">Reqs</th>
                          <th className="text-right py-0.5 px-1 font-medium">OK</th>
                          <th className="text-right py-0.5 px-1 font-medium">Err</th>
                          <th className="text-right py-0.5 px-1 font-medium">ms</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.daily_trend.map((d, i) => (
                          <tr key={i} className="border-t border-slate-800/30">
                            <td className="py-0.5 px-1 text-slate-400">{d.date}</td>
                            <td className="py-0.5 px-1 text-right text-slate-400">{d.total_requests}</td>
                            <td className="py-0.5 px-1 text-right text-emerald-400">{d.success_count}</td>
                            <td className="py-0.5 px-1 text-right text-red-400">{d.error_count}</td>
                            <td className="py-0.5 px-1 text-right text-slate-300">{Math.round(d.avg_duration_ms)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {detail.recent_calls.length > 0 && (
                  <div className="pt-1">
                    <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-1">Recent calls ({detail.recent_calls.length})</div>
                    <div className="space-y-0.5">
                      {detail.recent_calls.map(call => (
                        <div key={call.id} className={`rounded px-2 py-1 text-[10px] ${call.status >= 400 || call.status === 0 ? 'bg-red-950/20 border border-red-900/20' : 'bg-slate-800/30'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`font-mono shrink-0 ${call.status >= 400 ? 'text-red-400' : 'text-emerald-400'}`}>{call.status}</span>
                              <span className="text-slate-300 shrink-0">{fmtMs(call.duration_ms)}</span>
                              {detailSource && (
                                <StyledTooltip content={call.endpoint} className="min-w-0">
                                  <span className="block truncate text-indigo-300/90">
                                    {endpointLabel(detailSource, call.endpoint)}
                                  </span>
                                </StyledTooltip>
                              )}
                              <span className={`px-1 py-px rounded text-[9px] font-medium shrink-0 ${call.has_data ? 'bg-emerald-900/40 text-emerald-400' : 'bg-yellow-900/40 text-yellow-400'}`}>
                                {call.has_data ? 'data' : 'empty'}
                              </span>
                            </div>
                            <span className="text-slate-600 shrink-0 ml-2">{timeAgo(call.timestamp)}</span>
                          </div>
                          {call.error && (
                            <div className="text-red-400/60 break-all leading-tight mt-0.5">{call.error.slice(0, 120)}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="p-12 text-center text-slate-500">No detailed data available for this source.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}