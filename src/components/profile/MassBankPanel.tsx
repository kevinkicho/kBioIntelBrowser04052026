import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { MassBankSpectrum } from '@/lib/types'

function SpectrumItem({ spectrum }: { spectrum: MassBankSpectrum }) {
  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <a
          href={spectrum.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-slate-100 text-sm hover:text-cyan-400 transition-colors line-clamp-2"
        >
          {spectrum.name || spectrum.accession}
        </a>
        <span className="text-xs bg-amber-900/40 text-amber-300 border border-amber-700/30 px-2 py-0.5 rounded shrink-0">
          {spectrum.accession}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-400">
        {spectrum.formula && (
          <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{spectrum.formula}</span>
        )}
        {spectrum.mass > 0 && (
          <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{spectrum.mass.toFixed(4)} Da</span>
        )}
        {spectrum.ionMode && (
          <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">{spectrum.ionMode}</span>
        )}
        {spectrum.msLevel && (
          <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">MS{spectrum.msLevel}</span>
        )}
      </div>
      {spectrum.instrument && (
        <p className="text-xs text-slate-500 mt-1">Instrument: {spectrum.instrument}</p>
      )}
      {spectrum.precursorMz > 0 && (
        <p className="text-xs text-slate-500 mt-1">Precursor m/z: {spectrum.precursorMz.toFixed(4)}</p>
      )}
    </div>
  )
}

export const MassBankPanel = memo(function MassBankPanel({ spectra, panelId, lastFetched }: { spectra: MassBankSpectrum[], panelId?: string, lastFetched?: Date }) {
  const isEmpty = spectra.length === 0
  return (
    <Panel
      title="MassBank"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No mass spectrometry spectra found for this molecule." : undefined}
    >
      {!isEmpty && (
        <>
          <p className="text-xs text-slate-400 mb-3">Mass spectrometry reference spectra</p>
          <PaginatedList className="space-y-3">
            {spectra.map((spectrum, i) => (
              <SpectrumItem key={`${spectrum.accession}-${i}`} spectrum={spectrum} />
            ))}
          </PaginatedList>
        </>
      )}
    </Panel>
  )
})