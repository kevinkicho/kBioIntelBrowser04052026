export default function MoleculeLoading() {
  return (
    <div className="min-h-screen bg-[#0f1117]">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="h-4 w-32 bg-slate-800 rounded animate-pulse" />
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Profile header skeleton */}
        <div className="flex gap-6 items-start mb-8">
          <div className="w-32 h-32 bg-slate-800 rounded-xl animate-pulse" />
          <div className="flex-1 space-y-3">
            <div className="h-8 w-48 bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-64 bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-40 bg-slate-800 rounded animate-pulse" />
          </div>
        </div>

        {/* Summary cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-2 animate-pulse">
              <div className="h-3 w-20 bg-slate-700 rounded" />
              <div className="h-7 w-12 bg-slate-700 rounded" />
              <div className="h-3 w-16 bg-slate-700 rounded" />
            </div>
          ))}
        </div>

        {/* Controls skeleton */}
        <div className="flex gap-2 mb-6">
          <div className="h-9 w-24 bg-slate-800 rounded-lg animate-pulse" />
          <div className="h-9 w-24 bg-slate-800 rounded-lg animate-pulse" />
        </div>

        {/* Panel grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-3 animate-pulse">
              <div className="h-3 w-32 bg-slate-700 rounded" />
              <div className="h-4 w-full bg-slate-700 rounded" />
              <div className="h-4 w-3/4 bg-slate-700 rounded" />
              <div className="h-4 w-1/2 bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
