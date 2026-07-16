/**
 * JSON export / import for local project boards.
 * Solo + file export default (design §9.4 / KD7).
 */

import type { Project } from '@/lib/domain'
import {
  isProject,
  listProjects,
  saveProject,
  type ProjectStorage,
  type StoreResult,
  MAX_CANDIDATES_PER_PROJECT,
} from './store'

export const PROJECT_EXPORT_SCHEMA_VERSION = 1 as const

export interface ProjectExportBundle {
  schemaVersion: typeof PROJECT_EXPORT_SCHEMA_VERSION
  kind: 'biointel-projects'
  exportedAt: string
  projects: Project[]
}

export type ImportErrorCode = 'invalid_json' | 'invalid_schema' | 'empty' | 'quota_exceeded' | 'cap_exceeded' | 'unavailable'

export type ImportResult =
  | { ok: true; imported: Project[]; skipped: number; errors: string[] }
  | { ok: false; error: ImportErrorCode; message: string }

function nowIso(): string {
  return new Date().toISOString()
}

/** Serialize one or more projects to pretty JSON. */
export function exportProjectsToJson(projects: Project[]): string {
  const bundle: ProjectExportBundle = {
    schemaVersion: PROJECT_EXPORT_SCHEMA_VERSION,
    kind: 'biointel-projects',
    exportedAt: nowIso(),
    projects: projects.map(normalizeForExport),
  }
  return JSON.stringify(bundle, null, 2)
}

/** Single-project convenience export. */
export function exportProjectToJson(project: Project): string {
  return exportProjectsToJson([project])
}

function normalizeForExport(project: Project): Project {
  return {
    ...project,
    schemaVersion: 1,
    candidates: (project.candidates ?? []).slice(0, MAX_CANDIDATES_PER_PROJECT),
    packIndex: project.packIndex ?? [],
    targetIds: project.targetIds ?? [],
  }
}

/**
 * Parse import JSON. Accepts:
 * - ProjectExportBundle `{ kind, projects }`
 * - Single Project object
 * - Array of Project objects
 */
export function parseProjectImport(raw: string): StoreResult<Project[]> {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'invalid', message: 'Invalid JSON — could not parse file.' }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'invalid', message: 'Import root must be an object or array.' }
  }

  // Bundle
  if (!Array.isArray(parsed) && (parsed as ProjectExportBundle).kind === 'biointel-projects') {
    const bundle = parsed as ProjectExportBundle
    if (bundle.schemaVersion !== 1) {
      return {
        ok: false,
        error: 'invalid',
        message: `Unsupported export schemaVersion: ${String(bundle.schemaVersion)}`,
      }
    }
    if (!Array.isArray(bundle.projects)) {
      return { ok: false, error: 'invalid', message: 'Export bundle missing projects array.' }
    }
    const projects = bundle.projects.filter(isProject)
    if (projects.length === 0) {
      return { ok: false, error: 'invalid', message: 'No valid projects found in export bundle.' }
    }
    return { ok: true, value: projects.map(normalizeForExport) }
  }

  // Single project
  if (!Array.isArray(parsed) && isProject(parsed)) {
    return { ok: true, value: [normalizeForExport(parsed)] }
  }

  // Array of projects
  if (Array.isArray(parsed)) {
    const projects = parsed.filter(isProject)
    if (projects.length === 0) {
      return { ok: false, error: 'invalid', message: 'No valid projects found in array.' }
    }
    return { ok: true, value: projects.map(normalizeForExport) }
  }

  return {
    ok: false,
    error: 'invalid',
    message: 'Unrecognized project export format.',
  }
}

export interface ImportOptions {
  /**
   * When true (default), assign new ids if id collides with an existing project.
   * When false, overwrite existing projects with the same id.
   */
  renameOnConflict?: boolean
  storage?: ProjectStorage | null
}

function newImportId(): string {
  return `prj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Import parsed projects into localStorage.
 * Never silently drops on quota — returns error after partial success list.
 */
export function importProjects(
  projects: Project[],
  options: ImportOptions = {},
): ImportResult {
  const renameOnConflict = options.renameOnConflict !== false
  const storage = options.storage
  const existing = listProjects(storage)
  const existingIds = new Set(existing.map((p) => p.id))

  const imported: Project[] = []
  const errors: string[] = []
  let skipped = 0

  for (const raw of projects) {
    if (!isProject(raw)) {
      skipped += 1
      errors.push('Skipped invalid project entry.')
      continue
    }

    let project = normalizeForExport(raw)
    if (existingIds.has(project.id)) {
      if (renameOnConflict) {
        project = {
          ...project,
          id: newImportId(),
          updatedAt: nowIso(),
        }
      } else {
        project = { ...project, updatedAt: nowIso() }
      }
    }

    const result = saveProject(project, storage)
    if (!result.ok) {
      if (result.error === 'quota_exceeded') {
        return {
          ok: false,
          error: 'quota_exceeded',
          message: `${result.message} Imported ${imported.length} project(s) before failure.`,
        }
      }
      if (result.error === 'cap_exceeded') {
        return {
          ok: false,
          error: 'cap_exceeded',
          message: `${result.message} Imported ${imported.length} project(s) before failure.`,
        }
      }
      errors.push(result.message)
      skipped += 1
      continue
    }

    imported.push(result.value)
    existingIds.add(result.value.id)
  }

  if (imported.length === 0 && errors.length > 0) {
    return {
      ok: false,
      error: 'invalid_schema',
      message: errors[0] ?? 'Import failed.',
    }
  }

  return { ok: true, imported, skipped, errors }
}

/**
 * Parse JSON string and import into storage.
 */
export function importProjectsFromJson(
  raw: string,
  options: ImportOptions = {},
): ImportResult {
  const parsed = parseProjectImport(raw)
  if (!parsed.ok) {
    return {
      ok: false,
      error: 'invalid_json',
      message: parsed.message,
    }
  }
  return importProjects(parsed.value, options)
}

/** Suggested download filename for a project export. */
export function projectExportFilename(project?: Project): string {
  if (!project) {
    return `biointel-projects-${new Date().toISOString().slice(0, 10)}.json`
  }
  const slug = project.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return `biointel-project-${slug || project.id}.json`
}
