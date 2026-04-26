# 07 — Shareable Links & Embed Widget

## Why

Today, finding something interesting in BioIntel means **screenshotting it**. There's no first-class way to share a profile in Slack, drop one into a paper draft, or embed one in a class lecture portal.

A first-class share button + embed widget gives the work **reach** with very little engineering cost — the underlying pages already work as deep links (`/molecule/2244`, `/gene/...`, `/disease/...`).

## Scope (v1)

1. **Share button** in the profile header (molecule, gene, disease pages):
   - "Copy link" — current canonical URL
   - "Copy snapshot link" — depends on plan #02 (Citation export) being shipped
2. **Embed widget**:
   - `<iframe src="https://yourapp/embed/molecule/2244?panels=summary,structure">` renders a clean, scaled-down view
   - Embed mode hides nav, footer, AI copilot, and shows only the requested panels
   - Embed adds a small "View full profile →" link back to the canonical URL
3. **Open Graph + Twitter Card meta** so shared links generate rich link previews on Slack / Discord / Twitter / iMessage

**Out of scope for v1:** privacy controls on snapshots, signed embeds, embed analytics, custom embed branding, OAuth-gated sharing.

## Approach

### Share button

Trivial. Two `navigator.clipboard.writeText(url)` calls behind a small dropdown. Snapshot link option is disabled / hidden if plan #02 isn't shipped yet.

### Embed pages

A new route group `app/embed/` mirroring the existing detail-page routes:

- `app/embed/molecule/[id]/page.tsx`
- `app/embed/gene/[id]/page.tsx`
- `app/embed/disease/[id]/page.tsx`

Each reuses the existing detail components but wraps them in `EmbedShell` instead of the full app shell. The shell:

- No `<header>` nav
- No `<footer>`
- No `AICopilot`
- No favorites / watchlist hooks
- Reads `?panels=` query string to choose which panels to render
- Adds a small floating "View full profile →" link in the corner

### Open Graph metadata

Server-rendered `<meta property="og:..." />` tags via Next.js `generateMetadata`:

- `og:title` — entity name
- `og:description` — short summary (e.g., for molecule, the IUPAC name + key targets)
- `og:image` — for molecules, the existing PubChem structure thumbnail; for genes/diseases, a static placeholder image
- `twitter:card` set to `summary_large_image`

## File-level changes

- `src/app/embed/molecule/[id]/page.tsx`
- `src/app/embed/gene/[id]/page.tsx`
- `src/app/embed/disease/[id]/page.tsx`
- `src/components/embed/EmbedShell.tsx` — minimalist app shell
- `src/components/profile/ShareButton.tsx` — copy-link UI
- Modify `src/app/molecule/[id]/page.tsx` to add `generateMetadata` for OG tags
- Mirror `generateMetadata` in `gene/` and `disease/` server pages
- Wire `ShareButton` into profile headers next to `ExportButton` and `CiteButton`

## Risks & open questions

- **Embed CSS isolation.** `iframe` provides this naturally, but the host page can still `postMessage` into the embed. v1 doesn't accept any `postMessage` events; lock down via CSP if any state ever needs to flow out
- **Snapshot links (plan #02) need to ship first** for "copy snapshot link" to be useful. Without snapshots, embed content can drift if APIs change
- **OG image generation.** v1 uses static images (PubChem structure thumbnail for molecules, placeholders for gene/disease). v2 could generate dynamic OG images using `@vercel/og` or a similar runtime
- **Bot traffic.** Shared links get crawled by every messaging platform. Confirm public APIs handle the hit; add a basic rate limit if needed
- **Embed mode and embed-only panels.** Some panels (`AICopilot`, `ChangeAlerts`, `ExportButton`) shouldn't appear in embeds — explicit allowlist rather than denylist

## Effort

**~2 days.**

| Day | Work |
|-----|------|
| 1   | Embed pages + `EmbedShell` + panel allowlist |
| 2   | `ShareButton` + OG / Twitter Card metadata + manual test on Slack / Discord / Twitter |

## Acceptance

- Embed iframe at `/embed/molecule/2244?panels=summary,structure` renders cleanly with no nav, footer, or copilot
- "View full profile →" link in the corner navigates to the canonical URL
- Share button copies the canonical URL with a brief toast confirmation
- Slack, Discord, Twitter, iMessage previews show molecule name + structure thumbnail
- OG metadata is server-rendered (visible in `view-source:`), not client-rendered
- No regression in canonical detail pages (same components are reused)
