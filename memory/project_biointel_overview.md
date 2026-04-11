---
name: BioIntel Explorer overview
description: Complete technical reference: 75+ APIs, 70+ panels, architecture patterns, common issues, how-to-add-new-API guide
type: project
---

**Why:** BioIntel Explorer is a comprehensive molecule exploration platform aggregating data from 75+ free public APIs across 8 categories.

**How to apply:** Use this as the authoritative reference for:
- Architecture: Next.js 14 App Router, React 19, TypeScript, Tailwind CSS
- API integration patterns: See existing API clients in `src/lib/api/*.ts`
- Panel components: See `src/components/profile/*Panel.tsx`
- Category structure: See `src/lib/categoryConfig.ts`
- Lazy loading: See `src/lib/lazyPanels.tsx`

**Key patterns:**
- Each API has a client in `src/lib/api/[api-name].ts`
- Each panel has a component in `src/components/profile/[PanelName]Panel.tsx`
- Categories are defined in `src/lib/categoryConfig.ts`
- API limits are centralized in `src/lib/api-limits.ts`
- Data freshness indicators in `src/lib/dataFreshness.ts`

**Adding a new API:**
1. Create client in `src/lib/api/[name].ts`
2. Add types in `src/lib/types.ts`
3. Create panel in `src/components/profile/[Name]Panel.tsx`
4. Add lazy panel in `src/lib/lazyPanels.tsx`
5. Add panel config in `src/lib/categoryConfig.ts`
6. Add freshness config in `src/lib/dataFreshness.ts`
7. Add API limit in `src/lib/api-limits.ts`
8. Wire into category route in `src/app/api/molecule/[id]/category/[categoryId]/route.ts`
9. Add panel renderer in `src/app/molecule/[id]/ProfilePageClient.tsx`