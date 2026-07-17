import { CornerBrackets } from "@/components/ui/corner-brackets"

export function MaintainerBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="border-tech-signal/40 bg-tech-signal/10 text-tech-main-dark inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[0.625rem] font-medium tracking-[0.18em] uppercase">
      <span aria-hidden="true" className="bg-tech-signal size-1.5" />
      {children}
    </span>
  )
}

export function MaintainerCallout({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <aside className="border-tech-main/25 bg-tech-accent/10 relative mt-5 overflow-hidden border p-4 pl-5 text-left">
      <span
        aria-hidden="true"
        className="bg-tech-signal absolute inset-y-0 left-0 w-1"
      />
      <CornerBrackets
        className="pointer-events-none absolute inset-0"
        size="size-2"
        color="border-tech-main/30"
      />
      <p className="text-tech-main-dark font-mono text-[0.625rem] tracking-[0.2em] uppercase">
        {title}
      </p>
      <p className="text-tech-main mt-1 text-sm/relaxed">{description}</p>
    </aside>
  )
}
