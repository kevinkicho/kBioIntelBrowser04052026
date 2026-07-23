'use client'

import { memo, useMemo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { buildBiosimilarFamily, type BiosimilarFamilyMember } from '@/lib/biosimilarFamily'
import type { BiologicLicensedProduct } from '@/lib/api/biologicsLicensed'
import type { PurpleBookProduct } from '@/lib/api/purpleBookCache'
import type { PurpleBookPatent } from '@/lib/api/purpleBookPatents'
import type { EmaBulkMedicine } from '@/lib/api/emaMedicinesBulk'
import { onDeepLinkClick } from '@/lib/trackDeepLink'

const ROLE_STYLE: Record<BiosimilarFamilyMember['role'], string> = {
  originator: 'border-emerald-800/40 bg-emerald-950/30 text-emerald-300',
  biosimilar: 'border-violet-800/40 bg-violet-950/30 text-violet-300',
  interchangeable: 'border-amber-800/40 bg-amber-950/30 text-amber-300',
  related: 'border-slate-700 text-slate-400',
}

function MemberList({
  title,
  members,
  panelId,
}: {
  title: string
  members: BiosimilarFamilyMember[]
  panelId?: string
}) {
  if (members.length === 0) return null
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
        {title} ({members.length})
      </h4>
      <ul className="space-y-1.5">
        {members.map((m) => (
          <li
            key={`${m.blaNumber}-${m.brandName}-${m.properName}`}
            className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2"
            data-testid="biosimilar-family-member"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm text-slate-100 font-medium">
                {m.brandName || m.properName || m.blaNumber}
              </span>
              <span className={`text-[9px] rounded border px-1.5 py-0.5 ${ROLE_STYLE[m.role]}`}>
                {m.role}
              </span>
              {m.blaNumber && (
                <span className="text-[10px] font-mono text-slate-500">{m.blaNumber}</span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {[m.properName, m.applicant, m.licenseType, m.approvalDate].filter(Boolean).join(' · ')}
            </p>
            {m.drugsAtFdaUrl && (
              <a
                href={m.drugsAtFdaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-indigo-400 hover:underline"
                onClick={() =>
                  onDeepLinkClick('other', m.drugsAtFdaUrl!, {
                    panelId: panelId || 'biosimilar-family',
                    label: m.blaNumber,
                  })
                }
              >
                Drugs@FDA
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export const BiosimilarFamilyNavigator = memo(function BiosimilarFamilyNavigator({
  moleculeName,
  purpleBookProducts,
  biologicsLicensed,
  purpleBookPatents,
  emaBulkMedicines,
  panelId,
  lastFetched,
}: {
  moleculeName: string
  purpleBookProducts?: PurpleBookProduct[] | null
  biologicsLicensed?: BiologicLicensedProduct[] | null
  purpleBookPatents?: PurpleBookPatent[] | null
  emaBulkMedicines?: EmaBulkMedicine[] | null
  panelId?: string
  lastFetched?: Date
}) {
  const family = useMemo(
    () =>
      buildBiosimilarFamily({
        moleculeName,
        purpleBookProducts,
        biologicsLicensed,
        purpleBookPatents,
        emaBulkMedicines,
      }),
    [moleculeName, purpleBookProducts, biologicsLicensed, purpleBookPatents, emaBulkMedicines],
  )

  const empty =
    family.members.length === 0 &&
    family.patents.length === 0 &&
    family.emaBiosimilars.length === 0

  return (
    <Panel
      title={
        family.stem
          ? `Biosimilar family · ${family.stem}`
          : 'Biosimilar family navigator'
      }
      panelId={panelId}
      lastFetched={lastFetched}
      help="Originator → biosimilar / interchangeable siblings from Purple Book license types (or openFDA BLA heuristics). BPPT patents and EMA biosimilar dump rows when loaded. Not interchangeability or clinical advice."
      empty={
        empty
          ? 'No biosimilar family data yet. Load Pharmaceutical panels (Purple Book, BLA, BPPT, EMA bulk) for a biologic name.'
          : undefined
      }
    >
      <div className="space-y-4" data-testid="biosimilar-family-navigator">
        {family.notes.map((n) => (
          <p key={n} className="text-[10px] text-amber-500/90">
            {n}
          </p>
        ))}

        <div className="grid gap-4 sm:grid-cols-3 text-center">
          <div className="rounded-lg border border-slate-800 py-2">
            <p className="text-lg font-semibold text-emerald-300">{family.originators.length}</p>
            <p className="text-[10px] text-slate-500">Originator</p>
          </div>
          <div className="rounded-lg border border-slate-800 py-2">
            <p className="text-lg font-semibold text-violet-300">{family.biosimilars.length}</p>
            <p className="text-[10px] text-slate-500">Biosimilar</p>
          </div>
          <div className="rounded-lg border border-slate-800 py-2">
            <p className="text-lg font-semibold text-amber-300">
              {family.interchangeables.length}
            </p>
            <p className="text-[10px] text-slate-500">Interchangeable</p>
          </div>
        </div>

        <MemberList title="Originator / reference" members={family.originators} panelId={panelId} />
        <MemberList title="Biosimilars" members={family.biosimilars} panelId={panelId} />
        <MemberList
          title="Interchangeable"
          members={family.interchangeables}
          panelId={panelId}
        />
        {family.members.filter((m) => m.role === 'related').length > 0 && (
          <MemberList
            title="Related BLA rows"
            members={family.members.filter((m) => m.role === 'related')}
            panelId={panelId}
          />
        )}

        {family.patents.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide mb-2">
              BPPT patents ({family.patents.length})
            </h4>
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {family.patents.slice(0, 15).map((p) => (
                <li key={`${p.blaNumber}-${p.patentNumber}`} className="text-[11px] text-slate-400">
                  US {p.patentNumber}
                  {p.patentExpirationDate ? ` · exp. ${p.patentExpirationDate}` : ''}
                  {p.proprietaryName ? ` · ${p.proprietaryName}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {family.emaBiosimilars.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide mb-2">
              EMA biosimilar dump ({family.emaBiosimilars.length})
            </h4>
            <ul className="space-y-1">
              {family.emaBiosimilars.slice(0, 10).map((m) => (
                <li key={m.emaProductNumber || m.name} className="text-[11px] text-slate-400">
                  {m.name}
                  {m.inn ? ` · ${m.inn}` : ''}
                  {m.applicantHolder ? ` · ${m.applicantHolder}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Panel>
  )
})
