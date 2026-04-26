# 05 — Test Infrastructure Cleanup

## Why

**Baseline test status: 75 of 230 suites failed, 208 of 1340 tests failed (~33% red).** Almost all are mock-related, not real bugs. They've been red long enough that nobody trusts them, which means real regressions slip through unnoticed.

This is the **single biggest hidden risk in the codebase**. Every other plan in this directory becomes safer to execute once the test suite is green again.

## Scope (v1)

- Identify the failure clusters
- Fix the dominant pattern (`response.headers.get` on undefined)
- Provide a `mockResponse(body, opts?)` helper that produces complete `Response`-shaped objects
- Refactor existing test mocks to use it
- Add a defense-in-depth fix in `clientFetch.ts` so a partial mock doesn't crash production code paths
- Document the test-mock pattern in a short `__tests__/README.md`

**Out of scope for v1:** migrating the test runner (e.g., to Vitest), adding new tests, snapshot test infrastructure, CI pipeline changes.

## Failure analysis (already done)

- **Dominant cluster:** `src/lib/clientFetch.ts:93` does `response.headers.get('content-length')`. Test mocks return plain objects (e.g., `{ ok: true, json: () => ... }`) without a `headers` property → `TypeError: Cannot read properties of undefined (reading 'get')`. This single root cause crashes the majority of failing suites.
- **Secondary cluster:** A few test suites use older mock shapes that drifted from the current API
- **Stale tests:** The earlier audit (`docs/archive/CODE_AUDIT_REPORT.md`) flagged `__tests__/api/plex.test.ts` (deleted code) and `__tests__/components/EbiProteinsPanel.test.tsx` (outdated props)

## Approach

### 1. Centralized mock helper

`__tests__/utils/mockFetch.ts`:

```ts
export function mockResponse(body: unknown, init: { status?: number, headers?: Record<string,string> } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json', ...init.headers },
  })
}

export function mockFetch(handler: (url: string, init?: RequestInit) => unknown) {
  global.fetch = jest.fn((url, init) =>
    Promise.resolve(mockResponse(handler(String(url), init)))
  ) as typeof fetch
}
```

### 2. Defense in depth in `clientFetch`

Single-line change at `src/lib/clientFetch.ts:93`:

```ts
const size = response.headers?.get?.('content-length')
```

Belt and braces — if a real partial response ever lands in production, the app degrades gracefully instead of crashing.

### 3. Bulk migrate existing mocks

A subagent-friendly mechanical task: pattern-match `Promise.resolve({ ok: true, ...})` and rewrite to use `mockResponse`. ~75 test files affected.

### 4. Stale tests

- Delete `__tests__/api/plex.test.ts` if still referencing deleted code
- Update `__tests__/components/EbiProteinsPanel.test.tsx` to current props (`variations`, `proteomics`, `crossReferences`)

## File-level changes

- `__tests__/utils/mockFetch.ts` — new helper
- `__tests__/README.md` — short doc on the test mock pattern (the only README we need under tests)
- `src/lib/clientFetch.ts` — defensive `?.` access (line 93)
- ~75 test files: search-and-replace to use `mockResponse`. Subagent-driven mechanical pass
- Delete or rewrite `__tests__/api/plex.test.ts`
- Update `__tests__/components/EbiProteinsPanel.test.tsx`

## Risks & open questions

- **Hidden real bugs.** Once the mock crash is fixed, some currently-failing tests may reveal genuine regressions. Triage in a second pass after the mass migration
- **Legitimate fetch-mocking patterns.** A few suites may already use `jest-fetch-mock` (it's in `devDependencies`). Audit before bulk replacing — `jest-fetch-mock` calls like `fetchMock.mockResponseOnce(JSON.stringify(...))` produce real `Response` objects and should be left alone
- **CI integration.** If a CI gate is added later, decide what level of test failure should block merges

## Effort

**~2 days.**

| Day | Work |
|-----|------|
| 1   | Mock helper + `clientFetch` defensive change + first-pass migration via subagent |
| 2   | Triage remaining failures, fix or quarantine, document baseline + write `__tests__/README.md` |

## Acceptance

- `npx jest --silent` finishes with **0 failed suites**
- Pre-existing TS errors in `copilotContext.test.ts` and `dgidb.test.ts` are resolved
- Mock pattern documented in `__tests__/README.md` so new tests don't reintroduce the crash
- `clientFetch.ts` no longer crashes on a `Response` lacking a `headers` object
