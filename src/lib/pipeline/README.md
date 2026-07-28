# Pipeline package — reliability adapters

**Role:** thin reliability shell (timeouts, retries, stage reports, concurrency) around **domain** code in `src/lib/discovery/*` and `src/lib/project/*`.

**Not:** a second Discover rank engine. Of-record scoring stays in `discovery/engine.ts` + `scoreAxes.ts`.

| Module | Wraps / purpose |
|--------|-----------------|
| `runStage.ts` | Core stage primitive |
| `discoverRankClient.ts` | Client rank POST + cache |
| `discoverHarvestClient.ts` | Deferred safety harvest |
| `orphanetPinPipeline.ts` | Rare-disease gene pins |
| `packExtractPipeline.ts` | Pack claim extract reporting |
| `packAiValidatePipeline.ts` | Claim-allowlist AI validation |
| `similarityExpandPipeline.ts` | PubChem similarity expand |
| `copilotToolPipeline.ts` | Allowlisted copilot tool timeout |
| `categoryFetchScheduler.ts` | Profile category concurrency |
| `requestMetrics.ts` | Operator request telemetry |

Import densify budgets from `@/lib/discovery/densifyBudgets` (not via pipeline barrel long-term).

**Product law:** no LLM in of-record rank; free public APIs only; pack ≤5 extractors.
