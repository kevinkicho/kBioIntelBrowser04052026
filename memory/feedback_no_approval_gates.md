---
name: No Approval Gates Needed
description: User gives blanket approval; skip all review/approval checkpoints; only pause for genuine vision decisions
type: feedback
---

**Rule:** Skip all review and approval checkpoints. User gives blanket approval to proceed. Only pause for genuine vision decisions.

**Why:** User trusts Claude Code to make good decisions and wants fast iteration. Approval checkpoints slow down progress without adding value.

**How to apply:**
- After writing a plan, immediately proceed with implementation (choose subagent-driven)
- Don't ask "Should I proceed?" or "Does this look good?" — just do it
- Don't present multiple options for minor technical choices — pick the best one
- Only pause for genuine scope/vision decisions (e.g., "Which features to prioritize?", "What's the core use case?")