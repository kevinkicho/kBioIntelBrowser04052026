export default function BatchLoading() {
  return (
    <div className="min-h-screen bg-[#0f1117]">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="h-6 w-36 bg-slate-800 rounded animate-pulse" />
      </header>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="h-8 w-48 bg-slate-800 rounded animate-pulse mb-6" />
        <div className="h-40 w-full bg-slate-800/50 border border-slate-700 rounded-xl animate-pulse mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex gap-4 animate-pulse">
              <div className="w-12 h-12 bg-slate-700 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-slate-700 rounded" />
                <div className="h-3 w-48 bg-slate-700 rounded" />
                <div className="h-3 w-24 bg-slate-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}