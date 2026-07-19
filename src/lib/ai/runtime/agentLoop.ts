/**
 * Pure multi-step tool agent loop (evidence-bound tools only).
 * No React; no product ranking.
 */

import type { ChatMessage } from './streamChat'
import { collectStream, extractStreamError } from './streamChat'

export interface AgentToolTrace {
  name: string
  ok: boolean
  summary: string
  categoryId?: string
}

export interface AgentToolCall {
  name: string
  args: Record<string, unknown>
}

export interface AgentToolResult {
  name: string
  ok: boolean
  summary: string
  data?: unknown
  categoryId?: string
}

export interface AgentLoopOptions {
  /** Initial messages (system + user, optionally history). */
  messages: ChatMessage[]
  /** Stream one completion for the current messages. */
  streamOnce: (messages: ChatMessage[]) => AsyncGenerator<string, void, unknown>
  parseToolCall: (text: string) => AgentToolCall | null
  executeTool: (call: AgentToolCall) => AgentToolResult
  formatObservation: (result: AgentToolResult) => string
  maxToolSteps?: number
  signal?: AbortSignal
  /** Called after each partial stream (UI progress). */
  onPartial?: (text: string, tools: AgentToolTrace[]) => void
  /** Called when a tool is about to run. */
  onToolStart?: (name: string) => void
  /** Called after a tool finishes. */
  onToolEnd?: (trace: AgentToolTrace) => void
}

export interface AgentLoopResult {
  finalText: string
  toolTraces: AgentToolTrace[]
  error?: string
  steps: number
}

const DEFAULT_MAX_STEPS = 5

const CONTINUE_HINT =
  '\n\nContinue: answer the user with evidence citations. You may call one more tool if needed, else give the final answer (no tool fence).'

/**
 * Run up to maxToolSteps tool rounds, then return the last non-tool (or final) text.
 */
export async function runAgentToolLoop(opts: AgentLoopOptions): Promise<AgentLoopResult> {
  const maxSteps = opts.maxToolSteps ?? DEFAULT_MAX_STEPS
  let messages = [...opts.messages]
  const toolTraces: AgentToolTrace[] = []
  let fullContent = ''
  let streamError: string | undefined

  try {
    for (let step = 0; step < maxSteps + 1; step++) {
      if (opts.signal?.aborted) break

      fullContent = await collectStream(opts.streamOnce(messages), {
        signal: opts.signal,
        onToken: (partial) => opts.onPartial?.(partial, toolTraces),
      })

      const toolCall = opts.parseToolCall(fullContent)
      if (!toolCall || step >= maxSteps) break

      opts.onToolStart?.(toolCall.name)
      const result = opts.executeTool(toolCall)
      const trace: AgentToolTrace = {
        name: result.name,
        ok: result.ok,
        summary: result.summary.slice(0, 200),
        categoryId: result.categoryId,
      }
      toolTraces.push(trace)
      opts.onToolEnd?.(trace)

      messages = [
        ...messages,
        { role: 'assistant', content: fullContent },
        {
          role: 'user',
          content: opts.formatObservation(result) + CONTINUE_HINT,
        },
      ]
    }
  } catch (err) {
    streamError = err instanceof Error ? err.message : String(err)
  }

  const { content: finalText, error: inlineError } = extractStreamError(fullContent)
  return {
    finalText: finalText || fullContent,
    toolTraces,
    error: streamError || inlineError,
    steps: toolTraces.length,
  }
}
