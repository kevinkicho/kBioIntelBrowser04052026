/**
 * Shared product-law bullets for wiring catalog, research playbooks, and UI.
 * Single source — do not duplicate prose in multiple catalogs.
 */

export const PRODUCT_LAW_BULLETS = [
  'Free public APIs only (no paid DBs as product requirements).',
  'Evidence-first; no regulatory decision support language.',
  'Discover ranking is deterministic — never LLM in the rank path.',
  'AI is claim-bound on packs / research hypotheses and evidence-gated on profile copilot.',
  'Solo + local export default; share optional.',
] as const

export type ProductLawBullet = (typeof PRODUCT_LAW_BULLETS)[number]
