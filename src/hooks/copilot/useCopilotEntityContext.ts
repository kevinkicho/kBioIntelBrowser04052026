'use client'

import { useMemo } from 'react'
import { buildRetrievalSnapshot } from '@/lib/ai/copilot/retrieval'
import {
  buildMoleculeContext,
  contextToPromptBlock,
  buildDiseaseContext,
  diseaseContextToPromptBlock,
  buildGeneContext,
  geneContextToPromptBlock,
} from '@/lib/ai/copilot/context'
import {
  computeEvidenceGrounding,
  type EvidenceGroundingStats,
} from '@/lib/ai/copilot/evidenceDensity'
import type { CategoryId } from '@/lib/categoryConfig'
import type { CategoryLoadState } from '@/lib/fetchCategory'

/**
 * Shared entity context for copilot (snapshot, molecule/gene/disease blocks, grounding).
 * Pure memos — no streaming / tool loop.
 */
export function useCopilotEntityContext(
  categoryData: Partial<Record<CategoryId, Record<string, unknown>>>,
  categoryStatus: Record<CategoryId, CategoryLoadState>,
  fetchedAt: Partial<Record<CategoryId, Date>>,
  identity: {
    name: string
    cid: number
    molecularWeight?: number
    inchiKey?: string
    iupacName?: string
    geneSymbol?: string
  },
  diseaseName?: string,
) {
  const snapshot = useMemo(
    () => buildRetrievalSnapshot(categoryData, categoryStatus, fetchedAt),
    [categoryData, categoryStatus, fetchedAt],
  )

  const allData = useMemo(() => {
    const merged: Record<string, unknown> = {}
    for (const catId of Object.keys(categoryData) as CategoryId[]) {
      const catData = categoryData[catId]
      if (catData) Object.assign(merged, catData)
    }
    return merged
  }, [categoryData])

  const isDiseaseContext = identity.cid === 0 && Array.isArray(allData.diseaseResults)
  const isGeneContext = !!identity.geneSymbol

  const context = useMemo(
    () => buildMoleculeContext(categoryData, identity, allData, snapshot),
    [categoryData, identity, allData, snapshot],
  )

  const diseaseCtx = useMemo(
    () =>
      isDiseaseContext
        ? buildDiseaseContext(
            identity.name,
            (allData.diseaseResults as {
              id: string
              name: string
              description?: string
              therapeuticAreas?: string[]
              source: string
              molecules?: { name: string; cid: number | null }[]
            }[]) ?? [],
          )
        : null,
    [identity.name, allData, isDiseaseContext],
  )

  const geneCtx = useMemo(
    () =>
      isGeneContext ? buildGeneContext(identity.geneSymbol!, allData, snapshot) : null,
    [identity.geneSymbol, allData, snapshot, isGeneContext],
  )

  const diseasePromptSuffix = useMemo(() => {
    if (isGeneContext || isDiseaseContext) return ''
    if (diseaseName && context.identity.cid !== 0) {
      return `\n\n// DISEASE CONTEXT (user arrived from discovery for "${diseaseName}"):\nThis molecule is being evaluated as a candidate for treating "${diseaseName}". Prioritize analysis that relates this molecule's targets, mechanisms, safety profile, and clinical evidence to the disease "${diseaseName}". When evaluating therapeutic potential, repurposing opportunities, or safety concerns, frame insights in terms of their relevance to "${diseaseName}" treatment.`
    }
    return ''
  }, [isGeneContext, isDiseaseContext, diseaseName, context.identity.cid])

  const contextBlock = useMemo(() => {
    if (isGeneContext && geneCtx) return geneContextToPromptBlock(geneCtx)
    if (isDiseaseContext && diseaseCtx) return diseaseContextToPromptBlock(diseaseCtx)
    return contextToPromptBlock(context) + diseasePromptSuffix
  }, [isGeneContext, geneCtx, isDiseaseContext, diseaseCtx, context, diseasePromptSuffix])

  const grounding: EvidenceGroundingStats = useMemo(
    () =>
      computeEvidenceGrounding(
        context,
        snapshot,
        categoryStatus as Partial<Record<CategoryId, string>>,
      ),
    [context, snapshot, categoryStatus],
  )

  return {
    snapshot,
    allData,
    isDiseaseContext,
    isGeneContext,
    context,
    diseaseCtx,
    geneCtx,
    diseasePromptSuffix,
    contextBlock,
    grounding,
  }
}
