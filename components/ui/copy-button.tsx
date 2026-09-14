"use client"

import { Check, CircleAlert, Copy } from "lucide-react"

import { IconButton } from "@/components/ui/icon-button"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { cn } from "@/lib/cn"

interface CopyButtonProps {
  /** Resolves the text to copy; a promise keeps the control pending. */
  getValue: () => string | Promise<string>
  /** Accessible name and tooltip while idle. */
  label: string
  /** Accessible name after a successful copy. */
  copiedLabel: string
  /** Accessible name after a failed copy. */
  failedLabel: string
  className?: string
}

/**
 * The single clipboard affordance for reader surfaces: metadata URL,
 * attribution, article markdown, code and code-block links. Sizing and chrome
 * match the rest of the reader apparatus (ghost icon control, 44px touch
 * target that tightens to 32px from `md` up).
 */
export function CopyButton({
  getValue,
  label,
  copiedLabel,
  failedLabel,
  className,
}: CopyButtonProps) {
  const { state, copy } = useCopyToClipboard()
  const isCopied = state === "copied"
  const isFailed = state === "failed"
  const activeLabel = isFailed ? failedLabel : isCopied ? copiedLabel : label

  return (
    <IconButton
      className={cn("md:size-8", isFailed && "text-destructive", className)}
      onClick={() => void copy(getValue)}
      disabled={state === "pending"}
      aria-busy={state === "pending"}
      label={activeLabel}>
      <span
        className="t-icon-swap"
        data-state={isCopied ? "b" : "a"}
        aria-hidden="true">
        <span className="t-icon" data-icon="a">
          {isFailed ? (
            <CircleAlert className="size-4" />
          ) : (
            <Copy className="size-4" />
          )}
        </span>
        <span className="t-icon" data-icon="b">
          <Check className="size-4" />
        </span>
      </span>
      <span className="sr-only" aria-live="polite">
        {state === "idle" ? "" : activeLabel}
      </span>
    </IconButton>
  )
}
