import { runAgentToolLoop } from '@/lib/ai/runtime/agentLoop'

async function* once(text: string): AsyncGenerator<string, void, unknown> {
  yield text
}

describe('runAgentToolLoop', () => {
  it('returns final text when no tool call', async () => {
    const result = await runAgentToolLoop({
      messages: [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'hi' },
      ],
      streamOnce: async function* () {
        yield 'Hello researcher'
      },
      parseToolCall: () => null,
      executeTool: () => ({ name: 'x', ok: true, summary: '' }),
      formatObservation: (r) => r.summary,
    })
    expect(result.finalText).toBe('Hello researcher')
    expect(result.toolTraces).toHaveLength(0)
  })

  it('executes one tool then final answer', async () => {
    let step = 0
    const result = await runAgentToolLoop({
      messages: [{ role: 'user', content: 'gaps?' }],
      streamOnce: async function* () {
        step += 1
        if (step === 1) {
          yield '```tool\n{"name":"get_retrieval_snapshot","args":{}}\n```'
        } else {
          yield '3 panels empty [adverse-events]'
        }
      },
      parseToolCall: (text) =>
        text.includes('get_retrieval_snapshot')
          ? { name: 'get_retrieval_snapshot', args: {} }
          : null,
      executeTool: (call) => ({
        name: call.name,
        ok: true,
        summary: 'empty: 3',
      }),
      formatObservation: (r) => `[TOOL] ${r.summary}`,
      maxToolSteps: 3,
    })
    expect(result.toolTraces).toHaveLength(1)
    expect(result.toolTraces[0].name).toBe('get_retrieval_snapshot')
    expect(result.finalText).toMatch(/empty/)
  })

  it('strips inline [Error:] tokens', async () => {
    const result = await runAgentToolLoop({
      messages: [{ role: 'user', content: 'x' }],
      streamOnce: () => once('partial [Error: boom]'),
      parseToolCall: () => null,
      executeTool: () => ({ name: 'x', ok: true, summary: '' }),
      formatObservation: (r) => r.summary,
    })
    expect(result.error).toBe('boom')
    expect(result.finalText).toBe('partial')
  })
})
