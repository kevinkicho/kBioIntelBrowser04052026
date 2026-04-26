'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAI } from '@/lib/ai/useAI'
import { buildRetrievalSnapshot, formatRetrievalSummary } from '@/lib/ai/retrievalMonitor'
import { buildMoleculeContext, contextToPromptBlock, extractRichData, buildDiseaseContext, diseaseContextToPromptBlock, buildGeneContext, geneContextToPromptBlock } from '@/lib/ai/contextBuilder'
import { buildAutoInsightPrompt, buildExecutiveBriefPrompt, buildGapAnalysisPrompt, buildSafetyDeepDivePrompt, buildFollowUpPrompt, buildFreeQAPrompt, buildMechanismAnalysisPrompt, buildTherapeuticHypothesisPrompt, buildCompetitivePositionPrompt, buildRepurposingScanPrompt, buildCrossMoleculeComparePrompt, buildDiseaseAutoInsightPrompt, buildDiseaseQAPrompt, buildDiseaseSearchBriefPrompt, buildDiseaseSearchGapPrompt, buildDiseaseSearchRepurposingPrompt, buildDiseaseSearchMechanismPrompt, buildDiseaseSearchHypothesisPrompt, buildGeneTherapeuticPrompt, buildGeneRepurposingPrompt, buildGeneMechanismPrompt, buildGeneTargetAssessmentPrompt, buildGeneQAPrompt, buildPriorArtQueryPrompt, buildDifferentialSafetyPrompt, buildSuggestNextPrompt, buildHypothesisSeedPrompt, type PromptMode, type SessionMoleculeSummary } from '@/lib/ai/promptTemplates'
import { sessionHistory } from '@/lib/sessionHistory'
import { validatePriorArtQuery } from '@/lib/ai/aiTasks/priorArt'
import { validateDiffSafety } from '@/lib/ai/aiTasks/diffSafety'
import { validateSuggestNext, type SuggestedEntity } from '@/lib/ai/aiTasks/suggestNext'
import { validateHypothesisSeed, buildHypothesisSeedUrl } from '@/lib/ai/aiTasks/hypothesisSeed'
import type { Filter } from '@/lib/hypothesis/types'
import type { CategoryId } from '@/lib/categoryConfig'
import type { CategoryLoadState } from '@/lib/fetchCategory'

export interface CopilotTaskResult {
  /** Structured payload that survived validation; UI may render specially. */
  kind: 'prior_art' | 'diff_safety' | 'suggest_next' | 'hypothesis_seed'
  data:
    | { kind: 'prior_art'; query: string }
    | { kind: 'diff_safety'; text: string; paragraphCount: number; currentName: string; otherName: string }
    | { kind: 'suggest_next'; entities: SuggestedEntity[] }
    | { kind: 'hypothesis_seed'; filters: Filter[]; url: string }
}

export interface CopilotMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  mode: PromptMode
  timestamp: number
  error?: string
  /** Validation failure message for task modes (shown in lieu of raw content). */
  validationError?: string
  /** Structured payload for task modes when validation succeeds. */
  task?: CopilotTaskResult['data']
}

export interface CopilotState {
  messages: CopilotMessage[]
  isStreaming: boolean
  activeTab: 'monitor' | 'insights' | 'ask' | 'settings'
  autoInsightGenerated: boolean
}

export interface GenerateInsightOptions {
  /** For `differential_safety`: the previously-viewed molecule's name to diff against. */
  diffTargetName?: string
  /** For `hypothesis_seed`: the user's free-form research question. */
  researchQuestion?: string
}

