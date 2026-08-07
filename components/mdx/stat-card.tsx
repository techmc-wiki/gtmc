import { TechCard } from "@/components/ui/tech-card"

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <TechCard padding="compact">
      <p className="text-tech-main/60 mb-1 font-mono text-[0.625rem] tracking-[0.25em] uppercase">
        {label}
      </p>
      <p className="text-tech-main-dark text-lg font-semibold">{value}</p>
    </TechCard>
  )
}
