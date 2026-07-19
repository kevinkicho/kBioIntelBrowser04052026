import { COPILOT_MAX_TOOL_STEPS, COPILOT_TOOLS } from './catalog'

/** System addendum teaching the model the tool protocol. */
export function buildAgentToolSystemAddendum(): string {
  const catalog = COPILOT_TOOLS.map(
    (t) =>
      `- ${t.name}: ${t.description}${
        Object.keys(t.parameters).length
          ? ` Params: ${Object.entries(t.parameters)
              .map(([k, v]) => `${k} (${v})`)
              .join(', ')}`
          : ''
      }`,
  ).join('\n')

  return `
AGENT TOOLS (optional, evidence-bound only):
You may request ONE tool per assistant turn when you need fresh facts about retrieval state or panel contents.
To call a tool, output ONLY a fenced block and nothing else:

\`\`\`tool
{"name":"get_retrieval_snapshot","args":{}}
\`\`\`

Available tools:
${catalog}

Rules:
1. Prefer tools for "what's missing / empty / failed" questions before free-form guessing.
2. Never invent clinical trials, AE counts, or mechanisms not present in tool results or molecule context.
3. After tool results are provided, answer the user with citations [panel-key].
4. Do NOT request tools for Discover ranking or regulatory conclusions.
5. Max ${COPILOT_MAX_TOOL_STEPS} tool steps per user question — then answer with what you have.
`.trim()
}
