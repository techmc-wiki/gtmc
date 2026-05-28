import { useTranslations } from "next-intl"
import type { MarkdownComponentProps } from "@/lib/markdown/component-types"

type CalloutStyle = {
  border: string
  bg: string
  title: string
  text: string
}

const CALLOUT_STYLES = {
  warning: {
    border: "border-amber-500 dark:border-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    title: "text-amber-700 dark:text-amber-300",
    text: "text-amber-900 dark:text-amber-200",
  },
  tip: {
    border: "border-emerald-500 dark:border-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    title: "text-emerald-700 dark:text-emerald-300",
    text: "text-emerald-900 dark:text-emerald-200",
  },
  important: {
    border: "border-blue-500 dark:border-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    title: "text-blue-700 dark:text-blue-300",
    text: "text-blue-900 dark:text-blue-200",
  },
  crash: {
    border: "border-red-500 dark:border-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
    title: "text-red-700 dark:text-red-300",
    text: "text-red-900 dark:text-red-200",
  },
  corruption: {
    border: "border-orange-500 dark:border-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    title: "text-orange-700 dark:text-orange-300",
    text: "text-orange-900 dark:text-orange-200",
  },
} as const satisfies Record<string, CalloutStyle>

type CalloutType = keyof typeof CALLOUT_STYLES

const CALLOUT_TYPES_WITH_DEFAULT = [
  "crash",
  "corruption",
] as const satisfies readonly CalloutType[]

function isCalloutType(type: string): type is CalloutType {
  return type in CALLOUT_STYLES
}

export function CalloutAside({
  "data-callout": dataCallout,
  "data-callout-empty": dataCalloutEmpty,
  children,
  ...rest
}: MarkdownComponentProps) {
  const t = useTranslations("callouts")

  if (!dataCallout) {
    return <aside {...rest}>{children}</aside>
  }

  const type = String(dataCallout)
  const styles = isCalloutType(type)
    ? CALLOUT_STYLES[type]
    : CALLOUT_STYLES.important
  const labelKey = `${type}_label` as Parameters<typeof t>[0]
  const isEmpty = dataCalloutEmpty === "true"
  const hasDefault = CALLOUT_TYPES_WITH_DEFAULT.some(
    (defaultType) => defaultType === type
  )

  return (
    <aside
      className={`mb-4 border-l-2 px-6 py-4 ${styles.border} ${styles.bg}`}
      {...rest}>
      <div
        className={`mb-1.5 font-mono text-xs font-bold tracking-widest uppercase ${styles.title}`}>
        {t(labelKey)}
      </div>
      <div
        className={`font-sans text-sm [&_p]:mb-0 [&_p]:text-sm [&_p]:text-inherit ${styles.text}`}>
        {isEmpty && hasDefault
          ? t(`${type}_default` as Parameters<typeof t>[0])
          : children}
      </div>
    </aside>
  )
}
