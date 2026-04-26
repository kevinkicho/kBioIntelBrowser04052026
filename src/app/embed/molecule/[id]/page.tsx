import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getMoleculeById } from '@/lib/api/pubchem'
import { buildStructureImageUrl } from '@/lib/utils'
import { ProfilePageClient } from '@/app/molecule/[id]/ProfilePageClient'

/**
 * Embed entry for /embed/molecule/[id]?panels=summary,structure,clinical-trials
 *
 * The render delegates to the canonical ProfilePageClient with `embedMode` set.
 * The client-side component:
 *   - Hides the sticky header (CategoryTabBar / ViewToggle / ExportButton / CiteButton / ShareButton)
 *   - Hides the breadcrumb, NextStepsPanel, ChangeAlerts, ResearchBrief, SimilarMolecules,
 *     InsightsSection, PipelinePanel, VendorsPanel, GeneTargetStrip
 *   - Hides the AICopilot floating fab
 *   - Filters the rendered panel grid to the `panels` allowlist (synthetic ids:
 *     'summary' = top MoleculeSummary card; everything else = a panel id from
 *     `src/lib/categoryConfig.ts` (e.g. 'companies', 'clinical-trials', 'pdb',
 *     'structure' is treated as 'pdb' / structure viewer panels — see below)
 *   - Renders a small floating "View full profile →" link bottom-right
 *
 * Available panel ids (allowlist) — these correspond to entries in CATEGORIES.panels[].id
 * in `src/lib/categoryConfig.ts`. The two synthetic ids:
 *   - 'summary'   → renders the top MoleculeSummary card
 *   - 'structure' → renders the 'pdb' / 'alphafold' panels (alias for structure category)
 * Everything else is a panel id literal (companies, ndc, clinical-trials, adverse-events,
 * chembl, bioassay, uniprot, pdb, gene-info, ensembl, reactome, patents, pubmed, etc.).
 *
 * Default panels (when no `?panels=` query string): ['summary', 'structure']
 */

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const cid = parseInt(params.id, 10)
  if (isNaN(cid)) return { title: 'BioIntel Embed' }
  const molecule = await getMoleculeById(cid).catch(() => null)
  if (!molecule) return { title: 'BioIntel Embed' }
  const title = `${molecule.name} · BioIntel Embed`
  const desc = (molecule.iupacName || molecule.description || '').slice(0, 160)
  const image = buildStructureImageUrl(cid)
  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: [{ url: image }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [image],
    },
  }
}

const STRUCTURE_PANEL_ALIAS = ['pdb', 'pdbe-ligands', 'alphafold']

function expandPanels(raw: string | undefined | null): string[] {
  const requested = (raw ?? 'summary,structure')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  // Expand 'structure' synthetic id into structure-related panel ids
  const out = new Set<string>()
  for (const id of requested) {
    if (id === 'structure') {
      out.add('structure') // keep for hint purposes (no panel uses this id directly)
      for (const a of STRUCTURE_PANEL_ALIAS) out.add(a)
    } else {
      out.add(id)
    }
  }
  return Array.from(out)
}

export default async function EmbedMoleculePage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { panels?: string }
}) {
  const cid = parseInt(params.id, 10)
  if (isNaN(cid)) notFound()

  const molecule = await getMoleculeById(cid)
  if (!molecule) notFound()

  const allowedPanels = expandPanels(searchParams.panels)

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col">
      <main className="flex-1 px-4 sm:px-6 py-4">
        <ProfilePageClient
          cid={cid}
          moleculeName={molecule.name}
          molecularWeight={molecule.molecularWeight}
          inchiKey={molecule.inchiKey}
          iupacName={molecule.iupacName}
          embedMode={{ allowedPanels }}
        />
      </main>
    </div>
  )
}
