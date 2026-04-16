export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-[#0f1117]">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="h-6 w-36 bg-slate-800 rounded animate-pulse" />
          <div className="flex gap-4">
            <div className="h-4 w-16 bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-16 bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-20 bg-slate-800 rounded animate-pulse" />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center space-y-4 mb-12">
          <div className="h-10 w-96 mx-auto bg-slate-800 rounded animate-pulse" />
          <div className="h-6 w-64 mx-auto bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="h-14 w-full bg-slate-800 rounded-xl animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-3 animate-pulse">
              <div className="h-4 w-24 bg-slate-700 rounded" />
              <div className="h-3 w-full bg-slate-700 rounded" />
              <div className="h-3 w-3/4 bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}