export function useAICopilot(
  categoryData: Partial<Record<CategoryId, Record<string, unknown>>>,
  categoryStatus: Record<CategoryId, CategoryLoadState>,
  fetchedAt: Partial<Record<CategoryId, Date>>,
  identity: { name: string; cid: number; molecularWeight?: number; inchiKey?: string; iupacName?: string; geneSymbol?: string },
  diseaseName?: string,
) {
  const ai = useAI()
  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeTab, setActiveTab] = useState<CopilotState['activeTab']>('monitor')
  const [autoInsightGenerated, setAutoInsightGenerated] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const prevLoadedCountRef = useRef(0)
  const prevCidRef = useRef(identity.cid)
  const prevGeneRef = useRef(identity.geneSymbol)
  const prevNameRef = useRef(identity.name)
  const messageIdRef = useRef(0)
  const isStreamingRef = useRef(false)
  const messagesRef = useRef<CopilotMessage[]>([])
  messagesRef.current = messages

  const generateInsightRef = useRef<((mode: PromptMode, opts?: GenerateInsightOptions) => Promise<void>) | null>(null)

  const snapshot = useMemo(
    () => buildRetrievalSnapshot(categoryData, categoryStatus, fetchedAt),
    [categoryData, categoryStatus, fetchedAt]
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
    [categoryData, identity, allData, snapshot]
  )

  const diseaseCtx = useMemo(
    () => isDiseaseContext
      ? buildDiseaseContext(identity.name, (allData.diseaseResults as { id: string; name: string; description?: string; therapeuticAreas?: string[]; source: string; molecules?: { name: string; cid: number | null }[] }[]) ?? [])
      : null,
    [identity.name, allData, isDiseaseContext]
  )

  const geneCtx = useMemo(
    () => isGeneContext
      ? buildGeneContext(identity.geneSymbol!, allData, snapshot)
      : null,
    [identity.geneSymbol, allData, snapshot, isGeneContext]
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

  const aiAvailable = ai.enabled && ai.status === 'available'

  function extractStreamError(content: string): { content: string; error?: string } {
    const match = content.match(/\[Error: (.+?)\]/)
    if (!match) return { content }
    const errorText = match[1]
    const cleaned = content.replace(/\s*\[Error: .+?\]\s*/g, '').trim()
    return { content: cleaned || '', error: errorText }
  }

  const addMessage = useCallback((role: CopilotMessage['role'], content: string, mode: PromptMode): CopilotMessage => {
    const msg: CopilotMessage = {
      id: `msg-${Date.now()}-${messageIdRef.current++}`,
      role,
      content,
      mode,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, msg])
    return msg
  }, [])

  const generateInsight = useCallback(async (mode: PromptMode, opts: GenerateInsightOptions = {}) => {
    if (!aiAvailable) {
      const recent = messagesRef.current.slice(-3)
      if (!recent.some(m => m.content.includes('AI is not available'))) {
        addMessage('system', 'AI is not available. Connect Ollama to enable AI insights.', mode)
      }
      return
    }
    if (!isDiseaseContext && !isGeneContext && context.identity.cid === 0) {
      addMessage('system', 'No entity loaded. Search for a molecule, disease, or gene first.', mode)
      return
    }

    // Plan-06 task modes are gated to molecule entities only.
    const isTaskMode = mode === 'prior_art_query' || mode === 'differential_safety' || mode === 'suggest_next' || mode === 'hypothesis_seed'
    if (isTaskMode && (isDiseaseContext || isGeneContext)) {
      addMessage('system', `The "${mode.replace(/_/g, ' ')}" task is only available for molecule entities.`, mode)
      return
    }

    // Resolve the differential-safety target up front so we can fail fast.
    let diffTarget: SessionMoleculeSummary | null = null
    if (mode === 'differential_safety') {
      const targetName = opts.diffTargetName?.trim()
      if (!targetName) {
        addMessage('system', 'Pick a previously-viewed molecule to diff against.', mode)
        return
      }
      const sm = sessionHistory.getMolecule(targetName)
      if (!sm) {
        addMessage('system', `No session data for "${targetName}".`, mode)
        return
      }
      const rd = extractRichData(sm.drugData)
      diffTarget = {
        name: sm.name,
        searchedAt: sm.searchedAt,
        topTargets: rd.topTargetActivities.slice(0, 5).map(t => t.targetName),
        topAEs: rd.topAdverseEvents.slice(0, 5).map(ae => ae.reactionName),
        mechanisms: rd.mechanismDetails.slice(0, 3).map(m => `${m.mechanismOfAction} -> ${m.targetName}`),
        indications: rd.indicationDetails.slice(0, 5).map(i => i.condition),
      }
    }

    if (mode === 'hypothesis_seed' && !opts.researchQuestion?.trim()) {
      addMessage('system', 'Type a research question first, then click Hypothesis Seed.', mode)
      return
    }

    if (isStreamingRef.current) return
    isStreamingRef.current = true
    setIsStreaming(true)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    let prompts: { system: string; user: string }

    if (isDiseaseContext && diseaseCtx) {
      const diseaseBlock = diseaseContextToPromptBlock(diseaseCtx)
      switch (mode) {
        case 'auto_insight':
          prompts = buildDiseaseAutoInsightPrompt(diseaseBlock)
          break
        case 'executive_brief':
          prompts = buildDiseaseSearchBriefPrompt(diseaseBlock)
          break
        case 'gap_analysis':
          prompts = buildDiseaseSearchGapPrompt(diseaseBlock)
          break
        case 'mechanism_analysis':
          prompts = buildDiseaseSearchMechanismPrompt(diseaseBlock)
          break
        case 'therapeutic_hypothesis':
          prompts = buildDiseaseSearchHypothesisPrompt(diseaseBlock)
          break
        case 'repurposing_scan':
          prompts = buildDiseaseSearchRepurposingPrompt(diseaseBlock)
          break
        default:
          prompts = buildDiseaseAutoInsightPrompt(diseaseBlock)
      }
    } else if (isGeneContext && geneCtx) {
      switch (mode) {
        case 'auto_insight':
        case 'gene_therapeutic':
          prompts = buildGeneTherapeuticPrompt(geneCtx)
          break
        case 'gene_repurposing':
          prompts = buildGeneRepurposingPrompt(geneCtx)
          break
        case 'gene_mechanism':
          prompts = buildGeneMechanismPrompt(geneCtx)
          break
        case 'gene_target_assessment':
          prompts = buildGeneTargetAssessmentPrompt(geneCtx)
          break
        case 'executive_brief':
          prompts = buildGeneTherapeuticPrompt(geneCtx)
          break
        case 'gap_analysis':
          prompts = buildGeneTargetAssessmentPrompt(geneCtx)
          break
        default:
          prompts = buildGeneTherapeuticPrompt(geneCtx)
      }
    } else {
      switch (mode) {
        case 'auto_insight':
          prompts = buildAutoInsightPrompt(context, snapshot)
          break
        case 'executive_brief':
          prompts = buildExecutiveBriefPrompt(context, snapshot)
          break
        case 'gap_analysis':
          prompts = buildGapAnalysisPrompt(context, snapshot)
          break
        case 'safety_deep_dive':
          prompts = buildSafetyDeepDivePrompt(context)
          break
        case 'mechanism_analysis':
          prompts = buildMechanismAnalysisPrompt(context)
          break
        case 'therapeutic_hypothesis':
          prompts = buildTherapeuticHypothesisPrompt(context)
          break
        case 'competitive_position':
          prompts = buildCompetitivePositionPrompt(context)
          break
        case 'repurposing_scan':
          prompts = buildRepurposingScanPrompt(context)
          break
        case 'cross_molecule_compare': {
          const others = sessionHistory.getRecentMolecules(5)
            .filter(m => m.name !== identity.name)
            .map((m): SessionMoleculeSummary => {
              const rd = extractRichData(m.drugData)
              return {
                name: m.name,
                searchedAt: m.searchedAt,
                topTargets: rd.topTargetActivities.slice(0, 5).map(t => t.targetName),
                topAEs: rd.topAdverseEvents.slice(0, 5).map(ae => ae.reactionName),
                mechanisms: rd.mechanismDetails.slice(0, 3).map(mech => `${mech.mechanismOfAction} -> ${mech.targetName}`),
                indications: rd.indicationDetails.slice(0, 5).map(i => i.condition),
              }
            })
          prompts = buildCrossMoleculeComparePrompt(context, others)
          break
        }
        case 'prior_art_query':
          prompts = buildPriorArtQueryPrompt(context)
          break
        case 'differential_safety':
          prompts = buildDifferentialSafetyPrompt(context, diffTarget!)
          break
        case 'suggest_next':
          prompts = buildSuggestNextPrompt(context)
          break
        case 'hypothesis_seed':
          prompts = buildHypothesisSeedPrompt(context, opts.researchQuestion!)
          break
        default:
          prompts = buildAutoInsightPrompt(context, snapshot)
      }
    }

    addMessage('system', `Generating ${mode.replace('_', ' ')}...`, mode)
    const msgId = `msg-${Date.now()}-${messageIdRef.current++}`
    setMessages(prev => [...prev, { id: msgId, role: 'assistant', content: '', mode, timestamp: Date.now() }])

    let fullContent = ''
    let streamError: string | null = null
    try {
      const chatMessages = [
        { role: 'system' as const, content: prompts.system },
        { role: 'user' as const, content: prompts.user + diseasePromptSuffix },
      ]

      for await (const token of ai.askAI(chatMessages)) {
        if (controller.signal.aborted) break
        fullContent += token
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m))
      }
    } catch (err) {
      streamError = err instanceof Error ? err.message : String(err)
    }

    const { content: finalContent, error: inlineError } = extractStreamError(fullContent)
    const msgError = streamError || inlineError

    // Plan-06: validate task-mode outputs and either attach the structured
    // payload or surface a polite "AI response was unclear" message.
    let taskPayload: CopilotMessage['task'] | undefined
    let validationError: string | undefined
    const rawForValidation = finalContent || fullContent

    if (!msgError && isTaskMode && rawForValidation) {
      if (mode === 'prior_art_query') {
        const v = validatePriorArtQuery(rawForValidation, {
          name: context.identity.name,
          synonyms: context.identity.synonyms,
        })
        if (v.ok) {
          taskPayload = { kind: 'prior_art', query: v.query }
        } else {
          validationError = `AI response was unclear, try again. (${v.reason})`
        }
      } else if (mode === 'differential_safety' && diffTarget) {
        const v = validateDiffSafety(rawForValidation, context.identity.name, diffTarget.name)
        if (v.ok) {
          taskPayload = {
            kind: 'diff_safety',
            text: v.text,
            paragraphCount: v.paragraphCount,
            currentName: context.identity.name,
            otherName: diffTarget.name,
          }
        } else {
          validationError = `AI response was unclear, try again. (${v.reason})`
        }
      } else if (mode === 'suggest_next') {
        const v = validateSuggestNext(rawForValidation)
        if (v.ok) {
          taskPayload = { kind: 'suggest_next', entities: v.entities }
        } else {
          validationError = `AI response was unclear, try again. (${v.reason})`
        }
      } else if (mode === 'hypothesis_seed') {
        const v = validateHypothesisSeed(rawForValidation)
        if (v.ok) {
          taskPayload = {
            kind: 'hypothesis_seed',
            filters: v.filters,
            url: buildHypothesisSeedUrl(v.filters),
          }
        } else {
          validationError = `AI response was unclear, try again. (${v.reason})`
        }
      }
    }

    if (msgError || validationError || taskPayload || finalContent !== fullContent) {
      setMessages(prev => prev.map(m => m.id === msgId ? {
        ...m,
        content: finalContent || fullContent,
        ...(msgError ? { error: msgError } : {}),
        ...(validationError ? { validationError } : {}),
        ...(taskPayload ? { task: taskPayload } : {}),
      } : m))
    }

    isStreamingRef.current = false
    setIsStreaming(false)
  }, [ai, aiAvailable, context, snapshot, addMessage, identity.name, isDiseaseContext, diseaseCtx, isGeneContext, geneCtx, diseasePromptSuffix])

  const askQuestion = useCallback(async (question: string) => {
    if (!aiAvailable) {
      addMessage('user', question, 'free_qa')
      addMessage('system', 'AI is not available. Connect Ollama to enable Q&A.', 'free_qa')
      return
    }
    if (!isDiseaseContext && !isGeneContext && context.identity.cid === 0) {
      addMessage('user', question, 'free_qa')
      addMessage('system', 'No entity loaded. Search for a molecule, disease, or gene first.', 'free_qa')
      return
    }
    if (isStreamingRef.current) return
    isStreamingRef.current = true
    setIsStreaming(true)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    addMessage('user', question, 'free_qa')

    const hasQaHistory = messagesRef.current.some(m => (m.mode === 'free_qa' || m.mode === 'followup') && m.role === 'assistant' && m.content)
    let chatMessages: { role: 'system' | 'user' | 'assistant'; content: string }[]

    if (isDiseaseContext && diseaseCtx) {
      const diseaseBlock = diseaseContextToPromptBlock(diseaseCtx)
      const { system, user } = buildDiseaseQAPrompt(diseaseBlock, question)
      chatMessages = [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ]
    } else if (isGeneContext && geneCtx) {
      const { system, user } = buildGeneQAPrompt(geneCtx, question)
      chatMessages = [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ]
    } else if (hasQaHistory) {
      const recentHistory = messagesRef.current
        .filter(m => m.mode === 'free_qa' || m.mode === 'followup')
        .slice(-6).map(m => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        }))
      chatMessages = buildFollowUpPrompt(recentHistory, context, question)
      if (diseasePromptSuffix) {
        const lastUserIdx = chatMessages.length - 1
        chatMessages[lastUserIdx] = { ...chatMessages[lastUserIdx], content: chatMessages[lastUserIdx].content + diseasePromptSuffix }
      }
    } else {
      const { system, user } = buildFreeQAPrompt(context, question)
      chatMessages = [
        { role: 'system', content: system },
        { role: 'user', content: user + diseasePromptSuffix },
      ]
    }

    const msgId = `msg-${Date.now()}-${messageIdRef.current++}`
    setMessages(prev => [...prev, { id: msgId, role: 'assistant', content: '', mode: 'followup', timestamp: Date.now() }])

    let fullContent = ''
    let streamError: string | null = null
    try {
      for await (const token of ai.askAI(chatMessages)) {
        if (controller.signal.aborted) break
        fullContent += token
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m))
      }
    } catch (err) {
      streamError = err instanceof Error ? err.message : String(err)
    }

    const { content: finalContent, error: inlineError } = extractStreamError(fullContent)
    const msgError = streamError || inlineError
    if (msgError || finalContent !== fullContent) {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: finalContent || fullContent, ...(msgError ? { error: msgError } : {}) } : m))
    }

    isStreamingRef.current = false
    setIsStreaming(false)
  }, [ai, aiAvailable, context, addMessage, isDiseaseContext, diseaseCtx, isGeneContext, geneCtx, diseasePromptSuffix])

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
    isStreamingRef.current = false
    setIsStreaming(false)
  }, [])

  const clearChat = useCallback(() => {
    setMessages([])
    setAutoInsightGenerated(false)
  }, [])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    generateInsightRef.current = generateInsight
  }, [generateInsight])

  useEffect(() => {
    const entityKey = `${identity.cid}-${identity.geneSymbol ?? ''}-${identity.name}`
    const prevKey = `${prevCidRef.current}-${prevGeneRef.current ?? ''}-${prevNameRef.current}`
    if (entityKey !== prevKey) {
      prevCidRef.current = identity.cid
      prevGeneRef.current = identity.geneSymbol
      prevNameRef.current = identity.name
      abortRef.current?.abort()
      isStreamingRef.current = false
      setIsStreaming(false)
      setMessages([])
      setAutoInsightGenerated(false)
      setActiveTab('monitor')
      prevLoadedCountRef.current = 0
    }
  }, [identity.cid, identity.geneSymbol, identity.name])

  useEffect(() => {
    const loadedCount = Object.values(categoryStatus).filter(s => s === 'loaded').length
    if (loadedCount >= 3 && !autoInsightGenerated && aiAvailable) {
      const timer = setTimeout(() => {
        setAutoInsightGenerated(true)
        generateInsightRef.current?.('auto_insight')
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [categoryStatus, autoInsightGenerated, aiAvailable])

  useEffect(() => {
    const loadedCount = Object.values(categoryStatus).filter(s => s === 'loaded').length
    if (loadedCount > prevLoadedCountRef.current + 1 && loadedCount <= 7) {
      prevLoadedCountRef.current = loadedCount
    }
  }, [categoryStatus])

  return {
    snapshot,
    context,
    contextBlock,
    isDiseaseContext,
    isGeneContext,
    messages,
    isStreaming,
    activeTab,
    aiAvailable,
    autoInsightGenerated,
    setActiveTab,
    generateInsight,
    askQuestion,
    stopStreaming,
    clearChat,
    formatRetrievalSummary: () => formatRetrievalSummary(snapshot),
  }
}