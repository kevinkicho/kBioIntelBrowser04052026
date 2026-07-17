'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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

const LAST_OPENED_KEY = 'biointel-projects-last-opened-v1'

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

export default function ProjectsPage() {
  const auth = useFirebaseAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [name, setName] = useState('')
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [lastOpened, setLastOpened] = useState<Record<string, string>>({})
  const [cloudBusy, setCloudBusy] = useState(false)
  const [cloudExports, setCloudExports] = useState<CloudExportItem[]>([])
  const [showArchives, setShowArchives] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(() => {
    const list = listProjects()
    const opened = loadLastOpened()
    setLastOpened(opened)
    // Sort: recently opened first, then updatedAt
    setProjects(
      [...list].sort((a, b) => {
        const ao = opened[a.id] ?? ''
        const bo = opened[b.id] ?? ''
        if (ao || bo) return (bo || '').localeCompare(ao || '')
        return b.updatedAt.localeCompare(a.updatedAt)
      }),
    )
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
    refresh()
    showBanner('ok', 'Project deleted')
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
      // Write-through will push restored boards when signed in
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

  return (
    <main className="min-h-screen bg-[#0f1117] text-slate-200">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Projects</h1>
            <p className="mt-1 text-sm text-slate-400">
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

        <div className="mb-8 flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
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
          />
          <button
            type="button"
            onClick={handleCreate}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            Create project
          </button>
        </div>

        {auth.user && showArchives && (
          <div
            className="mb-8 rounded-xl border border-sky-900/40 bg-sky-950/20 p-4"
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
            <p className="mb-3 text-[11px] text-slate-500">
              JSON exports under <code className="text-slate-400">users/…/exports</code>. Restore
              merges into local boards (does not replace your cloud Firestore sync).
            </p>
            {cloudExports.length === 0 ? (
              <p className="text-xs text-slate-500">No cloud archives yet. Use Cloud backup.</p>
            ) : (
              <ul className="space-y-2">
                {cloudExports.map((item) => (
                  <li
                    key={item.fullPath}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-slate-200">{item.name}</p>
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
                      className="rounded-lg border border-sky-800/50 bg-sky-950/40 px-2.5 py-1 text-[11px] text-sky-300 hover:bg-sky-900/40 disabled:opacity-50"
                    >
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center">
            <p className="text-4xl mb-3">📋</p>
            <h2 className="text-lg font-semibold text-slate-300 mb-2">No projects yet</h2>
            <p className="text-sm text-slate-500 mb-4">
              Create a board, or save candidates from{' '}
              <Link href="/discover" className="text-emerald-400 hover:text-emerald-300">
                Discover
              </Link>
              .
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {projects.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 hover:border-slate-700"
              >
                <div className="min-w-0">
                  <Link
                    href={`/projects/${p.id}`}
                    className="text-base font-semibold text-slate-100 hover:text-emerald-300"
                  >
                    {p.name}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                    <span>
                      {p.candidates.length}/{50} candidates
                    </span>
                    {promoteCount(p) > 0 && (
                      <span className="text-emerald-400/90">
                        {promoteCount(p)} promoted
                      </span>
                    )}
                    {p.disease?.name && <span>Disease: {p.disease.name}</span>}
                    {(p.targetIds?.length ?? 0) > 0 && (
                      <span className="font-mono text-slate-600">
                        {p.targetIds!.slice(0, 3).join(', ')}
                        {p.targetIds!.length > 3 ? '…' : ''}
                      </span>
                    )}
                    <span>Updated {new Date(p.updatedAt).toLocaleString()}</span>
                    {lastOpened[p.id] && (
                      <span className="text-slate-600">
                        Opened {new Date(lastOpened[p.id]).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/projects/${p.id}`}
                    onClick={() => {
                      try {
                        const map = loadLastOpened()
                        map[p.id] = new Date().toISOString()
                        localStorage.setItem(LAST_OPENED_KEY, JSON.stringify(map))
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
                    }}
                    className="rounded-lg border border-emerald-800/40 bg-emerald-900/20 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-900/40"
                  >
                    Open board
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id, p.name)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-500 hover:border-red-800 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
