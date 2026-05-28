"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { useTranslations } from "next-intl"
import { useMounted } from "@/hooks/use-mounted"
import { useModalEffects } from "@/hooks/use-modal-effects"
import { cn } from "@/lib/cn"

export interface CategoryChipsCategory {
  name: string
  count: number
}

export interface CategoryChipsProps {
  categories: CategoryChipsCategory[]
  selected: string[]
  onChange: (selected: string[]) => void
  totalCount: number
  className?: string
}

const CHIP_BASE =
  "flex shrink-0 cursor-pointer items-center border px-3 py-1.5 font-mono text-xs tracking-widest uppercase whitespace-nowrap transition-colors select-none focus-visible:outline-tech-main focus-visible:outline-2 focus-visible:outline-offset-2"

const CHIP_ACTIVE = "border-tech-main/60 bg-tech-main/10 text-tech-main-dark"

const CHIP_INACTIVE =
  "border-tech-main/30 bg-white/50 text-tech-main/70 hover:border-tech-main/60 hover:bg-tech-accent/10"

interface ChipProps {
  label: string
  count: number
  active: boolean
  name?: string
  onClick?: () => void
  onToggle?: (name: string) => void
}

function Chip({ label, count, active, name, onClick, onToggle }: ChipProps) {
  const handleClick = React.useCallback(() => {
    if (onClick) onClick()
    else if (onToggle && name) onToggle(name)
  }, [onClick, onToggle, name])

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      className={cn(CHIP_BASE, active ? CHIP_ACTIVE : CHIP_INACTIVE)}>
      [{label} {count}]
    </button>
  )
}

interface ChipsListProps {
  categories: CategoryChipsCategory[]
  selected: string[]
  totalCount: number
  allLabel: string
  onToggle: (name: string) => void
  onSelectAll: () => void
  layout: "row" | "wrap"
  ariaLabel: string
}

function ChipsList({
  categories,
  selected,
  totalCount,
  allLabel,
  onToggle,
  onSelectAll,
  layout,
  ariaLabel,
}: ChipsListProps) {
  const noneSelected = selected.length === 0
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(false)

  React.useEffect(() => {
    if (layout !== "row") return
    const el = scrollRef.current
    if (!el) return

    const update = () => {
      setCanScrollLeft(el.scrollLeft > 0)
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
    }
    update()

    el.addEventListener("scroll", update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", update)
      ro.disconnect()
    }
  }, [layout, categories])

  const list = (
    <div
      ref={scrollRef}
      // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- no semantic HTML element for a group of toggle buttons
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "flex gap-2",
        layout === "row"
          ? "[scrollbar-width:none] overflow-x-auto [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
          : "flex-wrap"
      )}>
      <Chip
        label={allLabel}
        count={totalCount}
        active={noneSelected}
        onClick={onSelectAll}
      />
      {categories.map((c) => (
        <Chip
          key={c.name}
          label={c.name}
          name={c.name}
          count={c.count}
          active={selected.includes(c.name)}
          onToggle={onToggle}
        />
      ))}
    </div>
  )

  if (layout !== "row") return list

  return (
    <div className="relative">
      {list}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-l from-white/90 via-white/60 to-transparent transition-opacity duration-200",
          canScrollRight ? "opacity-100" : "opacity-0"
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-0 bottom-0 left-0 w-8 bg-gradient-to-r from-white/80 to-transparent transition-opacity duration-200",
          canScrollLeft ? "opacity-100" : "opacity-0"
        )}></div>
      <span
        aria-hidden="true"
        className={cn(
          "text-tech-main/60 pointer-events-none absolute top-1/2 right-2 z-10 flex size-6 -translate-y-1/2 items-center justify-center transition-opacity duration-200",
          canScrollRight ? "opacity-100" : "opacity-0"
        )}>
        <span className="size-2 rotate-45 border-t border-r border-current" />
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "text-tech-main/50 pointer-events-none absolute top-1/2 left-2 z-10 flex size-6 -translate-y-1/2 items-center justify-center transition-opacity duration-200",
          canScrollLeft ? "opacity-100" : "opacity-0"
        )}>
        <span className="size-2 -rotate-[135deg] border-t border-r border-current" />
      </span>
    </div>
  )
}

