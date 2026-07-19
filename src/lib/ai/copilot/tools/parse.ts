import { isCopilotToolName, type CopilotToolName } from './catalog'

export interface ToolCall {
  name: CopilotToolName
  args: Record<string, unknown>
}

/**
 * Parse a single tool call from model output.
 * Formats: fenced ```tool JSON, inline JSON, or TOOL:/ARG lines.
 */
export function parseToolCall(text: string): ToolCall | null {
  if (!text?.trim()) return null

  const fence = text.match(/```(?:tool|json)?\s*([\s\S]*?)```/i)
  if (fence) {
    try {
      const parsed = JSON.parse(fence[1].trim()) as {
        name?: string
        args?: Record<string, unknown>
      }
      if (parsed.name && isCopilotToolName(parsed.name)) {
        return { name: parsed.name, args: parsed.args || {} }
      }
    } catch {
      /* fall through */
    }
  }

  const inline = text.match(
    /\{\s*"name"\s*:\s*"([a-z_]+)"\s*,\s*"args"\s*:\s*(\{[\s\S]*?\})\s*\}/,
  )
  if (inline && isCopilotToolName(inline[1])) {
    try {
      return { name: inline[1], args: JSON.parse(inline[2]) as Record<string, unknown> }
    } catch {
      /* fall through */
    }
  }

  const toolLine = text.match(/^\s*TOOL:\s*([a-z_]+)\s*$/im)
  if (toolLine && isCopilotToolName(toolLine[1])) {
    const args: Record<string, unknown> = {}
    const argRe = /^\s*ARG\s+([a-zA-Z0-9_]+)\s*=\s*(.+)\s*$/gim
    let m: RegExpExecArray | null
    while ((m = argRe.exec(text)) !== null) {
      args[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
    return { name: toolLine[1], args }
  }

  return null
}
