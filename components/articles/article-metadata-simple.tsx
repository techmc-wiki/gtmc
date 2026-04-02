"use client"

import { CornerBrackets } from "@/components/ui/corner-brackets"

interface ArticleMetadataSimpleProps {
  title: string
  filePath: string
  wordCount: number
  readingTime: number
}

export function ArticleMetadataSimple({
  title,
  filePath,
  wordCount,
  readingTime,
}: ArticleMetadataSimpleProps) {
  return (
    <header>
      <CornerBrackets />

      <div
        className="
          relative mb-8 animate-fade-in border guide-line bg-white/80 p-4
          font-mono text-xs text-tech-main
        ">
        <div className="flex items-center justify-between text-tech-main/50">
          <span className="flex items-center gap-2">
            <span className="size-2 animate-pulse bg-tech-main/50" />
            SYS.READ_STREAM | UTF-8
          </span>
          <span
            className="
              hidden items-center gap-3
              sm:inline-flex
            ">
            PATH: {filePath}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          <h1
            className="
              font-mono text-xl font-bold tracking-tight text-tech-main-dark
              sm:text-2xl
            ">
            {title}
          </h1>

          <div className="text-tech-accent">
            <p>
              {"WORD_COUNT: "}
              <span className="text-tech-main">
                {wordCount.toLocaleString()}
              </span>
              <span
                className="
                  hidden
                  sm:inline
                ">
                {" "}
                |{" "}
              </span>
              <br
                className="
                  block
                  sm:hidden
                "
              />
              {"EST_READ_TIME: "}
              <span className="text-tech-main">{readingTime} MIN</span>
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
