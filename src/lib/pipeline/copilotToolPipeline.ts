/**
 * Copilot tool execution pipeline — timeout + classify, never hangs the agent loop.
 * Tools stay evidence-bound (executeCopilotTool); this only wraps reliability.
 */

import {
  executeCopilotTool,
  type CopilotToolContext,
  type ToolResult,
} from '@/lib/ai/copilot/tools/execute'
import type { ToolCall } from '@/lib/ai/copilot/tools/parse'
import { newPipelineRun, runStage } from './runStage'
import type { PipelineReport } from './types'

export interface CopilotToolPipelineResult {
  result: ToolResult
  pipeline: PipelineReport
}

/**
 * Run one allowlisted copilot tool with timeout (default 8s).
 * Side-effect tools (load_category) still return quickly — load is fire-and-forget in execute.
 */
export async function runCopilotToolPipeline(
  call: ToolCall,
  ctx: CopilotToolContext,
  opts?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<CopilotToolPipelineResult> {
  const run = newPipelineRun(`copilot-tool:${call.name}`)
  const timeoutMs = opts?.timeoutMs ?? 8_000

  const { value, stage } = await runStage(
    {
      id: 'execute_tool',
      timeoutMs,
      retries: 0,
      signal: opts?.signal,
    },
    async () => executeCopilotTool(call, ctx),
  )
  run.addStage(stage)

  if (!value) {
    const fail: ToolResult = {
      name: call.name as ToolResult['name'],
      ok: false,
      summary: stage.error || `Tool ${call.name} failed`,
    }
    return { result: fail, pipeline: run.finish(false, false) }
  }

  run.addStage({
    id: 'tool_result',
    status: value.ok ? 'ok' : 'error',
    ms: 0,
    notes: [value.summary.slice(0, 120)],
  })

  return {
    result: value,
    pipeline: run.finish(value.ok, !value.ok),
  }
}
