import Link from 'next/link'

export default function MoleculeNotFound() {
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-slate-700 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-slate-300 mb-2">Molecule Not Found</h2>
        <p className="text-slate-500 mb-6">
          The molecule you&apos;re looking for doesn&apos;t exist or couldn&apos;t be retrieved.
        </p>
        <Link
          href="/"
          className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Back to Search
        </Link>
      </div>
    </div>
  )
}
