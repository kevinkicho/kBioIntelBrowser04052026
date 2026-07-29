# Tests

## Running

```sh
npm run test:precommit              # **before every commit** — tsc + capability + of-record suites
npm run test:precommit:full         # + broader component smoke
npm run test:capabilities           # inventory + brittleness only
npm run test:brittle                # React-safe / expand / data-hub UI
npm run test:gate                   # alias-style gate used in CI notes
npx jest                            # full suite (long)
npx jest path/to/some.test.ts       # one file
npx jest --testPathPatterns=lib     # all under __tests__/lib
```

## Layers

| Layer | What | Command |
|-------|------|---------|
| **Typecheck** | No TS / JSX contract break | `npx tsc --noEmit` |
| **Full-app inventory** | Every category card, provenance, diagnostics, chrome, routes | `npm run test:full-app` (`__tests__/fullApp/*`) |
| **Capability inventory** | Critical files + of-record builders still wired | `__tests__/capabilities/productCapabilities.test.ts` |
| **Brittleness** | React #31, expand UI, data hub layout, empty coverage | `test:brittle` |
| **Of-record product** | Discover rank, packs, events, hub builders | `test:gate` / `test:precommit` |
| **E2E full surface** | All major routes + molecule chrome + runtime-config | `test:e2e:full-app` |
| **E2E fixture** | North-star loop + data hub coverage | `test:e2e:fixture:auto` |

### Full-app suite (`__tests__/fullApp/`)

| File | Covers |
|------|--------|
| `01-inventory-integrity` | 139 panels resolve to components; routes exist; lazyPanels count |
| `02-panel-chrome-and-sources` | Panel empty badge, tier badges, source footer |
| `03-api-and-ai-provenance` | `ApiProvenanceChip`, `AiContentProvenance`, PROMPT_CATALOG no rank |
| `04-diagnostics-and-availability` | Request metrics, SourceStatusStrip, sourceAvailability, runtime-config |
| `05-chrome-buttons-and-routes` | Cite/Share/Export files, testids, AGENTS product law |
| `06-panel-empty-render.smoke` | Mount every profile panel with empty props (React crash net) |
| `07-panel-loaded-render.smoke` | Key cards with loaded fixtures (ChEMBL, CT.gov, HC, OpenAIRE, …) |

Inventory SSOT: `src/lib/fullAppCoverage/inventory.ts`.  
**Catalog law:** every `CATEGORIES` panel id must have `panelSources` (`api` + `docs`) — zero allowlist.

**Husky** (after `npm install`): `.husky/pre-commit` → `npm run test:precommit`. Skip: `SKIP_PRECOMMIT=1`.  
**CI:** `.github/workflows/precommit.yml` on push/PR; `.github/workflows/e2e-nightly.yml` for route surface.

New free-API DTO fields rendered in JSX **must** use `safeDisplayString` from `src/lib/reactSafe.ts` (or extract strings in the API mapper). Nested objects as React children throw minified error #31.

## Mocking `fetch`

**Don't** hand-roll mock responses with `Promise.resolve({ ok: true, json: () => ... })`. Those objects lack `headers`, which crashes anything that goes through `src/lib/clientFetch.ts` (it calls `response.headers.get('content-length')`).

**Do** use the helpers in `__tests__/utils/mockFetch.ts`:

```ts
import { mockFetch, mockJsonResponse } from '../utils/mockFetch'

test('happy path', async () => {
  mockFetch((url) => {
    if (url.includes('/api/foo')) return { foo: 1 }
    if (url.includes('/api/bar')) return mockJsonResponse({ err: 'x' }, { status: 500 })
    throw new Error('Unexpected URL: ' + url)
  })
  // ... your test
})
```

Or, for tests already using `jest-fetch-mock` (it's enabled globally in `jest.setup.js`), continue using that — its `fetchMock.mockResponseOnce(JSON.stringify(...))` produces real `Response` objects and works correctly with `clientFetch`.

## Polyfills

`jest.setup.js` polyfills `Response.json()` (a static method added to the Fetch spec in 2022 that jsdom doesn't provide). Without this, every test that calls `NextResponse.json(...)` crashes with `TypeError: Response.json is not a function`.

## Conventions

- Tests live in `__tests__/` mirroring the `src/` tree (`src/lib/foo.ts` → `__tests__/lib/foo.test.ts`)
- Component tests use `@testing-library/react` patterns — see existing tests for examples
- Schema-as-test assertions (e.g., "the project has N categories") are intentional but high-maintenance — when you change the schema, update the test in the same commit
