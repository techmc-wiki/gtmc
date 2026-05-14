import { TechCard } from "@/components/ui/tech-card"
import { TechButton } from "@/components/ui/tech-button"
import { getTranslations } from "next-intl/server"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "PDF Download – GTMC Reference",
  description: "Download the full GTMC knowledge base as a PDF document.",
}

export default async function PdfPage() {
  const t = await getTranslations("Pdf")

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center py-12 sm:py-20">
      <TechCard
        padding="spacious"
        hover="border"
        brackets="visible"
        bracketVariant="hover-expand"
        pattern="grid"
        className="w-full">
        <div className="text-tech-main/60 mb-6 font-mono text-[10px] tracking-[0.2em] uppercase">
          {t("label")}
        </div>

        <h1 className="text-tech-main-dark mb-2 text-xl font-bold tracking-tight sm:text-2xl">
          {t("title")}
        </h1>

        <p className="text-tech-main/80 mb-8 text-sm leading-relaxed">
          {t("subtitle")}
        </p>

        <div className="border-tech-line/40 mb-6 flex items-center gap-4 border-t pt-6">
          <div className="text-tech-main/60 flex items-center gap-2 font-mono text-xs">
            <span className="border-tech-main/40 bg-tech-main/10 inline-block size-2 border" />
            PDF
          </div>
          {/* TODO: parse actual file size from public/gtmc.pdf at build time */}
          <div className="text-tech-main/40 font-mono text-xs">~3.7 MB</div>
        </div>

        <a href="/gtmc.pdf" download>
          <TechButton variant="primary" size="lg" className="w-full sm:w-auto">
            {t("download")}
          </TechButton>
        </a>
      </TechCard>
    </div>
  )
}
