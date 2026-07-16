'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { BoardStatus, Project } from '@/lib/domain'
import { downloadFile } from '@/lib/exportData'
import {
  exportProjectToJson,
  getProject,
  projectExportFilename,
  removeCandidateFromProject,
  saveProject,
  setBoardStatusAndSave,
} from '@/lib/project'
import { BoardTable, BOARD_STATUSES, STATUS_STYLES } from '@/components/projects/BoardTable'

export default function ProjectBoardPage() {
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : ''
  const [project, setProject] = useState<Project | null | undefined>(undefined)
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const refresh = useCallback(() => {
    if (!id) {
      setProject(null)
      return
    }
    setProject(getProject(id))
  }, [id])

  useEffect(() => {
    refresh()
  }, [refresh])

  const showBanner = (type: 'ok' | 'err', text: string) => {
    setBanner({ type, text })
    window.setTimeout(() => setBanner(null), 4000)
  }

  const handleStatus = (candidateId: string, status: BoardStatus) => {
    if (!id) return
    const result = setBoardStatusAndSave(id, candidateId, status)
    if (!result.ok) {
      showBanner('err', result.message)
      return
    }
    setProject(result.value)
  }

  const handleRemove = (candidateId: string) => {
    if (!project) return
    const next = removeCandidateFromProject(project, candidateId)
    if (!next.ok) {
      showBanner('err', next.message)
      return
    }
    const saved = saveProject(next.value)
    if (!saved.ok) {
      showBanner('err', saved.message)
      return
    }
    setProject(saved.value)
  }

  const handleExport = () => {
    if (!project) return
    downloadFile(
      exportProjectToJson(project),
      projectExportFilename(project),
      'application/json',
    )
    showBanner('ok', 'Project exported')
  }

  if (project === undefined) {
    return (
      <main className="min-h-screen bg-[#0f1117] px-4 py-12 text-center text-slate-500">
        Loading…
      </main>
    )
  }

  if (!project) {
    return (
      <main className="min-h-screen bg-[#0f1117] px-4 py-12 text-center">
        <h1 className="text-xl font-semibold text-slate-200 mb-2">Project not found</h1>
        <p className="text-sm text-slate-500 mb-4">
          It may have been deleted or never stored in this browser.
        </p>
        <Link href="/projects" className="text-sm text-emerald-400 hover:text-emerald-300">
          ← Back to projects
        </Link>
      </main>
    )
  }

  const statusCounts = BOARD_STATUSES.reduce(
    (acc, s) => {
      acc[s] = project.candidates.filter((c) => (c.boardStatus ?? 'untriaged') === s).length
      return acc
    },
    {} as Record<BoardStatus, number>,
  )

  return (
    <main className="min-h-screen bg-[#0f1117] text-slate-200">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-2">
          <Link href="/projects" className="text-xs text-slate-500 hover:text-slate-300">
            ← All projects
          </Link>
        </div>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">{project.name}</h1>
            {project.description && (
              <p className="mt-1 text-sm text-slate-400">{project.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
              {project.disease?.name && (
                <span className="rounded-full border border-indigo-800/40 bg-indigo-900/20 px-2 py-0.5 text-indigo-300">
                  {project.disease.name}
                </span>
              )}
              <span>
                {project.candidates.length}/50 candidates
              </span>
              <span>
                Updated {new Date(project.updatedAt).toLocaleString()}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {BOARD_STATUSES.map((s) => (
                <span
                  key={s}
                  className={`rounded border px-1.5 py-0.5 text-[10px] ${STATUS_STYLES[s]}`}
                >
                  {s}: {statusCounts[s]}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600"
            >
              Export JSON
            </button>
            <Link
              href="/discover"
              className="rounded-lg border border-emerald-800/40 bg-emerald-900/20 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-900/40"
            >
              Add from Discover
            </Link>
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

        {project.candidates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-slate-300 mb-2">Board is empty</h2>
            <p className="text-sm text-slate-500 mb-4">
              Save candidates from Discover with “Save to project”.
            </p>
            <Link
              href="/discover"
              className="inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white hover:bg-emerald-600"
            >
              Go to Discover
            </Link>
          </div>
        ) : (
          <BoardTable
            project={project}
            onStatusChange={handleStatus}
            onRemove={handleRemove}
          />
        )}
      </div>
    </main>
  )
}
