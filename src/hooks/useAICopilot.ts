'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAI } from '@/lib/ai/useAI'
import { persistAiGeneration } from '@/lib/ai/aiHistoryStore'
import { buildRetrievalSnapshot, formatRetrievalSummary } from '@/lib/ai/copilot/retrieval'
import {
  buildAgentToolSystemAddendum,
  COPILOT_MAX_TOOL_STEPS,
  executeCopilotTool,
  formatToolObservation,
  parseToolCall,
  type CopilotToolContext,
} from '@/lib/ai/copilot/tools'
import { runAgentToolLoop } from '@/lib/ai/runtime/agentLoop'
import { extractStreamError } from '@/lib/ai/runtime/streamChat'
import {
  buildMoleculeContext,
  contextToPromptBlock,
  buildDiseaseContext,
  diseaseContextToPromptBlock,
  buildGeneContext,
  geneContextToPromptBlock,
} from '@/lib/ai/copilot/context'
import {
  buildFollowUpPrompt,
  buildFreeQAPrompt,
  buildDiseaseQAPrompt,
  buildGeneQAPrompt,
  type PromptMode,
  type SessionMoleculeSummary,
} from '@/lib/ai/copilot/prompts'
import {
  recentSessionSummaries,
  sessionMoleculeToSummary,
} from '@/hooks/copilot/buildSessionMoleculeSummary'
import {
  isCopilotTaskMode,
  resolveInsightPrompt,
} from '@/lib/ai/copilot/resolveInsightPrompt'
import {
  validateTaskModeOutput,
  type CopilotTaskPayload,
} from '@/lib/ai/copilot/validateTaskMode'
import {
  buildFailClosedMessage,
  computeEvidenceGrounding,
  modeRequiresDeepDensity,
  type EvidenceGroundingStats,
} from '@/lib/ai/copilot/evidenceDensity'
import {
  buildDeterministicNextActions,
  buildDeterministicPriorArtQuery,
  buildDeterministicSafetyMemo,
  formatSafetyMemoAsText,
} from '@/lib/ai/aiTasks/deterministicArtifacts'
import type { CategoryId } from '@/lib/categoryConfig'
import type { CategoryLoadState } from '@/lib/fetchCategory'

export type {
  CopilotActions,
  CopilotMessage,
  CopilotState,
  CopilotTaskResult,
  CopilotToolTrace,
  GenerateInsightOptions,
} from '@/hooks/copilot/types'
import type {
  CopilotActions,
  CopilotMessage,
  CopilotState,
  CopilotToolTrace,
  GenerateInsightOptions,
} from '@/hooks/copilot/types'

