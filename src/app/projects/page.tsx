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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [name, setName] = useState('')
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(() => {
    setProjects(listProjects())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

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
              Local candidate boards for disease triage. Data stays in your browser — export anytime.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
                    {p.disease?.name && <span>Disease: {p.disease.name}</span>}
                    <span>Updated {new Date(p.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/projects/${p.id}`}
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
