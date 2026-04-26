import { memo } from 'react'
import { Panel } from '@/components/ui/Panel'
import { PaginatedList } from '@/components/ui/PaginatedList'
import type { GNPSLibrarySpectrum, GNPSNetworkCluster } from '@/lib/types'

function SpectrumItem({ spectrum }: { spectrum: GNPSLibrarySpectrum }) {
  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <a
            href={spectrum.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-100 text-sm hover:text-cyan-400 transition-colors line-clamp-2"
          >
            {spectrum.name}
          </a>
          <p className="text-xs text-slate-400 mt-0.5">ID: {spectrum.id}</p>
        </div>
        <span className="text-xs bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-2 py-0.5 rounded shrink-0">
          {spectrum.precursorMz.toFixed(4)} m/z
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2 text-xs">
        <span className="bg-purple-900/40 text-purple-300 border border-purple-700/30 px-1.5 py-0.5 rounded">
          {spectrum.ionMode}
        </span>
        <span className="bg-slate-700/50 text-slate-300 px-1.5 py-0.5 rounded">
          {spectrum.library}
        </span>
        {spectrum.mz > 0 && (
          <span className="bg-slate-700/50 text-slate-300 px-1.5 py-0.5 rounded">
            {spectrum.mz.toFixed(4)} Da
          </span>
        )}
      </div>

      {spectrum.organism && (
        <p className="text-xs text-slate-400 mt-1">
          <span className="text-slate-500">Organism:</span> {spectrum.organism}
        </p>
      )}

      {spectrum.smiles && (
        <p className="text-xs text-slate-500 mt-1 font-mono truncate">
          SMILES: {spectrum.smiles.substring(0, 50)}...
        </p>
      )}

      {spectrum.sources.length > 0 && (
        <p className="text-xs text-slate-500 mt-1">
          <span className="text-slate-400">Sources:</span> {spectrum.sources.slice(0, 2).join(', ')}
          {spectrum.sources.length > 2 && ` +${spectrum.sources.length - 2} more`}
        </p>
      )}

      <a
        href={spectrum.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-cyan-400 hover:text-cyan-300 mt-1 inline-block"
      >
        View Spectrum →
      </a>
    </div>
  )
}

function ClusterItem({ cluster }: { cluster: GNPSNetworkCluster }) {
  return (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-100 text-sm">Cluster {cluster.clusterId}</h4>
          {cluster.bestMatch && (
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{cluster.bestMatch}</p>
          )}
        </div>
        <span className="text-xs bg-cyan-900/40 text-cyan-300 border border-cyan-700/30 px-2 py-0.5 rounded shrink-0">
          {cluster.parentMass.toFixed(4)} m/z
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-400">
        <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">
          {cluster.spectraCount} spectra
        </span>
        <span className="bg-purple-900/40 text-purple-300 border border-purple-700/30 px-1.5 py-0.5 rounded">
          {cluster.ionMode}
        </span>
        {cluster.connectedComponents > 0 && (
          <span className="bg-slate-700/50 px-1.5 py-0.5 rounded">
            {cluster.connectedComponents} connections
          </span>
        )}
      </div>

      {cluster.libraryIdentifications.length > 0 && (
        <p className="text-xs text-slate-500 mt-1">
          <span className="text-slate-400">Library matches:</span> {cluster.libraryIdentifications.slice(0, 2).join(', ')}
          {cluster.libraryIdentifications.length > 2 && ` +${cluster.libraryIdentifications.length - 2} more`}
        </p>
      )}

      <a
        href={cluster.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-cyan-400 hover:text-cyan-300 mt-1 inline-block"
      >
        View Network →
      </a>
    </div>
  )
}

type GNPSData = {
  spectra: GNPSLibrarySpectrum[]
  clusters: GNPSNetworkCluster[]
}

export const GNPSPanel = memo(function GNPSPanel({ data, panelId, lastFetched }: { data: GNPSData, panelId?: string, lastFetched?: Date }) {
  const { spectra, clusters } = data
  const isEmpty = spectra.length === 0 && clusters.length === 0

  return (
    <Panel
      title="GNPS"
      panelId={panelId}
      lastFetched={lastFetched}
      empty={isEmpty ? "No GNPS mass spectrometry data found for this molecule." : undefined}
    >
      {!isEmpty && (
        <>
          <p className="text-xs text-slate-400 mb-3">
            Global Natural Products Social Molecular Networking
          </p>

          {spectra.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                <span className="text-cyan-400">Library Spectra</span>
                <span className="text-xs text-slate-500">({spectra.length})</span>
              </h4>
              <PaginatedList className="space-y-2">
                {spectra.map((spectrum, i) => (
                  <SpectrumItem key={`${spectrum.id}-${i}`} spectrum={spectrum} />
                ))}
              </PaginatedList>
            </div>
          )}

          {clusters.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                <span className="text-purple-400">Network Clusters</span>
                <span className="text-xs text-slate-500">({clusters.length})</span>
              </h4>
              <PaginatedList className="space-y-2">
                {clusters.map((cluster, i) => (
                  <ClusterItem key={`${cluster.clusterId}-${i}`} cluster={cluster} />
                ))}
              </PaginatedList>
            </div>
          )}
        </>
      )}
    </Panel>
  )
})