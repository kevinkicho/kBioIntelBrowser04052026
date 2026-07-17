'use client'

import { useCallback, useEffect, useState } from 'react'
import type {
  DiseaseEntity,
  MoleculeCandidate,
  ProjectPreferencesSnapshot,
  ScoreRubric,
} from '@/lib/domain'
import {
  addCandidateAndSave,
  createAndSaveProject,
  listProjects,
  saveProject,
  type StoreResult,
} from '@/lib/project'
import { emitProductEvent } from '@/lib/productEvents'
import {
  loadDiscoveryPreferences,
  scoreRubricFromPreferences,
  snapshotDiscoveryPreferences,
} from '@/lib/discovery/preferences'

export interface SaveProjectContext {
  disease?: DiseaseEntity | null
  targetIds?: string[]
  rubric?: ScoreRubric
  preferencesSnapshot?: ProjectPreferencesSnapshot
  defaultProjectName?: string
}

interface Props {
  candidate: MoleculeCandidate
  /** Optional disease name used when auto-creating a project */
  defaultProjectName?: string
  /** Disease / targets / rubric stamp when creating or first-scoping a project */
  projectContext?: SaveProjectContext
  className?: string
  /** Compact chip style for dense cards */
  compact?: boolean
}

/**
 * Save a domain MoleculeCandidate onto a local project board.
 * Creates a project on the fly when none exist.
 */
export function SaveToProjectButton({
  candidate,
  defaultProjectName,
  projectContext,
  className = '',
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState(() => listProjects())
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) setProjects(listProjects())
  }, [open])

  const flash = useCallback((ok: boolean, text: string) => {
    if (ok) {
      setError(null)
      setMessage(text)
    } else {
      setMessage(null)
      setError(text)
    }
    window.setTimeout(() => {
      setMessage(null)
      setError(null)
    }, 3500)
  }, [])

  const handleResult = useCallback(
    (result: StoreResult<unknown>, successLabel: string) => {
      if (result.ok) {
        flash(true, successLabel)
        setOpen(false)
        setProjects(listProjects())
      } else {
        flash(false, result.message)
      }
    },
    [flash],
  )

  const stampContext = useCallback((): {
    disease?: DiseaseEntity | null
    targetIds?: string[]
    rubric?: ScoreRubric
    preferencesSnapshot?: ProjectPreferencesSnapshot
  } => {
    try {
      const prefs = loadDiscoveryPreferences()
      return {
        disease: projectContext?.disease ?? null,
        targetIds: projectContext?.targetIds?.slice(0, 10) ?? [],
        rubric: projectContext?.rubric ?? scoreRubricFromPreferences(prefs),
        preferencesSnapshot:
          projectContext?.preferencesSnapshot ?? snapshotDiscoveryPreferences(prefs),
      }
    } catch {
      return {
        disease: projectContext?.disease ?? null,
        targetIds: projectContext?.targetIds?.slice(0, 10) ?? [],
        rubric: projectContext?.rubric,
        preferencesSnapshot: projectContext?.preferencesSnapshot,
      }
    }
  }, [projectContext])

  const saveTo = useCallback(
    (projectId: string) => {
      const result = addCandidateAndSave(projectId, candidate)
      if (result.ok) {
        emitProductEvent('board_candidate_added', {
          projectId,
          candidateId: candidate.candidateId,
        })
        // Stamp empty disease/targets/rubric only (do not overwrite different disease)
        const stamp = stampContext()
        let proj = result.value
        let note = ''
        if (stamp.disease && !proj.disease) {
          proj = { ...proj, disease: stamp.disease }
        } else if (
          stamp.disease &&
          proj.disease &&
          stamp.disease.id &&
          proj.disease.id &&
          stamp.disease.id !== proj.disease.id
        ) {
          note = ` (project already scoped to ${proj.disease.name})`
        }
        if ((!proj.targetIds || proj.targetIds.length === 0) && (stamp.targetIds?.length ?? 0) > 0) {
          proj = { ...proj, targetIds: stamp.targetIds! }
        }
        if (!proj.rubric && stamp.rubric) {
          proj = { ...proj, rubric: stamp.rubric }
        }
        if (!proj.preferencesSnapshot && stamp.preferencesSnapshot) {
          proj = { ...proj, preferencesSnapshot: stamp.preferencesSnapshot }
        }
        if (proj !== result.value) {
          const saved = saveProject(proj)
          if (saved.ok) {
            handleResult(saved, `Saved to project board${note}`)
            return
          }
        }
      }
      handleResult(result, 'Saved to project board')
    },
    [candidate, handleResult, stampContext],
  )

  const createAndSave = useCallback(() => {
    const stamp = stampContext()
    const name =
      projectContext?.defaultProjectName?.trim() ||
      defaultProjectName?.trim() ||
      stamp.disease?.name?.trim() ||
      `Board · ${candidate.identity.name}`.slice(0, 80)
    const created = createAndSaveProject({
      name: name.slice(0, 200),
      candidates: [{ ...candidate, boardStatus: candidate.boardStatus ?? 'untriaged' }],
      disease: stamp.disease ?? null,
      targetIds: stamp.targetIds ?? [],
      rubric: stamp.rubric,
      preferencesSnapshot: stamp.preferencesSnapshot,
    })
    if (created.ok) {
      emitProductEvent('project_create', { projectId: created.value.id })
      emitProductEvent('board_candidate_added', {
        projectId: created.value.id,
        candidateId: candidate.candidateId,
      })
    }
    handleResult(created, 'Created project and saved candidate')
  }, [candidate, defaultProjectName, handleResult, projectContext, stampContext])

  const baseBtn = compact
    ? 'text-[10px] px-2 py-0.5 rounded border border-emerald-800/50 bg-emerald-900/20 text-emerald-300 hover:bg-emerald-900/40 transition-colors'
    : 'inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-emerald-800/50 bg-emerald-900/20 text-emerald-300 hover:bg-emerald-900/40 transition-colors'

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        className={baseBtn}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        Save to project
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setOpen(false)
            }}
          />
          <div
            role="listbox"
            className="absolute right-0 z-50 mt-1 w-64 rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-xl"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            <p className="mb-2 px-1 text-[10px] uppercase tracking-wide text-slate-500">
              Choose project
            </p>
            {projects.length === 0 ? (
              <p className="mb-2 px-1 text-xs text-slate-400">No projects yet.</p>
            ) : (
              <ul className="mb-2 max-h-40 space-y-0.5 overflow-y-auto">
                {projects.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      role="option"
                      className="w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
                      onClick={() => saveTo(p.id)}
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="ml-1 text-slate-500">
                        ({p.candidates.length}/50)
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="w-full rounded-md border border-slate-700 bg-slate-800/60 px-2 py-1.5 text-xs text-emerald-300 hover:bg-slate-800"
              onClick={createAndSave}
            >
              + New project &amp; save
            </button>
          </div>
        </>
      )}

      {message && (
        <span className="absolute left-0 top-full z-50 mt-1 whitespace-nowrap rounded bg-emerald-900/90 px-2 py-0.5 text-[10px] text-emerald-200">
          {message}
        </span>
      )}
      {error && (
        <span className="absolute left-0 top-full z-50 mt-1 max-w-xs rounded bg-red-900/90 px-2 py-0.5 text-[10px] text-red-200">
          {error}
        </span>
      )}
    </div>
  )
}