export function useAICopilot(
  categoryData: Partial<Record<CategoryId, Record<string, unknown>>>,
  categoryStatus: Record<CategoryId, CategoryLoadState>,
  fetchedAt: Partial<Record<CategoryId, Date>>,
  identity: { name: string; cid: number; molecularWeight?: number; inchiKey?: string; iupacName?: string; geneSymbol?: string },
  diseaseName?: string,
  actions?: CopilotActions,
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
  const actionsRef = useRef(actions)
  actionsRef.current = actions
  const categoryDataRef = useRef(categoryData)
  categoryDataRef.current = categoryData
  const categoryStatusRef = useRef(categoryStatus)
  categoryStatusRef.current = categoryStatus

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

  const [lastPrompt, setLastPrompt] = useState<{
    mode: string
    system: string
    user: string
    at: number
    version: string
  } | null>(null)

  const grounding: EvidenceGroundingStats = useMemo(
    () =>
      computeEvidenceGrounding(
        context,
        snapshot,
        categoryStatus as Partial<Record<CategoryId, string>>,
      ),
    [context, snapshot, categoryStatus],
  )

  const finishDeterministicTask = useCallback(
    (
      mode: PromptMode,
      task: CopilotTaskPayload,
      content: string,
      promptNote: string,
    ) => {
      const msgId = `msg-${Date.now()}-${messageIdRef.current++}`
      setMessages((prev) => [
        ...prev,
        {
          id: msgId,
          role: 'assistant',
          content,
          mode,
          timestamp: Date.now(),
          task,
        },
      ])
      setLastPrompt({
        mode,
        system: 'deterministic-artifact (no LLM)',
        user: promptNote,
        at: Date.now(),
        version: 'evidenceFirst@v1',
      })
      void persistAiGeneration({
        kind: 'copilot',
        mode,
        content,
        context: {
          name: identity.name,
          cid: identity.cid || undefined,
          geneSymbol: identity.geneSymbol,
        },
        model: 'deterministic',
        ollamaUrl: ai.ollamaUrl,
        task,
        promptSystem: 'deterministic-artifact',
        promptUser: promptNote,
      })
    },
    [ai.ollamaUrl, identity.cid, identity.geneSymbol, identity.name],
  )

  const generateInsight = useCallback(async (mode: PromptMode, opts: GenerateInsightOptions = {}) => {
    if (!isDiseaseContext && !isGeneContext && context.identity.cid === 0) {
      addMessage('system', 'No entity loaded. Search for a molecule, disease, or gene first.', mode)
      return
    }

    // Plan-06 task modes are gated to molecule entities only.
    const isTaskMode = isCopilotTaskMode(mode)
    if (isTaskMode && (isDiseaseContext || isGeneContext)) {
      addMessage('system', `The "${mode.replace(/_/g, ' ')}" task is only available for molecule entities.`, mode)
      return
    }

    // ── Deterministic job artifacts (no LLM) ─────────────────────────────
    if (!isDiseaseContext && !isGeneContext && mode === 'safety_memo') {
      const memo = buildDeterministicSafetyMemo(context)
      const text = formatSafetyMemoAsText(memo)
      finishDeterministicTask(
        mode,
        {
          kind: 'safety_memo',
          text,
          title: memo.title,
          rowCount: memo.rows.length,
          unexplainedCount: memo.unexplained.length,
          deterministic: true,
        },
        text,
        `safety_memo rows=${memo.rows.length} grounding=${grounding.badgeLine}`,
      )
      return
    }

    if (!isDiseaseContext && !isGeneContext && mode === 'next_actions') {
      const { entities, actions } = buildDeterministicNextActions(
        context,
        grounding,
        categoryStatus as Partial<Record<CategoryId, string>>,
      )
      const text = [
        'Next actions (deterministic from free-API bags + gaps):',
        ...actions.map((a) => `• ${a.action} — ${a.why}`),
        entities.length ? 'Entities from named rows:' : '',
        ...entities.map((e) => `• [${e.type}] ${e.name}: ${e.reason}`),
        `Grounding: ${grounding.badgeLine}`,
      ]
        .filter(Boolean)
        .join('\n')
      finishDeterministicTask(
        mode,
        {
          kind: 'next_actions',
          entities,
          actions,
          text,
          deterministic: true,
        },
        text,
        `next_actions entities=${entities.length} actions=${actions.length}`,
      )
      return
    }

    if (!isDiseaseContext && !isGeneContext && mode === 'prior_art_query') {
      const det = buildDeterministicPriorArtQuery(context)
      if (det.query && (det.grounded || det.query.length > 8)) {
        finishDeterministicTask(
          mode,
          {
            kind: 'prior_art',
            query: det.query,
            notes: det.notes,
            deterministic: true,
          },
          det.query,
          `prior_art deterministic: ${det.notes.join('; ')}`,
        )
        return
      }
    }

    if (!isDiseaseContext && !isGeneContext && mode === 'suggest_next') {
      const { entities, actions } = buildDeterministicNextActions(
        context,
        grounding,
        categoryStatus as Partial<Record<CategoryId, string>>,
      )
      if (entities.length >= 3) {
        const text = entities.map((e) => `[${e.type}] ${e.name}: ${e.reason}`).join('\n')
        finishDeterministicTask(
          mode,
          {
            kind: 'suggest_next',
            entities,
            actions,
            deterministic: true,
          },
          text,
          `suggest_next deterministic n=${entities.length}`,
        )
        return
      }
    }

    // ── Load-then-reason: kick Core loads before fail-closed ─────────────
    if (
      !isDiseaseContext &&
      !isGeneContext &&
      modeRequiresDeepDensity(mode) &&
      !grounding.canDeepSynthesize
    ) {
      const load = actionsRef.current?.loadCategory
      if (load && grounding.missingCore.length > 0) {
        for (const cat of grounding.missingCore) {
          try {
            load(cat)
          } catch {
            /* ignore */
          }
        }
        addMessage(
          'system',
          `Loading Core categories for denser evidence: ${grounding.missingCore.join(', ')}. Re-run this mode after panels fill. Prefer Safety memo / Prior-art (deterministic) now.`,
          mode,
        )
      } else {
        addMessage('system', buildFailClosedMessage(grounding, mode), mode)
      }
      // Offer deterministic safety memo as useful fallback
      if (mode === 'safety_deep_dive' || mode === 'auto_insight' || mode === 'executive_brief') {
        const memo = buildDeterministicSafetyMemo(context)
        if (memo.rows.length > 0 || memo.mechanisms.length > 0) {
          const text = formatSafetyMemoAsText(memo)
          finishDeterministicTask(
            'safety_memo',
            {
              kind: 'safety_memo',
              text,
              title: memo.title,
              rowCount: memo.rows.length,
              unexplainedCount: memo.unexplained.length,
              deterministic: true,
            },
            text,
            `fallback safety_memo after fail-closed ${mode}`,
          )
        }
      }
      return
    }

    if (!aiAvailable) {
      const recent = messagesRef.current.slice(-3)
      if (!recent.some((m) => m.content.includes('AI is not available'))) {
        addMessage(
          'system',
          'AI is not available. Connect Ollama for model synthesis, or use Safety memo / Next actions / Prior-art (deterministic).',
          mode,
        )
      }
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
      const summary = sessionMoleculeToSummary(targetName)
      if (!summary) {
        addMessage('system', `No session data for "${targetName}".`, mode)
        return
      }
      diffTarget = summary
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

    const otherSessionMolecules =
      mode === 'cross_molecule_compare'
        ? recentSessionSummaries(identity.name, 5)
        : undefined

    const prompts = resolveInsightPrompt({
      mode,
      isDiseaseContext,
      isGeneContext,
      diseaseContextBlock: diseaseCtx ? diseaseContextToPromptBlock(diseaseCtx) : null,
      geneCtx,
      moleculeCtx: context,
      snapshot,
      otherSessionMolecules,
      diffTarget,
      researchQuestion: opts.researchQuestion,
    })

    const groundedUser =
      prompts.user +
      (diseasePromptSuffix || '') +
      `\n\n// GROUNDING BADGE: ${grounding.badgeLine}\n// Cite only named rows in the pack. Fail closed if thin.`

    setLastPrompt({
      mode,
      system: prompts.system,
      user: groundedUser,
      at: Date.now(),
      version: 'evidenceFirst@v1',
    })

    addMessage(
      'system',
      `Generating ${mode.replace(/_/g, ' ')}… (grounded on ${grounding.badgeLine})`,
      mode,
    )
    const msgId = `msg-${Date.now()}-${messageIdRef.current++}`
    setMessages((prev) => [
      ...prev,
      { id: msgId, role: 'assistant', content: '', mode, timestamp: Date.now() },
    ])

    let fullContent = ''
    let streamError: string | null = null
    try {
      const chatMessages = [
        { role: 'system' as const, content: prompts.system },
        { role: 'user' as const, content: groundedUser },
      ]

      for await (const token of ai.askAI(chatMessages)) {
        if (controller.signal.aborted) break
        fullContent += token
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, content: fullContent } : m)),
        )
      }
    } catch (err) {
      streamError = err instanceof Error ? err.message : String(err)
    }

    const { content: finalContent, error: inlineError } = extractStreamError(fullContent)
    const msgError = streamError || inlineError

    let taskPayload: CopilotMessage['task'] | undefined
    let validationError: string | undefined
    const rawForValidation = finalContent || fullContent

    if (!msgError && isTaskMode && rawForValidation) {
      const validated = validateTaskModeOutput({
        mode,
        raw: rawForValidation,
        moleculeName: context.identity.name,
        synonyms: context.identity.synonyms,
        diffOtherName: diffTarget?.name,
      })
      taskPayload = validated.task
      validationError = validated.validationError
    }

    if (msgError || validationError || taskPayload || finalContent !== fullContent) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                content: finalContent || fullContent,
                ...(msgError ? { error: msgError } : {}),
                ...(validationError ? { validationError } : {}),
                ...(taskPayload ? { task: taskPayload } : {}),
              }
            : m,
        ),
      )
    }

    const storedContent = finalContent || fullContent
    if (storedContent.trim() || taskPayload) {
      void persistAiGeneration({
        kind: 'copilot',
        mode,
        content: validationError
          ? `${storedContent}\n\n[validation: ${validationError}]`
          : storedContent,
        context: {
          name: identity.name,
          cid: identity.cid || undefined,
          geneSymbol: identity.geneSymbol,
        },
        model: ai.model,
        ollamaUrl: ai.ollamaUrl,
        task: taskPayload,
        error: msgError || undefined,
        promptSystem: prompts.system,
        promptUser: groundedUser,
      })
    }

    isStreamingRef.current = false
    setIsStreaming(false)
  }, [
    ai,
    aiAvailable,
    context,
    snapshot,
    grounding,
    categoryStatus,
    addMessage,
    finishDeterministicTask,
    identity.name,
    identity.cid,
    identity.geneSymbol,
    isDiseaseContext,
    diseaseCtx,
    isGeneContext,
    geneCtx,
    diseasePromptSuffix,
  ])

  const buildToolContext = useCallback((): CopilotToolContext => {
    const act = actionsRef.current
    return {
      snapshot,
      categoryData: categoryDataRef.current,
      categoryStatus: categoryStatusRef.current,
      identity: {
        name: identity.name,
        cid: identity.cid,
        geneSymbol: identity.geneSymbol,
      },
      refreshCategory: act?.refreshCategory,
      loadCategory: act?.loadCategory,
      openPanel: act?.openPanel,
      defaultProjectId: act?.defaultProjectId,
    }
  }, [snapshot, identity.name, identity.cid, identity.geneSymbol])

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

    const toolAddendum = buildAgentToolSystemAddendum()
    const hasQaHistory = messagesRef.current.some(
      (m) =>
        (m.mode === 'free_qa' || m.mode === 'followup') &&
        m.role === 'assistant' &&
        m.content,
    )
    let chatMessages: { role: 'system' | 'user' | 'assistant'; content: string }[]

    if (isDiseaseContext && diseaseCtx) {
      const diseaseBlock = diseaseContextToPromptBlock(diseaseCtx)
      const { system, user } = buildDiseaseQAPrompt(diseaseBlock, question)
      const systemWithTools = system + '\n\n' + toolAddendum
      setLastPrompt({
        mode: 'free_qa',
        system: systemWithTools,
        user,
        at: Date.now(),
        version: 'promptCatalog@v1+agentTools',
      })
      chatMessages = [
        { role: 'system', content: systemWithTools },
        { role: 'user', content: user },
      ]
    } else if (isGeneContext && geneCtx) {
      const { system, user } = buildGeneQAPrompt(geneCtx, question)
      const systemWithTools = system + '\n\n' + toolAddendum
      setLastPrompt({
        mode: 'free_qa',
        system: systemWithTools,
        user,
        at: Date.now(),
        version: 'promptCatalog@v1+agentTools',
      })
      chatMessages = [
        { role: 'system', content: systemWithTools },
        { role: 'user', content: user },
      ]
    } else if (hasQaHistory) {
      const recentHistory = messagesRef.current
        .filter((m) => m.mode === 'free_qa' || m.mode === 'followup')
        .slice(-6)
        .map((m) => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        }))
      chatMessages = buildFollowUpPrompt(recentHistory, context, question)
      const sysIdx = chatMessages.findIndex((m) => m.role === 'system')
      if (sysIdx >= 0) {
        chatMessages[sysIdx] = {
          ...chatMessages[sysIdx],
          content: chatMessages[sysIdx].content + '\n\n' + toolAddendum,
        }
      }
      if (diseasePromptSuffix) {
        const lastUserIdx = chatMessages.length - 1
        chatMessages[lastUserIdx] = {
          ...chatMessages[lastUserIdx],
          content: chatMessages[lastUserIdx].content + diseasePromptSuffix,
        }
      }
      const sys = chatMessages.find((m) => m.role === 'system')?.content ?? ''
      const usr = chatMessages
        .filter((m) => m.role === 'user')
        .map((m) => m.content)
        .join('\n---\n')
      setLastPrompt({
        mode: 'followup',
        system: sys,
        user: usr,
        at: Date.now(),
        version: 'promptCatalog@v1+agentTools',
      })
    } else {
      const { system, user } = buildFreeQAPrompt(context, question)
      const systemWithTools = system + '\n\n' + toolAddendum
      setLastPrompt({
        mode: 'free_qa',
        system: systemWithTools,
        user: user + diseasePromptSuffix,
        at: Date.now(),
        version: 'promptCatalog@v1+agentTools',
      })
      chatMessages = [
        { role: 'system', content: systemWithTools },
        { role: 'user', content: user + diseasePromptSuffix },
      ]
    }

    const msgId = 'msg-' + Date.now() + '-' + messageIdRef.current++
    setMessages((prev) => [
      ...prev,
      {
        id: msgId,
        role: 'assistant',
        content: '',
        mode: 'followup',
        timestamp: Date.now(),
        tools: [],
      },
    ])

    const loopResult = await runAgentToolLoop({
      messages: chatMessages,
      maxToolSteps: COPILOT_MAX_TOOL_STEPS,
      signal: controller.signal,
      streamOnce: (msgs) => ai.askAI(msgs),
      parseToolCall: (text) => parseToolCall(text),
      executeTool: async (call) => {
        const { runCopilotToolPipeline } = await import(
          '@/lib/pipeline/copilotToolPipeline'
        )
        const { result } = await runCopilotToolPipeline(
          {
            name: call.name as Parameters<typeof executeCopilotTool>[0]['name'],
            args: call.args,
          },
          buildToolContext(),
          { signal: controller.signal, timeoutMs: 8_000 },
        )
        return {
          name: result.name,
          ok: result.ok,
          summary: result.summary,
          data: result.data,
          categoryId: result.categoryId,
        }
      },
      formatObservation: (r) =>
        formatToolObservation({
          name: r.name as Parameters<typeof formatToolObservation>[0]['name'],
          ok: r.ok,
          summary: r.summary,
          data: r.data,
          categoryId: r.categoryId as Parameters<typeof formatToolObservation>[0]['categoryId'],
        }),
      onPartial: (text, tools) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  content: text,
                  tools: tools.length
                    ? tools.map((t) => ({
                        name: t.name,
                        ok: t.ok,
                        summary: t.summary,
                        categoryId: t.categoryId,
                      }))
                    : m.tools,
                }
              : m,
          ),
        )
      },
      onToolStart: (name) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, content: `Using tool \`${name}\`…` } : m,
          ),
        )
      },
      onToolEnd: (trace) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== msgId) return m
            const tools = [...(m.tools || []), trace]
            return {
              ...m,
              tools,
              content: `Tool ${trace.name}: ${trace.ok ? 'ok' : 'failed'}…`,
            }
          }),
        )
      },
    })

    const toolTraces: CopilotToolTrace[] = loopResult.toolTraces
    const qaContent = loopResult.finalText
    const msgError = loopResult.error

    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              content: qaContent,
              tools: toolTraces.length ? toolTraces : m.tools,
              ...(msgError ? { error: msgError } : {}),
            }
          : m,
      ),
    )

    if (qaContent.trim() || toolTraces.length) {
      const sysMsg = chatMessages.find((m) => m.role === 'system')?.content
      const userMsg = chatMessages
        .filter((m) => m.role === 'user')
        .map((m) => m.content)
        .join('\n---\n')
      void persistAiGeneration({
        kind: 'copilot',
        mode: 'free_qa',
        content:
          toolTraces.length > 0
            ? `[tools: ${toolTraces.map((t) => t.name).join(', ')}]\n${qaContent}`
            : qaContent,
        context: {
          name: identity.name,
          cid: identity.cid || undefined,
          geneSymbol: identity.geneSymbol,
        },
        model: ai.model,
        ollamaUrl: ai.ollamaUrl,
        error: msgError || undefined,
        promptSystem: sysMsg,
        promptUser: userMsg,
      })
    }

    isStreamingRef.current = false
    setIsStreaming(false)
  }, [
    ai,
    aiAvailable,
    context,
    addMessage,
    identity.name,
    identity.cid,
    identity.geneSymbol,
    isDiseaseContext,
    diseaseCtx,
    isGeneContext,
    geneCtx,
    diseasePromptSuffix,
    buildToolContext,
  ])

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

  // Auto-insight disabled: early runs produced fluent fluff on thin bags.
  // Users run job tasks or deep modes only when density badge is green.
  useEffect(() => {
    const loadedCount = Object.values(categoryStatus).filter((s) => s === 'loaded').length
    if (loadedCount > prevLoadedCountRef.current) {
      prevLoadedCountRef.current = loadedCount
    }
  }, [categoryStatus])

  return {
    snapshot,
    context,
    grounding,
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
    /** Last system+user prompt sent to the model (transparency) */
    lastPrompt,
  }
}