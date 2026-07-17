# Agent activity logs (local only)

JSONL activity streams for coding agents and local debugging.

## Files

```text
logs/agent-activity-YYYY-MM-DD.jsonl
```

Each line is one JSON object:

```json
{
  "ts": "2026-07-16T12:00:00.000Z",
  "name": "product.discover_started",
  "level": "info",
  "sessionId": "loc_…",
  "source": "product",
  "props": { "q": "ATTR" },
  "serverReceivedAt": "2026-07-16T12:00:00.010Z"
}
```

## Privacy

- **`*.jsonl` is gitignored** — do not commit logs (may include local queries / CIDs).
- This folder’s `README.md` is tracked; log data is not.
- Disable: `AGENT_ACTIVITY_LOG=0` or `NEXT_PUBLIC_AGENT_LOG=0`
- Force on (e.g. staging): `AGENT_ACTIVITY_LOG=1` and `NEXT_PUBLIC_AGENT_LOG=1`

## How agents review

```powershell
# Tail today's log
Get-Content logs/agent-activity-$((Get-Date).ToString('yyyy-MM-dd')).jsonl -Tail 50

# Filter by name
Select-String -Path logs/*.jsonl -Pattern "profile.cache|product\." | Select-Object -Last 30
```

## Sources

| `name` prefix | Origin |
|---------------|--------|
| `product.*` | `emitProductEvent` |
| `fetch.*` | `clientFetch` (dev) |
| `profile.cache.*` | revisit cache hit/miss |
| `profile.load.*` | category load path |

API: `POST /api/agent-log` with `{ "events": [ … ] }`.
