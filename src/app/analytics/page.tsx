'use client'

import { useState, useEffect } from 'react'

interface SourceSummary {
  source: string
  total_requests: number
  success_count: number
  error_count: number
  empty_count: number
  avg_duration_ms: number
  last_success_at: string | null
  last_error: string | null
  last_error_at: string | null
  success_rate: number
}

interface DailySnapshot {
  date: string
  source: string
  total_requests: number
  success_count: number
  error_count: number
  avg_duration_ms: number
}

interface ApiMetricRow {
  id: number
  source: string
  endpoint: string
  status: number
  duration_ms: number
  error: string | null
  has_data: number
  items_count: number | null
  timestamp: string
}

type ViewMode = 'summary' | 'trend' | 'errors'

export default function AnalyticsPage() {
  const [view, setView] = useState<ViewMode>('summary')
  const [since, setSince] = useState('7d')
  const [summary, setSummary] = useState<SourceSummary[]>([])
  const [trend, setTrend] = useState<DailySnapshot[]>([])
  const [errors, setErrors] = useState<ApiMetricRow[]>([])
  const [loading, setLoading] = useState(true)

  const sinceParam = since === '7d'
    ? new Date(Date.now() - 7 * 86400000).toISOString()
    : since === '30d'
      ? new Date(Date.now() - 30 * 86400000).toISOString()
      : since === '90d'
        ? new Date(Date.now() - 90 * 86400000).toISOString()
        : undefined

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ view, since: sinceParam || '' })
    fetch(`/api/analytics/summary?${params}`)
      .then(r => r.json())
      .then(data => {
        if (view === 'summary') setSummary(data)
        else if (view === 'trend') setTrend(data)
        else if (view === 'errors') setErrors(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, since])

  const categoryIcons: Record<string, string> = {
    'category:pharmaceutical': '\uD83D\uFE0F',
    'category:clinical-safety': '\uD83C\uDFE5',
    'category:molecular-chemical': '\uD83E\uDDEA',
    'category:bioactivity-targets': '\uD83C\uDFAF',
    'category:protein-structure': '\uD83E\uDDEC',
    'category:genomics-disease': '\uD83E\uDDEC',
    'category:interactions-pathways': '\uD83D\uDCC3',
    'category:research-literature': '\uD83D\uDCDA',
    'category:nih-high-impact': '\uD83C\uDFEB',
    search: '\uD83D\uDD0D',
    similar: '\uD83D\uDCA1',
  }

  function label(src: string) {
    return src.replace(/^category:/, '').replace(/^panel:/, '\u25B8 ')
  }

  function healthDot(s: SourceSummary) {
    if (s.success_rate >= 95) return '\uD83D\uDFE2'
    if (s.success_rate >= 70) return '\uD83D\uDFE1'
    return '\uD83D\uDD34'
  }

  function timeAgo(iso: string | null) {
    if (!iso) return '\u2014'
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">API Analytics</h1>
            <p className="text-slate-400 mt-1">Monitor API health, response times, and data availability</p>
          </div>
          <div className="flex items-center gap-3">
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
            <a href="/" className="text-indigo-400 hover:text-indigo-300 text-sm">Back to app</a>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {(['summary', 'trend', 'errors'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === v
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500 animate-pulse">Loading analytics...</div>
        ) : view === 'summary' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="text-left py-3 px-4">Source</th>
                  <th className="text-center py-3 px-4">Health</th>
                  <th className="text-right py-3 px-4">Requests</th>
                  <th className="text-right py-3 px-4">Success</th>
                  <th className="text-right py-3 px-4">Errors</th>
                  <th className="text-right py-3 px-4">Empty</th>
                  <th className="text-right py-3 px-4">Avg Time</th>
                  <th className="text-right py-3 px-4">Last Success</th>
                  <th className="text-right py-3 px-4">Last Error</th>
                </tr>
              </thead>
              <tbody>
                {summary.map(s => (
                  <tr key={s.source} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-medium">
                      {categoryIcons[s.source] || ''} {label(s.source)}
                    </td>
                    <td className="py-3 px-4 text-center">{healthDot(s)} {s.success_rate}%</td>
                    <td className="py-3 px-4 text-right text-slate-300">{s.total_requests}</td>
                    <td className="py-3 px-4 text-right text-emerald-400">{s.success_count}</td>
                    <td className="py-3 px-4 text-right text-red-400">{s.error_count}</td>
                    <td className="py-3 px-4 text-right text-yellow-400">{s.empty_count}</td>
                    <td className="py-3 px-4 text-right text-slate-300">{s.avg_duration_ms}ms</td>
                    <td className="py-3 px-4 text-right text-slate-400">{timeAgo(s.last_success_at)}</td>
                    <td className="py-3 px-4 text-right text-slate-400 text-xs">
                      {s.last_error ? `${timeAgo(s.last_error_at)}: ${s.last_error.slice(0, 50)}` : '\u2014'}
                    </td>
                  </tr>
                ))}
                {summary.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      No API calls recorded yet. Browse some molecules to start collecting data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
                  <tr key={e.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-2 px-4 text-slate-400">{new Date(e.timestamp).toLocaleString()}</td>
                    <td className="py-2 px-4">{label(e.source)}</td>
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
                    <td className="py-2 px-4">{label(t.source)}</td>
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
    </div>
  )
}