export function CategoryChips({
  categories,
  selected,
  onChange,
  totalCount,
  className,
}: CategoryChipsProps) {
  const t = useTranslations("Glossary")
  const allLabel = t("categoryAll")
  const groupLabel = allLabel
  const isMounted = useMounted()

  const [isSheetOpen, setIsSheetOpen] = React.useState(false)
  const closeSheet = React.useCallback(() => setIsSheetOpen(false), [])

  const openSheet = React.useCallback(() => setIsSheetOpen(true), [])

  useModalEffects({ isOpen: isSheetOpen, onClose: closeSheet })

  const handleToggle = React.useCallback(
    (name: string) => {
      if (selected.includes(name)) {
        onChange(selected.filter((s) => s !== name))
      } else {
        onChange([...selected, name])
      }
    },
    [selected, onChange]
  )

  const handleSelectAll = React.useCallback(() => {
    if (selected.length > 0) onChange([])
  }, [selected, onChange])

  const filterButtonLabel =
    selected.length === 0
      ? `[FILTER ${totalCount}]`
      : `[FILTER · ${selected.length}]`

  return (
    <>
      <div className={cn("hidden md:block", className)}>
        <ChipsList
          categories={categories}
          selected={selected}
          totalCount={totalCount}
          allLabel={allLabel}
          onToggle={handleToggle}
          onSelectAll={handleSelectAll}
          layout="row"
          ariaLabel={groupLabel}
        />
      </div>

      <div className={cn("md:hidden", className)}>
        <button
          type="button"
          onClick={openSheet}
          aria-haspopup="dialog"
          aria-expanded={isSheetOpen}
          className={cn(
            CHIP_BASE,
            "w-full justify-center",
            selected.length > 0 ? CHIP_ACTIVE : CHIP_INACTIVE
          )}>
          {filterButtonLabel}
        </button>
      </div>

      {isMounted &&
        createPortal(
          <div
            className={cn(
              "fixed inset-0 z-60 md:hidden",
              isSheetOpen ? "pointer-events-auto" : "pointer-events-none"
            )}
            aria-hidden={!isSheetOpen}>
            <button
              type="button"
              aria-label="Close filter"
              tabIndex={isSheetOpen ? 0 : -1}
              onClick={closeSheet}
              className={cn(
                "bg-tech-main-dark/20 absolute inset-0 w-full backdrop-blur-xs transition-opacity duration-300",
                isSheetOpen ? "opacity-100" : "opacity-0"
              )}
            />

            <div
              role={isSheetOpen ? "dialog" : undefined}
              aria-modal={isSheetOpen ? "true" : undefined}
              aria-label={groupLabel}
              className={cn(
                "border-tech-main/30 absolute inset-x-0 bottom-0 flex max-h-[70dvh] flex-col border-t bg-white/95 backdrop-blur-md transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                isSheetOpen ? "translate-y-0" : "translate-y-full"
              )}>
              <div className="border-tech-main/20 flex shrink-0 items-center justify-between border-b px-4 py-3">
                <span className="text-tech-main/60 font-mono text-xs font-bold tracking-widest uppercase">
                  {groupLabel}
                </span>
                <button
                  type="button"
                  onClick={closeSheet}
                  className="text-tech-main hover:bg-tech-main/10 cursor-pointer px-3 py-2 font-mono text-xs font-bold tracking-widest uppercase transition-colors"
                  aria-label="Close filter">
                  DONE
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4">
                <ChipsList
                  categories={categories}
                  selected={selected}
                  totalCount={totalCount}
                  allLabel={allLabel}
                  onToggle={handleToggle}
                  onSelectAll={handleSelectAll}
                  layout="wrap"
                  ariaLabel={groupLabel}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
