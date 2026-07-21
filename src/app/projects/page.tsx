'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import type { Project } from '@/lib/domain'
import { downloadFile } from '@/lib/exportData'
import {
  createAndSaveProject,
  deleteProject,
  exportProjectsToJson,
  importProjectsFromJson,
  listProjects,
  projectExportFilename,
  renameProjectAndSave,
} from '@/lib/project'
import { emitProductEvent } from '@/lib/productEvents'
import { recordSearch } from '@/lib/searchHistory'
import { useFirebaseAuth } from '@/lib/firebase/FirebaseProvider'
import { deleteCloudProjectSafe } from '@/lib/firebase/projectSync'
import {
  backupProjectsJsonToCloud,
  downloadCloudExportText,
  listCloudExports,
  type CloudExportItem,
} from '@/lib/firebase/storageSync'
import { MissionControlStrip } from '@/components/projects/MissionControlStrip'

const LAST_OPENED_KEY = 'biointel-projects-last-opened-v1'

type ProjectSort = 'opened' | 'updated' | 'name' | 'candidates' | 'promote'
type ProjectFilter = 'all' | 'has_promote' | 'empty' | 'has_disease' | 'has_targets'

const SORT_OPTIONS: { id: ProjectSort; label: string }[] = [
  { id: 'opened', label: 'Opened' },
  { id: 'updated', label: 'Updated' },
  { id: 'name', label: 'Name' },
  { id: 'candidates', label: 'Candidates' },
  { id: 'promote', label: 'Promote' },
]

const FILTER_OPTIONS: { id: ProjectFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'has_promote', label: 'Has promote' },
  { id: 'empty', label: 'Empty board' },
  { id: 'has_disease', label: 'Has disease' },
  { id: 'has_targets', label: 'Has targets' },
]

