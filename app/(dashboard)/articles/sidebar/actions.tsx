"use client"

export function SidebarActions({
  internalScroll,
  onCreate,
  onCollapseAll,
  onLocate,
}: {
  internalScroll: boolean
  onCreate: () => void
  onCollapseAll: (e: React.MouseEvent) => void
  onLocate: () => void
}) {
  if (internalScroll) {
    return (
      <div className="ml-0.5 shrink-0 border-b guide-line bg-white/95 px-6 py-3 backdrop-blur-sm">
        <div className="flex flex-col gap-2">
          <button onClick={onCreate} className="cursor-pointer border border-tech-main/40 px-3 py-1.5 pl-2 font-mono text-[11px] transition-colors hover:bg-tech-main hover:text-white">+ NEW DIR / FILE</button>
          <div className="flex gap-2">
            <button onClick={onCollapseAll} className="flex-3 cursor-pointer border border-tech-main/40 px-3 py-1.5 pl-2 font-mono text-[11px] transition-colors hover:bg-tech-main hover:text-white">⊟ COLLAPSE ALL</button>
            <button onClick={onLocate} className="flex-2 cursor-pointer border border-tech-main/40 px-3 py-1.5 pl-2 font-mono text-[11px] transition-colors hover:bg-tech-main hover:text-white">◎ LOCATE</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="sticky top-0 z-10 mb-4 border-b guide-line bg-white/95 px-6 py-3 backdrop-blur-sm">
      <div className="flex flex-wrap gap-2">
        <button onClick={onCreate} className="cursor-pointer border border-tech-main/40 px-3 py-1.5 font-mono text-[11px] transition-colors hover:bg-tech-main hover:text-white">+ NEW DIR / FILE</button>
        <button onClick={onCollapseAll} className="cursor-pointer border border-tech-main/40 px-3 py-1.5 font-mono text-[11px] transition-colors hover:bg-tech-main hover:text-white">⊟ COLLAPSE ALL</button>
        <button onClick={onLocate} className="cursor-pointer border border-tech-main/40 px-3 py-1.5 font-mono text-[11px] transition-colors hover:bg-tech-main hover:text-white">◎ LOCATE</button>
      </div>
    </div>
  )
}
