'use client'

import type { ReactNode } from 'react'
import type { EvidencePack } from '@/lib/evidence'
import { MAX_PACK_CLAIMS } from '@/lib/evidence'
import {
  claimProvenanceDeepLink,
  claimTypeDeepLink,
  diseaseDeepLink,
  originSourceDeepLink,
  type OriginLinkContext,
} from '@/lib/originDeepLinks'
import { StyledTooltip } from '@/components/ui/StyledTooltip'

interface Props {
  pack: EvidencePack
  /** Compact summary (no per-claim list) */
  compact?: boolean
  className?: string
}

function packLinkContext(pack: EvidencePack): OriginLinkContext {
  const primary = pack.candidates[0]
  const gene =
    pack.targets[0]?.symbol ||
    pack.targets[0]?.id ||
    null
  return {
    name: primary?.identity.name ?? null,
    cid: primary?.identity.pubchemCid ?? null,
    chemblId: primary?.identity.chemblId ?? null,
    diseaseName: pack.disease?.name ?? null,
    geneSymbol: gene,
  }
}

const chipBase =
  'rounded border px-1.5 py-0.5 text-[10px] transition-colors'
const chipMuted = `${chipBase} border-slate-700 bg-slate-800/50 text-slate-400`
const chipLink =
  'hover:border-indigo-600/50 hover:text-indigo-300 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-indigo-500'

function DeepChip({
  href,
  title,
  className,
  testId,
  children,
}: {
  href: string | null
  title: string
  className: string
  testId?: string
  children: ReactNode
}) {
  if (href) {
    return (
      <StyledTooltip content={title}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${className} ${chipLink}`}
          data-testid={testId}
        >
          {children}
          <span className="ml-0.5 opacity-70" aria-hidden>
            ↗
          </span>
        </a>
      </StyledTooltip>
    )
  }
  return (
    <StyledTooltip content={title}>
      <span className={className} data-testid={testId}>
        {children}
      </span>
    </StyledTooltip>
  )
}

/**
 * Read-only view of a built evidence pack (metadata + claims).
 * Source / disease / claim-type chips deep-link to free public records when context allows.
 */
export function PackView({ pack, compact = false, className = '' }: Props) {
  const ctx = packLinkContext(pack)
  const diseaseLink = pack.disease?.name ? diseaseDeepLink(pack.disease) : null

  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900/40 ${className}`}
      data-testid="pack-view"
    >
      <div className="border-b border-slate-800 px-4 py-3">
        <h3 className="text-base font-semibold text-slate-100">{pack.title}</h3>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
          <span>
            {pack.claimCount}/{MAX_PACK_CLAIMS} claims
          </span>
          <span>{pack.candidates.length} candidates</span>
          <StyledTooltip content={pack.contentHash}>
            <span className="font-mono text-slate-600">
              hash {pack.contentHash.slice(0, 12)}…
            </span>
          </StyledTooltip>
          <span>{new Date(pack.createdAt).toLocaleString()}</span>
        </div>
        {diseaseLink && (
          <div className="mt-2">
            <DeepChip
              href={diseaseLink.href}
              title={diseaseLink.title}
              className="rounded-full border border-indigo-800/40 bg-indigo-900/20 px-2 py-0.5 text-[11px] text-indigo-300"
              testId="pack-disease-chip"
            >
              {diseaseLink.label}
            </DeepChip>
          </div>
        )}
        {pack.sources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {pack.sources.map((s) => {
              const link = originSourceDeepLink(s, ctx)
              return (
                <DeepChip
                  key={s}
                  href={link.href}
                  title={link.title}
                  className={chipMuted}
                  testId="pack-source-chip"
                >
                  {link.label}
                </DeepChip>
              )
            })}
          </div>
        )}
      </div>

      {!compact && (
        <div className="max-h-72 overflow-y-auto px-4 py-3">
          {pack.claims.length === 0 ? (
            <p className="text-sm text-slate-500">No claims in this pack.</p>
          ) : (
            <ul className="space-y-3">
              {pack.claims.map((c) => {
                const typeLink = claimTypeDeepLink(c.claimType, ctx)
                const provLink = claimProvenanceDeepLink(c.provenance, ctx)
                return (
                  <li key={c.id} className="border-b border-slate-800/80 pb-2 last:border-0">
                    <div className="flex flex-wrap items-center gap-2 text-[10px]">
                      <DeepChip
                        href={typeLink.href}
                        title={typeLink.title}
                        className="rounded border border-emerald-800/40 bg-emerald-900/20 px-1.5 py-0.5 text-emerald-300"
                        testId="pack-claim-type-chip"
                      >
                        {c.claimType}
                      </DeepChip>
                      <span className="font-mono text-slate-600">{c.id}</span>
                      <span className="text-slate-600">{c.epistemicStatus}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-300">{c.statement}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {provLink.href ? (
                        <StyledTooltip content={provLink.title}>
                          <a
                            href={provLink.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400/90 hover:text-indigo-300 hover:underline"
                            data-testid="pack-claim-source-url"
                          >
                            {provLink.label} ↗
                          </a>
                        </StyledTooltip>
                      ) : (
                        <StyledTooltip content={provLink.title}>
                          <span>{provLink.label}</span>
                        </StyledTooltip>
                      )}
                      {c.provenance.retrievedAt
                        ? ` · ${new Date(c.provenance.retrievedAt).toLocaleDateString()}`
                        : ''}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {compact && Object.keys(pack.claimTypes).length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 py-2">
          {Object.entries(pack.claimTypes).map(([type, n]) => {
            const link = claimTypeDeepLink(type, ctx)
            return (
              <DeepChip
                key={type}
                href={link.href}
                title={link.title}
                className={chipMuted}
                testId="pack-claim-type-summary-chip"
              >
                {type}: {n}
              </DeepChip>
            )
          })}
        </div>
      )}
    </div>
  )
}