function loadLastOpened(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LAST_OPENED_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

function promoteCount(p: Project): number {
  return p.candidates.filter((c) => c.boardStatus === 'promote').length
}

function watchingCount(p: Project): number {
  return p.candidates.filter((c) => c.boardStatus === 'watching').length
}

function holdCount(p: Project): number {
  return p.candidates.filter((c) => c.boardStatus === 'hold').length
}

function killCount(p: Project): number {
  return p.candidates.filter((c) => c.boardStatus === 'kill').length
}

function diseaseLabel(p: Project): string {
  return (
    p.disease?.name ||
    (p.preferencesSnapshot as { diseaseName?: string } | undefined)?.diseaseName ||
    ''
  )
}

export default function ProjectsPage() {
  const auth = useFirebaseAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [name, setName] = useState('')
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [lastOpened, setLastOpened] = useState<Record<string, string>>({})
  const [cloudBusy, setCloudBusy] = useState(false)
  const [cloudExports, setCloudExports] = useState<CloudExportItem[]>([])
  const [showArchives, setShowArchives] = useState(false)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<ProjectSort>('opened')
  const [filter, setFilter] = useState<ProjectFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(() => {
    const list = listProjects()
    const opened = loadLastOpened()
    setLastOpened(opened)
    setProjects(list)
  }, [])

  const refreshCloudExports = useCallback(async () => {
    if (!auth.user?.uid) {
      setCloudExports([])
      return
    }
    const items = await listCloudExports(auth.user.uid)
    setCloudExports(items)
  }, [auth.user?.uid])

  useEffect(() => {
    refresh()
  }, [refresh])

  // After cloud sync, re-read local projects (pull may have added boards)
  useEffect(() => {
    if (auth.lastMigration?.finishedAt) refresh()
  }, [auth.lastMigration?.finishedAt, refresh])

  useEffect(() => {
    if (showArchives && auth.user?.uid) void refreshCloudExports()
  }, [showArchives, auth.user?.uid, refreshCloudExports])

  /** Per-project metrics + search haystack — rebuilt only when project set changes */
  const projectIndex = useMemo(() => {
    return projects.map((p) => {
      const promote = promoteCount(p)
      const disease = diseaseLabel(p)
      const haystack = [
        p.name,
        p.description ?? '',
        disease,
        p.id,
        ...(p.targetIds ?? []),
        // Cap candidate names scanned for search (boards max 50; slice keeps keystrokes cheap)
        ...p.candidates.slice(0, 50).map((c) => c.identity?.name ?? ''),
      ]
        .join(' ')
        .toLowerCase()
      return {
        project: p,
        promote,
        disease,
        empty: p.candidates.length === 0,
        hasTargets: (p.targetIds?.length ?? 0) > 0,
        haystack,
      }
    })
  }, [projects])

  const filterCounts = useMemo(() => {
    const m: Record<ProjectFilter, number> = {
      all: projectIndex.length,
      has_promote: 0,
      empty: 0,
      has_disease: 0,
      has_targets: 0,
    }
    for (const r of projectIndex) {
      if (r.promote > 0) m.has_promote += 1
      if (r.empty) m.empty += 1
      if (r.disease) m.has_disease += 1
      if (r.hasTargets) m.has_targets += 1
    }
    return m
  }, [projectIndex])

  const filteredSorted = useMemo(() => {
    const needle = query.trim().toLowerCase()
    let list = projectIndex

    if (filter === 'has_promote') list = list.filter((r) => r.promote > 0)
    else if (filter === 'empty') list = list.filter((r) => r.empty)
    else if (filter === 'has_disease') list = list.filter((r) => Boolean(r.disease))
    else if (filter === 'has_targets') list = list.filter((r) => r.hasTargets)

    if (needle) {
      list = list.filter((r) => r.haystack.includes(needle))
    }

    const sorted = [...list]
    sorted.sort((a, b) => {
      if (sort === 'name') return a.project.name.localeCompare(b.project.name)
      if (sort === 'candidates') {
        const d = b.project.candidates.length - a.project.candidates.length
        return d !== 0 ? d : a.project.name.localeCompare(b.project.name)
      }
      if (sort === 'promote') {
        const d = b.promote - a.promote
        return d !== 0 ? d : a.project.name.localeCompare(b.project.name)
      }
      if (sort === 'updated') return b.project.updatedAt.localeCompare(a.project.updatedAt)
      const ao = lastOpened[a.project.id] ?? ''
      const bo = lastOpened[b.project.id] ?? ''
      if (ao || bo) return (bo || '').localeCompare(ao || '')
      return b.project.updatedAt.localeCompare(a.project.updatedAt)
    })
    return sorted.map((r) => r.project)
  }, [projectIndex, query, sort, filter, lastOpened])

  const showBanner = (type: 'ok' | 'err', text: string) => {
    setBanner({ type, text })
    window.setTimeout(() => setBanner(null), 5000)
  }

  const handleCreate = () => {
    const result = createAndSaveProject({ name: name.trim() || 'Untitled project' })
    if (!result.ok) {
      showBanner('err', result.message)
      return
    }
    emitProductEvent('project_create', { projectId: result.value.id })
    setName('')
    refresh()
    showBanner('ok', `Created “${result.value.name}”`)
  }

  const handleDelete = (id: string, projectName: string) => {
    if (!window.confirm(`Delete project “${projectName}”? This cannot be undone.`)) return
    const result = deleteProject(id)
    if (!result.ok) {
      showBanner('err', result.message)
      return
    }
    // Best-effort cloud cascade when signed in
    if (auth.user?.uid) {
      void deleteCloudProjectSafe(auth.user.uid, id)
    }
    if (expandedId === id) setExpandedId(null)
    refresh()
    showBanner('ok', 'Project deleted')
  }

  const handleRename = (id: string, currentName: string) => {
    const next = window.prompt('Rename project', currentName)
    if (next == null) return
    const result = renameProjectAndSave(id, next)
    if (!result.ok) {
      showBanner('err', result.message)
      return
    }
    refresh()
    showBanner('ok', `Renamed to “${result.value.name}”`)
  }

  const handleExportAll = () => {
    if (projects.length === 0) {
      showBanner('err', 'No projects to export.')
      return
    }
    downloadFile(
      exportProjectsToJson(projects),
      projectExportFilename(),
      'application/json',
    )
    showBanner('ok', `Exported ${projects.length} project(s)`)
  }

  const handleCloudSync = async () => {
    if (!auth.user) {
      showBanner('err', 'Sign in to sync with Firestore.')
      return
    }
    setCloudBusy(true)
    try {
      const report = await auth.syncNow()
      refresh()
      if (report) {
        showBanner(report.ok ? 'ok' : 'err', report.message)
      } else {
        showBanner('err', 'Cloud sync failed.')
      }
    } finally {
      setCloudBusy(false)
    }
  }

  const handleCloudBackup = async () => {
    if (!auth.user?.uid) {
      showBanner('err', 'Sign in to back up to Firebase Storage.')
      return
    }
    if (projects.length === 0) {
      showBanner('err', 'No projects to back up.')
      return
    }
    setCloudBusy(true)
    try {
      const result = await backupProjectsJsonToCloud(
        auth.user.uid,
        exportProjectsToJson(projects),
      )
      if (result.ok) {
        showBanner('ok', `Cloud backup saved: ${result.fileName}`)
        if (showArchives) void refreshCloudExports()
      } else {
        showBanner('err', result.message)
      }
    } finally {
      setCloudBusy(false)
    }
  }

  const handleRestoreCloudExport = async (fileName: string) => {
    if (!auth.user?.uid) return
    if (
      !window.confirm(
        `Restore “${fileName}” into local projects? Existing boards with the same id may be renamed.`,
      )
    ) {
      return
    }
    setCloudBusy(true)
    try {
      const dl = await downloadCloudExportText(auth.user.uid, fileName)
      if (!dl.ok) {
        showBanner('err', dl.message)
        return
      }
      const result = importProjectsFromJson(dl.text)
      if (!result.ok) {
        showBanner('err', result.message)
        return
      }
      refresh()
      showBanner('ok', `Restored ${result.imported.length} project(s) from cloud archive`)
    } finally {
      setCloudBusy(false)
    }
  }

  const handleImportFile = async (file: File | null) => {
    if (!file) return
    try {
      const text = await file.text()
      const result = importProjectsFromJson(text)
      if (!result.ok) {
        showBanner('err', result.message)
        return
      }
      refresh()
      const skipNote = result.skipped > 0 ? ` (${result.skipped} skipped)` : ''
      showBanner('ok', `Imported ${result.imported.length} project(s)${skipNote}`)
    } catch {
      showBanner('err', 'Failed to read import file.')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const markOpened = (p: Project) => {
    try {
      const map = loadLastOpened()
      map[p.id] = new Date().toISOString()
      localStorage.setItem(LAST_OPENED_KEY, JSON.stringify(map))
      setLastOpened(map)
    } catch {
      /* ignore */
    }
    recordSearch({
      kind: 'project',
      query: p.name,
      title: p.name,
      href: `/projects/${p.id}`,
      meta: { projectId: p.id },
    })
  }

  return (
    <main className="min-h-screen bg-[#0f1117] text-slate-200">
      <div className="page-canvas">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-100">Projects</h1>
            <p className="mt-0.5 text-[13px] text-slate-400">
              Local candidate boards for disease triage. Browser storage is the default; optional
              cloud sync when signed in.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {auth.user && (
              <>
                <button
                  type="button"
                  disabled={cloudBusy || auth.migrating}
                  onClick={() => void handleCloudSync()}
                  className="rounded-lg border border-sky-800/50 bg-sky-950/40 px-3 py-1.5 text-xs text-sky-300 hover:border-sky-700 hover:text-sky-100 disabled:opacity-50"
                  data-testid="projects-cloud-sync"
                >
                  {cloudBusy || auth.migrating ? 'Syncing…' : 'Sync cloud'}
                </button>
                <button
                  type="button"
                  disabled={cloudBusy}
                  onClick={() => void handleCloudBackup()}
                  className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600 hover:text-slate-100 disabled:opacity-50"
                  data-testid="projects-cloud-backup"
                >
                  Cloud backup
                </button>
                <button
                  type="button"
                  disabled={cloudBusy}
                  onClick={() => setShowArchives((v) => !v)}
                  className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600 hover:text-slate-100 disabled:opacity-50"
                  data-testid="projects-cloud-archives"
                >
                  {showArchives ? 'Hide archives' : 'Cloud archives'}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleExportAll}
              className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600 hover:text-slate-100"
            >
              Export all
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600 hover:text-slate-100"
            >
              Import JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => handleImportFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        {banner && (
          <div
            className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
              banner.type === 'ok'
                ? 'border-emerald-800/50 bg-emerald-900/20 text-emerald-200'
                : 'border-red-800/50 bg-red-900/20 text-red-200'
            }`}
            role="status"
          >
            {banner.text}
          </div>
        )}

        <MissionControlStrip projects={projects} lastOpened={lastOpened} />

        <div className="mb-4 flex flex-wrap gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
            }}
            placeholder="New project name"
            className="min-w-[200px] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-700 focus:outline-none"
            maxLength={200}
            data-testid="projects-create-input"
          />
          <button
            type="button"
            onClick={handleCreate}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
            data-testid="projects-create-btn"
          >
            Create project
          </button>
        </div>

        {auth.user && showArchives && (
          <div
            className="mb-4 rounded-xl border border-sky-900/40 bg-sky-950/20 p-3"
            data-testid="projects-cloud-archive-list"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-sky-200">Storage archives</h2>
              <button
                type="button"
                disabled={cloudBusy}
                onClick={() => void refreshCloudExports()}
                className="text-[11px] text-sky-400 hover:text-sky-200 disabled:opacity-50"
              >
                Refresh
              </button>
            </div>
            <p className="mb-2 text-[11px] text-slate-500">
              JSON exports under <code className="text-slate-400">users/…/exports</code>. Restore
              merges into local boards.
            </p>
            {cloudExports.length === 0 ? (
              <p className="text-xs text-slate-500 opacity-30">No cloud archives yet.</p>
            ) : (
              <ul className="divide-y divide-slate-800/80 overflow-hidden rounded-lg border border-slate-800">
                {cloudExports.map((item) => (
                  <li
                    key={item.fullPath}
                    className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/40 px-2.5 py-1.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[11px] text-slate-200">{item.name}</p>
                      <p className="text-[10px] text-slate-600">
                        {item.updated
                          ? new Date(item.updated).toLocaleString()
                          : 'unknown date'}
                        {item.size != null ? ` · ${Math.round(item.size / 1024)} KB` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={cloudBusy}
                      onClick={() => void handleRestoreCloudExport(item.name)}
                      className="rounded border border-sky-800/50 px-2 py-0.5 text-[10px] text-sky-300 hover:bg-sky-900/40 disabled:opacity-50"
                    >
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* List controls: search · filter · sort */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, disease, targets, candidates…"
            className="w-full min-w-[14rem] rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[12px] text-slate-200 placeholder:text-slate-600 sm:w-64"
            data-testid="projects-search"
            aria-label="Search projects"
          />
          <span className="ml-auto tabular-nums text-[10px] text-slate-500">
            {filteredSorted.length} of {projects.length}
          </span>
        </div>

        <div className="mb-1.5 flex flex-wrap items-center gap-1">
          {FILTER_OPTIONS.map((f) => {
            const n = filterCounts[f.id]
            const dim = f.id !== 'all' && n === 0
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded-full border px-2.5 py-0.5 text-[10px] ${
                  filter === f.id
                    ? 'border-indigo-600 bg-indigo-900/40 text-indigo-200'
                    : 'border-slate-800 text-slate-500 hover:border-slate-600'
                } ${dim && filter !== f.id ? 'opacity-30' : ''}`}
                data-testid={`projects-filter-${f.id}`}
              >
                {f.label}
                {f.id !== 'all' ? ` · ${n}` : ''}
              </button>
            )
          })}
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-[10px] font-semibold uppercase text-slate-600">Sort</span>
          {SORT_OPTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSort(s.id)}
              className={`rounded-full border px-2 py-0.5 text-[10px] ${
                sort === s.id
                  ? 'border-slate-500 bg-slate-800 text-slate-200'
                  : 'border-slate-800 text-slate-500 hover:border-slate-600'
              }`}
              data-testid={`projects-sort-${s.id}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 px-6 py-12 text-center opacity-30">
            <h2 className="text-sm font-semibold text-slate-300 mb-1">No projects yet</h2>
            <p className="text-xs text-slate-500">
              Create a board above, or save candidates from{' '}
              <Link href="/discover" className="text-emerald-400 hover:text-emerald-300">
                Discover
              </Link>
              .
            </p>
          </div>
        ) : filteredSorted.length === 0 ? (
          <p
            className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-4 text-center text-[12px] text-slate-500 opacity-30"
            data-testid="projects-empty-filter"
          >
            No projects match this search / filter.
          </p>
        ) : (
          <ul
            className="divide-y divide-slate-800/80 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40"
            data-testid="projects-list"
          >
            {filteredSorted.map((p) => {
              const open = expandedId === p.id
              const promote = promoteCount(p)
              const watching = watchingCount(p)
              const hold = holdCount(p)
              const kill = killCount(p)
              const disease = diseaseLabel(p)
              const emptyBoard = p.candidates.length === 0
              return (
                <li
                  key={p.id}
                  className={`bg-slate-900/30 ${emptyBoard ? 'opacity-80' : ''}`}
                  data-testid={`project-row-${p.id}`}
                >
                  <div className="flex w-full items-stretch gap-0">
                    <button
                      type="button"
                      onClick={() => setExpandedId(open ? null : p.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-1.5 text-left hover:bg-slate-800/40 sm:px-3 sm:py-2"
                      aria-expanded={open}
                    >
                      <span
                        className={`shrink-0 text-[10px] text-slate-600 transition-transform ${
                          open ? 'rotate-90' : ''
                        }`}
                        aria-hidden
                      >
                        ▸
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="text-[13px] font-medium text-slate-100">{p.name}</span>
                          {emptyBoard && (
                            <span className="text-[9px] text-slate-600 opacity-30">empty</span>
                          )}
                          {promote > 0 && (
                            <span className="rounded border border-emerald-800/40 px-1 py-px text-[9px] text-emerald-300/90">
                              {promote} promote
                            </span>
                          )}
                          {watching > 0 && (
                            <span className="rounded border border-sky-800/40 px-1 py-px text-[9px] text-sky-300/80">
                              {watching} watching
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0 text-[10px] text-slate-500">
                          <span className="tabular-nums">
                            {p.candidates.length}/50 candidates
                          </span>
                          {disease ? (
                            <span className="truncate max-w-[14rem]">{disease}</span>
                          ) : (
                            <span className="opacity-30">no disease</span>
                          )}
                          {(p.targetIds?.length ?? 0) > 0 && (
                            <span className="font-mono text-slate-600">
                              {p.targetIds!.slice(0, 2).join(', ')}
                              {p.targetIds!.length > 2 ? '…' : ''}
                            </span>
                          )}
                          <span className="text-slate-600">
                            upd {new Date(p.updatedAt).toLocaleDateString()}
                          </span>
                          {lastOpened[p.id] && (
                            <span className="text-slate-600">
                              open {new Date(lastOpened[p.id]).toLocaleDateString()}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-1 px-2">
                      <Link
                        href={`/projects/${p.id}`}
                        onClick={() => markOpened(p)}
                        className="rounded border border-emerald-800/40 px-2 py-0.5 text-[10px] text-emerald-300 hover:bg-emerald-950/40"
                        data-testid={`project-open-${p.id}`}
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                  {open && (
                    <div className="space-y-2 border-t border-slate-800/80 bg-slate-950/50 px-3 py-2.5 sm:px-4">
                      <dl className="grid gap-1 text-[11px] sm:grid-cols-2">
                        <div className="flex gap-2 min-w-0">
                          <dt className="shrink-0 text-slate-600">id</dt>
                          <dd className="font-mono text-slate-400 truncate">{p.id}</dd>
                        </div>
                        <div className="flex gap-2 min-w-0">
                          <dt className="shrink-0 text-slate-600">disease</dt>
                          <dd className={disease ? 'text-slate-300' : 'text-slate-600 opacity-30'}>
                            {disease || '—'}
                          </dd>
                        </div>
                        <div className="flex gap-2 min-w-0">
                          <dt className="shrink-0 text-slate-600">targets</dt>
                          <dd className="font-mono text-slate-400 break-all">
                            {(p.targetIds?.length ?? 0) > 0 ? p.targetIds!.join(', ') : '—'}
                          </dd>
                        </div>
                        <div className="flex gap-2 min-w-0">
                          <dt className="shrink-0 text-slate-600">triage</dt>
                          <dd className="text-slate-400">
                            <span className={promote ? '' : 'opacity-30'}>{promote} promote</span>
                            {' · '}
                            <span className={watching ? '' : 'opacity-30'}>
                              {watching} watching
                            </span>
                            {' · '}
                            <span className={hold ? '' : 'opacity-30'}>{hold} hold</span>
                            {' · '}
                            <span className={kill ? '' : 'opacity-30'}>{kill} kill</span>
                          </dd>
                        </div>
                        <div className="flex gap-2 min-w-0">
                          <dt className="shrink-0 text-slate-600">packs</dt>
                          <dd className={p.packIndex?.length ? 'text-slate-400' : 'opacity-30'}>
                            {p.packIndex?.length ?? 0}
                          </dd>
                        </div>
                        <div className="flex gap-2 min-w-0">
                          <dt className="shrink-0 text-slate-600">RH</dt>
                          <dd
                            className={
                              p.researchHypothesisIds?.length ? 'text-slate-400' : 'opacity-30'
                            }
                          >
                            {p.researchHypothesisIds?.length ?? 0}
                          </dd>
                        </div>
                        <div className="flex gap-2 min-w-0 sm:col-span-2">
                          <dt className="shrink-0 text-slate-600">updated</dt>
                          <dd className="text-slate-400">
                            {new Date(p.updatedAt).toLocaleString()}
                            {lastOpened[p.id]
                              ? ` · opened ${new Date(lastOpened[p.id]).toLocaleString()}`
                              : ''}
                          </dd>
                        </div>
                        {p.description?.trim() && (
                          <div className="flex gap-2 min-w-0 sm:col-span-2">
                            <dt className="shrink-0 text-slate-600">notes</dt>
                            <dd className="text-slate-400">{p.description.trim()}</dd>
                          </div>
                        )}
                      </dl>
                      <div className="flex flex-wrap gap-1.5">
                        <Link
                          href={`/projects/${p.id}`}
                          onClick={() => markOpened(p)}
                          className="rounded border border-emerald-800/50 bg-emerald-950/30 px-2.5 py-1 text-[11px] text-emerald-300 hover:bg-emerald-900/40"
                        >
                          Open board
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleRename(p.id, p.name)}
                          className="rounded border border-slate-700 px-2.5 py-1 text-[11px] text-slate-400 hover:border-slate-500 hover:text-slate-200"
                          data-testid={`project-rename-${p.id}`}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id, p.name)}
                          className="rounded border border-slate-700 px-2.5 py-1 text-[11px] text-slate-500 hover:border-red-800 hover:text-red-300"
                          data-testid={`project-delete-${p.id}`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </main>
  )
}
