import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'How we present data · BioIntel',
  description:
    'Methodology for BioIntel of-record multi-source data presentation: free public APIs, provenance, data hub layers, and honesty rules for research use.',
}

const LAYERS = [
  {
    name: 'Data hub ledger',
    ofRecord: true,
    desc: 'Fact · Value · Source · Open rows built only from retrieved free public API payloads. Never model-generated narrative.',
  },
  {
    name: 'Source directory',
    ofRecord: true,
    desc: 'Per-source coverage for the current entity: how many facts this session has from each free API, with docs links.',
  },
  {
    name: 'Siloed panels',
    ofRecord: true,
    desc: 'One API → one card/table. Multi-source analysis uses strips or the data hub — not merged tables that blur provenance.',
  },
  {
    name: 'Claims & evidence packs',
    ofRecord: true,
    desc: 'Extractor statements with provenance.source (and sourceUrl / retrievedAt when available). Pack AI must stay claim-bound.',
  },
  {
    name: 'Derived assistive views',
    ofRecord: false,
    desc: 'Charts, next-steps digests, optional copilot. Always labeled non-of-record. Do not replace primary sources.',
  },
  {
    name: 'Discover ranks',
    ofRecord: true,
    desc: 'Deterministic multi-axis scores over free-API features. No LLM in the rank path.',
  },
] as const

const RULES = [
  {
    title: 'Never invent values',
    body: 'Missing fields show as “—”. Empty or timeout is not rewritten as zero association.',
  },
  {
    title: 'Every non-empty fact names a source',
    body: 'Human-readable free public source label. Deep links must be stable registry URLs, not homepage SPA shells.',
  },
  {
    title: 'Session samples ≠ universe counts',
    body: 'Hit counts reflect what loaded on this page session. Refresh re-queries. Do not cite as complete literature review counts.',
  },
  {
    title: 'Spontaneous reports are not incidence',
    body: 'FAERS and similar rows are report tallies, not rates or causal conclusions.',
  },
  {
    title: 'No regulatory decision support language',
    body: 'We surface public-register fields (e.g. Orange Book application numbers). We do not say “approved for use in…” as product advice.',
  },
  {
    title: 'AI is optional and claim-bound',
    body: 'Copilot / pack AI may rephrase only over retrieved claims and allowlisted tools. Sparse evidence refuses deep synthesis.',
  },
] as const

