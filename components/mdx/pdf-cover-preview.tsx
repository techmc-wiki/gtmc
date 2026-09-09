"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { ArrowDownToLine } from "lucide-react"
import { ImagePeel } from "@/components/canvasui/image-peel"
import { Button } from "@/components/ui/shadcn/button"

/** A touchable paper preview, with a separate PDF download action. */
export function PdfCoverPreview({ filename }: { filename: string }) {
  const t = useTranslations("Pdf")
  const [opened, setOpened] = useState(false)
  const baseUrl = process.env.NEXT_PUBLIC_PDF_BASE_URL?.trim().replace(
    /\/+$/,
    ""
  )
  const locale = filename.replaceAll(/^gtmc-|\.pdf$/g, "")

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <Button
        type="button"
        variant="ghost"
        aria-label={t("previewCover")}
        aria-pressed={opened}
        onClick={() => setOpened(!opened)}
        className="relative block aspect-[1/1.414] h-auto w-full max-w-[26rem] touch-pan-y overflow-hidden border-0 p-0 whitespace-normal shadow-lg hover:bg-transparent sm:p-0">
        <ImagePeel
          src={`/covers/gtmc-${locale}.png`}
          opened={opened}
          onOpenChange={setOpened}>
          <div className="border-tech-main/40 bg-surface text-tech-main-dark flex h-full flex-col justify-between border p-6 text-left sm:p-10">
            <p className="text-tech-main text-xs">{t("editionLabel")}</p>
            <div>
              <p className="display-title text-2xl sm:text-3xl">
                {t("bookTitle")}
              </p>
              <p className="text-tech-main mt-4 text-sm">{t("bookSubtitle")}</p>
            </div>
            <div className="border-tech-line flex items-center justify-between gap-3 border-t pt-4 text-sm">
              <span>{t("slogan")}</span>
            </div>
          </div>
        </ImagePeel>
      </Button>
      <p className="text-tech-main/60 text-xs">{t("peelHint")}</p>
      {baseUrl ? (
        <Button asChild>
          <a href={`${baseUrl}/${filename}`} download>
            <ArrowDownToLine />
            {t("downloadButton")}
          </a>
        </Button>
      ) : (
        <p className="text-tech-main/60 text-sm">{t("unavailableNote")}</p>
      )}
    </div>
  )
}
