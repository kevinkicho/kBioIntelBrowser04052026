'use client'

interface Props {
  cid: number
  name: string
}

export function MoleculeViewer3D({ cid, name }: Props) {
  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden w-32 h-32 md:w-48 md:h-48">
      <iframe
        src={`https://embed.molview.org/v1/?mode=balls&cid=${cid}&bg=1e293b`}
        title={`3D structure of ${name}`}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  )
}