const EXPORTS = [
  {
    name: 'Data hub CSV / TSV',
    use: 'Spreadsheet or notebook import of Fact · Value · Source columns for one entity.',
  },
  {
    name: 'Research kit',
    use: 'Multi-file: hub CSV, sources.json, optional claims.md, README, manifest — lab notebook starter pack.',
  },
  {
    name: 'Compare data hub CSV / TSV',
    use: 'Side-by-side matrix across 2–4 CIDs for the same fact ids.',
  },
  {
    name: 'Evidence pack JSON / MD',
    use: 'Claim-bound board packs with content hash for cite/share workflows.',
  },
  {
    name: 'API sources manifest',
    use: 'docs/api-sources-manifest.json — name, org, docs URL, endpoint for all free sources.',
  },
] as const

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-[#0f1117] text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <Link href="/" className="hover:text-slate-300">
            Home
          </Link>
          <span>/</span>
          <span className="text-slate-300">How we present data</span>
        </nav>

        <header className="mb-8">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
            Methodology
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
            How BioIntel presents public research data
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            BioIntel is a free multi-source <strong className="font-medium text-slate-300">research data hub</strong> for
            small molecules, targets, and diseases. This page is the citable description of how we show facts,
            provenance, and limits — for lab notebooks, grant appendices, and collaborators.
          </p>
          <p className="mt-2 text-[11px] text-slate-500">
            Not for clinical or regulatory decision support. Verify every deep link in the primary registry before
            wet-lab or formal submission use.
          </p>
        </header>

        <section className="mb-8 rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-slate-100">Product law (binding)</h2>
          <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-slate-400">
            <li>
              <span className="font-medium text-slate-200">Free public APIs only</span> — no paid commercial compound
              databases as product requirements.
            </li>
            <li>
              <span className="font-medium text-slate-200">Evidence-first</span> — retrieved data and citations; empty
              means not retrieved, not “no association.”
            </li>
            <li>
              <span className="font-medium text-slate-200">Deterministic Discover rank</span> — no LLM in the of-record
              score path.
            </li>
            <li>
              <span className="font-medium text-slate-200">Solo + file export default</span> — localStorage / IndexedDB /
              download; cloud is optional.
            </li>
            <li>
              <span className="font-medium text-slate-200">Claim-bound optional AI</span> — packs and copilot cite
              allowlisted evidence only.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-slate-100">Presentation layers</h2>
          <div className="space-y-2">
            {LAYERS.map((layer) => (
              <div
                key={layer.name}
                className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[13px] font-medium text-slate-100">{layer.name}</h3>
                  <span
                    className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${
                      layer.ofRecord
                        ? 'border-emerald-800/50 bg-emerald-950/40 text-emerald-300'
                        : 'border-amber-800/40 bg-amber-950/30 text-amber-200'
                    }`}
                  >
                    {layer.ofRecord ? 'of-record' : 'not of-record'}
                  </span>
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-slate-400">{layer.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-slate-100">Honesty rules</h2>
          <dl className="space-y-3">
            {RULES.map((r) => (
              <div key={r.title} className="border-l-2 border-indigo-800/50 pl-3">
                <dt className="text-[13px] font-medium text-slate-200">{r.title}</dt>
                <dd className="mt-0.5 text-[12px] leading-relaxed text-slate-400">{r.body}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mb-8 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="text-sm font-semibold text-slate-100">Saved research view (local)</h2>
          <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
            On molecule Research view and Data hub headers you can pin which tables and domains stay visible,
            set default profile view (Research vs Panels), hide empty facts, and choose rows-per-table. Preferences
            live only in this browser (<code className="text-slate-500">biointel-research-view-prefs-v1</code>) —
            solo-local product law, not a multi-tenant cloud profile.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-slate-100">Exports for research</h2>
          <ul className="space-y-2">
            {EXPORTS.map((e) => (
              <li
                key={e.name}
                className="rounded-lg border border-slate-800/80 bg-slate-900/30 px-3 py-2 text-[12px]"
              >
                <span className="font-medium text-slate-200">{e.name}</span>
                <span className="text-slate-500"> — {e.use}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="text-sm font-semibold text-slate-100">Where to look in the product</h2>
          <ul className="mt-3 space-y-1.5 text-[13px] text-slate-400">
            <li>
              <Link href="/molecule/2244" className="text-indigo-300 hover:underline">
                Molecule profile
              </Link>
              {' — '}Data hub, Research view, Research kit export
            </li>
            <li>
              <Link href="/compare?a=2244&b=4091" className="text-indigo-300 hover:underline">
                Compare
              </Link>
              {' — '}Side-by-side data hub matrix
            </li>
            <li>
              <Link href="/discover" className="text-indigo-300 hover:underline">
                Discover
              </Link>
              {' — '}Mini research facts on candidate cards (rank remains deterministic)
            </li>
            <li>
              <Link href="/how-it-works" className="text-indigo-300 hover:underline">
                How it works
              </Link>
              {' — '}Algorithms, prompts, local funnel
            </li>
            <li>
              <Link
                href="https://github.com/kevinkicho/kBioIntelBrowser04052026/blob/main/docs/api-sources-manifest.md"
                className="text-indigo-300 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                API sources manifest
              </Link>
              {' — '}Full free-API name / docs / endpoint list
            </li>
          </ul>
        </section>

        <section className="mb-4 text-[11px] leading-relaxed text-slate-600">
          <p>
            Design SSOT: <code className="text-slate-500">docs/design/data-hub-presentation.md</code>,{' '}
            <code className="text-slate-500">docs/design/list-deep-links-and-empty-data.md</code>, discovery workbench
            v1–v2.1. Software is open for educational and research purposes; upstream databases retain their own
            licenses and terms.
          </p>
        </section>
      </div>
    </main>
  )
}
