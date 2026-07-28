import { runStage, newPipelineRun, classifyPipelineError } from '@/lib/pipeline'

describe('pipeline runStage', () => {
  it('classifies abort and resource errors', () => {
    expect(classifyPipelineError(new DOMException('Aborted', 'AbortError'))).toBe(
      'abort',
    )
    expect(
      classifyPipelineError(new Error('net::ERR_INSUFFICIENT_RESOURCES')),
    ).toBe('resource')
    expect(classifyPipelineError(new Error('Stage timed out after 100ms'))).toBe(
      'timeout',
    )
  })

  it('succeeds and records stage ms', async () => {
    const { value, stage } = await runStage({ id: 't1', timeoutMs: 2000 }, async () => 42)
    expect(value).toBe(42)
    expect(stage.status).toBe('ok')
    expect(stage.id).toBe('t1')
  })

  it('retries then succeeds', async () => {
    let n = 0
    const { value, stage } = await runStage(
      { id: 'retry', retries: 2, retryDelayMs: 10 },
      async () => {
        n++
        if (n < 2) throw new Error('upstream flaky')
        return 'ok'
      },
    )
    expect(value).toBe('ok')
    expect(stage.status).toBe('ok')
    expect(n).toBe(2)
  })

  it('optional stage does not throw', async () => {
    const { value, stage } = await runStage(
      { id: 'opt', optional: true, retries: 0 },
      async () => {
        throw new Error('nope')
      },
    )
    expect(value).toBeNull()
    expect(stage.status).toBe('error')
  })

  it('newPipelineRun aggregates stages', () => {
    const run = newPipelineRun('test')
    run.addStage({ id: 'a', status: 'ok', ms: 1 })
    run.addStage({ id: 'b', status: 'error', ms: 2, error: 'x' })
    const report = run.finish(true, true)
    expect(report.name).toBe('test')
    expect(report.degraded).toBe(true)
    expect(report.stages).toHaveLength(2)
    expect(report.warnings.some((w) => w.includes('b:'))).toBe(true)
  })
})
