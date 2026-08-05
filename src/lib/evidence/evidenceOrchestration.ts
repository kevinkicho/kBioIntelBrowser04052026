/**
 * Lightweight evidence orchestration (v3 H3) — pure next-step planner.
 * Does not fetch; ranks free-API surfaces to raise loop finish rate.
 * Of-record path only; AI never invents panels.
 */

export type OrchestrationGoal =
  | 'shortlist'
  | 'evidence_depth'
  | 'safety'
  | 'pack'
  | 'monday'
  | 'rare'
  | 'compare'

export interface OrchestrationStep {
  id: string
  title: string
  href: string
  /** Why this step raises finish rate */
  why: string
  freeApiHint?: string
  optional?: boolean
}

export interface OrchestrationPlan {
  goal: OrchestrationGoal
  title: string
  steps: OrchestrationStep[]
  lawReminders: string[]
}

/**
 * Suggest ordered next steps for a scientific goal.
 * Prefer finish-rate steps over breadth (product recommendation).
 */
export function planEvidenceOrchestration(
  goal: OrchestrationGoal,
  opts?: {
    diseaseQuery?: string
    targets?: string[]
    cid?: number | string | null
    projectId?: string | null
  },
): OrchestrationPlan {
  const q = (opts?.diseaseQuery || '').trim()
  const targets = (opts?.targets || []).filter(Boolean)
  const cid = opts?.cid != null && String(opts.cid).length > 0 ? String(opts.cid) : null
  const discoverQ = q
    ? `/discover?q=${encodeURIComponent(q)}${targets.length ? `&targets=${targets.map(encodeURIComponent).join(',')}` : ''}`
    : '/discover'
  const mol = cid ? `/molecule/${encodeURIComponent(cid)}?view=research` : null
  const board = opts?.projectId ? `/projects/${encodeURIComponent(opts.projectId)}` : '/projects'

  const law = [
    'Free public APIs only',
    'No LLM in Discover rank path',
    'Not clinical or regulatory decision support',
  ]

  switch (goal) {
    case 'shortlist':
      return {
        goal,
        title: 'Disease → shortlist (finish rate)',
        steps: [
          {
            id: 'resolve',
            title: 'Confirm disease + pins',
            href: discoverQ,
            why: 'Identity first — multi-hit confirm before rank',
            freeApiHint: 'Open Targets · Orphanet',
          },
          {
            id: 'rank',
            title: 'Deterministic rank',
            href: discoverQ,
            why: 'Of-record shortlist; M7 cheap path',
          },
          {
            id: 'save',
            title: 'Save ≥1 candidate',
            href: board,
            why: 'Board is required for pack loop',
          },
        ],
        lawReminders: law,
      }
    case 'evidence_depth':
      return {
        goal,
        title: 'CID evidence depth',
        steps: [
          {
            id: 'profile',
            title: 'Open research view',
            href: mol || '/molecule/2244?view=research',
            why: 'Data hub of-record facts first',
          },
          {
            id: 'core',
            title: 'Load Core categories',
            href: mol || '/molecule/2244',
            why: 'Close empty/timeout honestly',
            freeApiHint: 'ChEMBL · CT.gov · FAERS',
          },
          {
            id: 'kit',
            title: 'Export research kit',
            href: mol || '/molecule/2244?view=research',
            why: 'Content-hash handoff for re-open',
          },
        ],
        lawReminders: law,
      }
    case 'safety':
      return {
        goal,
        title: 'Safety triangulation',
        steps: [
          {
            id: 'safety-cat',
            title: 'Clinical & safety category',
            href: mol || '/molecule/2244',
            why: 'FAERS + recalls + labels samples',
            freeApiHint: 'openFDA · DailyMed · PubChem',
          },
          {
            id: 'tri',
            title: 'Read triangulation section',
            href: mol ? `${mol}` : '/molecule/2244?view=research',
            why: 'Session coverage — not risk score',
          },
          {
            id: 'pack-safety',
            title: 'Pack with safety extractors',
            href: board,
            why: 'Preserve subjectCandidateId; max 5 panels',
          },
        ],
        lawReminders: [...law, 'Empty FAERS ≠ safe forever'],
      }
    case 'pack':
      return {
        goal,
        title: 'Board → pack → RH',
        steps: [
          {
            id: 'promote',
            title: 'Promote candidates',
            href: board,
            why: 'Promote-only harvest (watching does not)',
          },
          {
            id: 'export',
            title: 'Export claim-rich pack',
            href: board,
            why: 'Citation completeness soft gate (M3)',
          },
          {
            id: 'rh',
            title: 'Seed research hypothesis',
            href: board,
            why: 'Claim-bound RH; rehydrate from IDB',
          },
        ],
        lawReminders: law,
      }
    case 'monday':
      return {
        goal,
        title: 'Monday experiment handoff',
        steps: [
          {
            id: 'monday-pack',
            title: 'Download Monday pack',
            href: mol || '/methodology',
            why: 'Kit + agenda + honesty in one JSON',
          },
          {
            id: 'library',
            title: 'Pick library experiment',
            href: '/campaign',
            why: 'Templates raise finish rate over ad-hoc thrash',
          },
          {
            id: 'verify',
            title: 'Verify primary sources',
            href: '/methodology#honesty',
            why: 'User verifies before wet-lab / grant',
            optional: true,
          },
        ],
        lawReminders: law,
      }
    case 'rare':
      return {
        goal,
        title: 'Rare-disease depth',
        steps: [
          {
            id: 'orpha',
            title: 'Orphanet pins + rank',
            href: discoverQ.includes('q=') ? discoverQ : '/discover?q=ATTR%20amyloidosis',
            why: 'Gene pins; honest sparse empties',
            freeApiHint: 'Orphanet · Open Targets',
          },
          {
            id: 'neg',
            title: 'Negative evidence in hub',
            href: mol || '/campaign',
            why: 'Empty ≠ no association forever',
          },
          {
            id: 'pack-rare',
            title: 'Sparse-evidence pack / RH',
            href: board,
            why: 'AI refuses if claim-thin',
          },
        ],
        lawReminders: [...law, 'No invented gene–disease links'],
      }
    case 'compare':
      return {
        goal,
        title: 'Compare & choose',
        steps: [
          {
            id: 'open-set',
            title: 'Open 2+ profiles',
            href: '/compare',
            why: 'Session set for side-by-side hub',
          },
          {
            id: 'hub',
            title: 'Compare hub facts',
            href: '/compare',
            why: 'Of-record only — AI views labeled non-of-record',
          },
          {
            id: 'decide',
            title: 'Promote winner on board',
            href: board,
            why: 'Human status change — no silent AI promote',
          },
        ],
        lawReminders: law,
      }
    default:
      return {
        goal: 'shortlist',
        title: 'Default shortlist loop',
        steps: [
          {
            id: 'discover',
            title: 'Discover',
            href: '/discover',
            why: 'Start of-record loop',
          },
        ],
        lawReminders: law,
      }
  }
}
