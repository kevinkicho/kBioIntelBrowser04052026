/**
 * Compatibility shim — prefer `@/lib/ai/copilot/tools`.
 * @deprecated Import from `@/lib/ai/copilot/tools` in new code.
 */
export {
  COPILOT_MAX_TOOL_STEPS,
  COPILOT_TOOLS,
  buildAgentToolSystemAddendum,
  executeCopilotTool,
  formatToolObservation,
  parseToolCall,
  type CopilotToolContext,
  type CopilotToolDef,
  type CopilotToolName,
  type ToolCall,
  type ToolResult,
} from './copilot/tools'
