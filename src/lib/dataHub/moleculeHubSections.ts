/**
 * Molecule data-hub section builders (orchestrator).
 * Pure; no network. Section implementations under ./moleculeHub/sections/
 */
import type { MoleculeIdentityInput } from './moleculeHubShared'
import type { DataHubRow, DataHubSection } from './types'
import { buildNegativeEvidencePart } from './negativeEvidence'
import { buildSafetyTriangulationPart } from './safetyTriangulation'
import { buildFiveRegulatorPart } from './fiveRegulatorCard'
import { buildIdentityPart } from './moleculeHub/sections/identity'
import { buildKeysPart } from './moleculeHub/sections/keys'
import { buildRegulatoryPart } from './moleculeHub/sections/regulatory'
import { buildClinicalPart } from './moleculeHub/sections/clinical'
import { buildTargetsPart } from './moleculeHub/sections/targets'
import { buildSafetyPart } from './moleculeHub/sections/safety'
import { buildLiteraturePart } from './moleculeHub/sections/literature'
import { buildStructuresPart } from './moleculeHub/sections/structures'

export function buildMoleculeHubParts(
  identity: MoleculeIdentityInput,
  data: Record<string, unknown>,
): { rows: DataHubRow[]; sections: DataHubSection[] } {
  const all: DataHubRow[] = []
  const sections: DataHubSection[] = []

  for (const part of [
    buildIdentityPart(identity, data),
    buildKeysPart(identity, data),
    buildRegulatoryPart(identity, data),
    buildClinicalPart(identity, data),
    buildTargetsPart(identity, data),
    buildSafetyPart(identity, data),
    buildLiteraturePart(identity, data),
    buildStructuresPart(identity, data),
  ]) {
    all.push(...part.rows)
    sections.push(...part.sections)
  }

  // v3: five-regulator card + safety triangulation (of-record assemble)
  const five = buildFiveRegulatorPart(data)
  if (five.section && five.rows.length > 0) {
    all.push(...five.rows)
    sections.push(five.section)
  }
  const tri = buildSafetyTriangulationPart(data)
  if (tri.section && tri.rows.length > 0) {
    all.push(...tri.rows)
    sections.push(tri.section)
  }

  // Of-record negative evidence for empty free-API bags
  const neg = buildNegativeEvidencePart(data)
  if (neg.section && neg.rows.length > 0) {
    all.push(...neg.rows)
    sections.push(neg.section)
  }

  return { rows: all, sections }
}
