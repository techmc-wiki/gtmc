"use client"

import { useTranslations } from "next-intl"
import { useEffect, useId, type ReactNode } from "react"
import { usePanelRef } from "react-resizable-panels"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/shadcn/resizable"

import styles from "./resizable-reader.module.css"

const DEFAULT_READER_WIDTH = 768
const READER_WIDTH_STORAGE_KEY = "article-reader-width"

export function ResizableReader({ children }: { children: ReactNode }) {
  const t = useTranslations("CommonA11y")
  const hintId = useId()
  const readerRef = usePanelRef()
  // Restore after hydration so the initial browser and server layouts agree.
  useEffect(() => {
    const width = Number(window.localStorage.getItem(READER_WIDTH_STORAGE_KEY))
    if (Number.isFinite(width) && width >= 384) readerRef.current?.resize(width)
  }, [readerRef])
  const resetWidth = () => {
    readerRef.current?.resize(DEFAULT_READER_WIDTH)
    window.localStorage.setItem(READER_WIDTH_STORAGE_KEY, String(DEFAULT_READER_WIDTH))
  }

  return (
    <>
      <span id={hintId} className="sr-only">
        {t("resizeReaderHint")}
      </span>
      <ResizablePanelGroup
        orientation="horizontal"
        className={`${styles.group} h-auto min-w-0 items-stretch`}
        style={{ overflow: "visible" }}
        onLayoutChanged={(_layout, meta) => {
          if (meta.isUserInteraction && window.matchMedia("(min-width: 64rem)").matches) {
            const width = readerRef.current?.getSize().inPixels
            if (width !== undefined) {
              window.localStorage.setItem(READER_WIDTH_STORAGE_KEY, String(width))
            }
          }
        }}>
        <ResizablePanel
          id="article-reader"
          panelRef={readerRef}
          defaultSize={DEFAULT_READER_WIDTH}
          minSize="24rem"
          groupResizeBehavior="preserve-pixel-size"
          style={{ overflow: "visible" }}>
          {children}
        </ResizablePanel>
        <ResizableHandle
          withHandle
          className={`${styles.handle} items-start`}
          aria-label={t("resizeReader")}
          aria-describedby={hintId}
          title={t("resizeReaderHint")}
          onDoubleClick={resetWidth}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              resetWidth()
            }
          }}
        />
        <ResizablePanel id="article-reader-space" minSize="0%" style={{ overflow: "visible" }} />
      </ResizablePanelGroup>
    </>
  )
}
