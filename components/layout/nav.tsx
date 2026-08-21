"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Link, usePathname } from "@/i18n/navigation"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { Logo } from "@/components/ui/logo"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/shadcn/sheet"

export interface NavLink {
  href: string
  label: string
}

/**
 * True once the page has scrolled past its top. Drives the header's
 * transparent-at-top -> surfaced-floating-bar transition.
 */
function useHeaderScrolled() {
  const [scrolled, setScrolled] = React.useState(false)

  React.useEffect(() => {
    const update = (evt: Event | null) => {
      const target: EventTarget | null = evt ? evt.target : null
      // The homepage scrolls inside an h-dvh overflow container that wraps
      // the page content, so accept the window plus any scroller that is an
      // ancestor of — or nested within — #main-content. Ignore unrelated
      // scroll surfaces (command palettes, side rails).
      const main = document.getElementById("main-content")
      const isWindowOrDoc = target === window || target === document
      const relatesToMain =
        main !== null &&
        target instanceof Node &&
        (main.contains(target) ||
          (target instanceof Element && target.contains(main)))
      if (!isWindowOrDoc && !relatesToMain) {
        return
      }
      const y =
        target === window || target === document || !(target instanceof Element)
          ? window.scrollY
          : target.scrollTop
      setScrolled(y > 8)
    }
    update(null)
    // Capture: scroll events from inner containers do not bubble, but they
    // do fire capture-phase listeners on document.
    document.addEventListener("scroll", update, {
      passive: true,
      capture: true,
    })
    return () =>
      document.removeEventListener("scroll", update, { capture: true })
  }, [])

  return scrolled
}

/** How long the preview chip lingers after the cursor leaves before returning. */
const LEAVE_LINGER_MS = 120

/** Longest href wins so `/draft/123` keeps MY DRAFTS active over partials. */
function resolveActiveHref(pathname: string, navLinks: NavLink[]) {
  const matches = navLinks.filter((link) => pathname.startsWith(link.href))
  if (matches.length === 0) return null
  return matches.toSorted((a, b) => b.href.length - a.href.length)[0].href
}

/**
 * Desktop navigation links as a segmented control with a sliding active chip,
 * adapted from the @coss registry segmented-control pattern and squared to
 * GTMC geometry. One absolutely-positioned ink chip measures and animates to
 * the active link, magnetically following hover/focus previews. Vanilla CSS
 * transforms only; honors prefers-reduced-motion.
 */
export function DesktopNav({ navLinks }: { navLinks: NavLink[] }) {
  const pathname = usePathname()
  const listRef = React.useRef<HTMLUListElement>(null)
  const chipRef = React.useRef<HTMLSpanElement>(null)
  const [previewKey, setPreviewKey] = React.useState<string | null>(null)
  // Delayed release: on leave, the chip lingers briefly so quick diagonal
  // mouse paths across the bar don't flash it away and back.
  const releaseTimer = React.useRef<number | null>(null)
  const clearRelease = () => {
    if (releaseTimer.current !== null) {
      window.clearTimeout(releaseTimer.current)
      releaseTimer.current = null
    }
  }
  const previewLink = (href: string) => {
    clearRelease()
    setPreviewKey(href)
  }
  const scheduleRelease = () => {
    clearRelease()
    releaseTimer.current = window.setTimeout(() => {
      releaseTimer.current = null
      setPreviewKey(null)
    }, LEAVE_LINGER_MS)
  }

  const activeHref = React.useMemo(
    () => resolveActiveHref(pathname, navLinks),
    [pathname, navLinks]
  )
  // Hover/focus borrows the chip; otherwise it rests on the active link.
  const chipKey = previewKey ?? activeHref

  React.useEffect(() => clearRelease, [])

  const [resizeTick, setResizeTick] = React.useState(0)

  React.useEffect(() => {
    const list = listRef.current
    if (!list || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => setResizeTick((tick) => tick + 1))
    ro.observe(list)
    // Late web-font swaps change link metrics without resizing the list box.
    let cancelled = false
    document.fonts?.ready.then(() => {
      if (!cancelled) setResizeTick((tick) => tick + 1)
    })
    return () => {
      cancelled = true
      ro.disconnect()
    }
  }, [])

  React.useEffect(() => {
    const chipEl = chipRef.current
    const listEl = listRef.current
    if (!chipEl || !listEl) return

    const hide = () => {
      chipEl.style.visibility = "hidden"
    }
    const link = chipKey
      ? listEl.querySelector<HTMLElement>(
          `[data-nav-key="${CSS.escape(chipKey)}"]`
        )
      : null
    if (!link) {
      hide()
      return
    }
    // offsetLeft is measured against the positioned <li> wrapper (always 0),
    // so derive the position from viewport rects relative to the list box.
    const listRect = listEl.getBoundingClientRect()
    const linkRect = link.getBoundingClientRect()
    const left = linkRect.left - listRect.left + listEl.scrollLeft
    const width = linkRect.width
    // Place instantly on (re)entry so the chip never glides from stale
    // coordinates; subsequent moves between links keep their transition.
    chipEl.style.transitionDuration = "0s"
    chipEl.style.left = `${left}px`
    chipEl.style.width = `${width}px`
    void chipEl.offsetWidth
    chipEl.style.transitionDuration = ""
    chipEl.style.visibility = "visible"
  }, [chipKey, resizeTick])

  const chipIsHome = activeHref !== null && chipKey === activeHref

  return (
    <ul ref={listRef} className="relative hidden items-center gap-1 md:flex">
      <span
        ref={chipRef}
        aria-hidden="true"
        className={`bg-tech-main-dark pointer-events-none invisible absolute top-1/2 z-0 h-[calc(100%-0.5rem)] -translate-y-1/2 border shadow-sm transition-[left,width] duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
          chipIsHome
            ? "border-tech-main-dark"
            : "border-tech-main/40 bg-tech-accent"
        }`}
      />

      {navLinks.map((link) => {
        const isActive = link.href === activeHref
        const isChipTarget = chipKey === link.href

        return (
          <li key={link.href} className="relative z-10">
            <Link
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              data-nav-key={link.href}
              onMouseEnter={() => previewLink(link.href)}
              onFocus={() => previewLink(link.href)}
              onBlur={() => scheduleRelease()}
              onMouseLeave={() => scheduleRelease()}
              className={`focus-visible:outline-tech-main flex h-9 items-center rounded-none border border-transparent px-3 font-mono text-xs tracking-[0.15em] uppercase transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${
                isChipTarget
                  ? "text-tech-signal-ink font-bold"
                  : isActive
                    ? "text-tech-main-dark font-bold"
                    : "text-tech-main hover:text-tech-main-dark"
              }`}>
              {link.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Mobile navigation: hamburger trigger + modal side drawer (research default
 * over top dropdowns — preserves page context via the scrim and gives the IA
 * room). Radix Dialog supplies the modal semantics: focus trap, Escape,
 * focus return.
 */
export function MobileNav({ navLinks }: { navLinks: NavLink[] }) {
  const t = useTranslations("CommonA11y")
  const tFooter = useTranslations("Footer")
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)

  return (
    <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
      <SheetTrigger asChild>
        <button
          className="hover:bg-tech-main/10 flex min-h-11 min-w-11 cursor-pointer flex-col items-center justify-center gap-1.5 p-2 transition-colors md:hidden"
          aria-label={t("toggleNavigationMenu")}
          aria-expanded={isDrawerOpen}>
          <span
            className={`bg-tech-main h-0.5 w-5 transition-all ${isDrawerOpen ? `translate-y-2 rotate-45` : ""} `}></span>
          <span
            className={`bg-tech-main h-0.5 w-5 transition-all ${isDrawerOpen ? `opacity-0` : ""} `}></span>
          <span
            className={`bg-tech-main h-0.5 w-5 transition-all ${isDrawerOpen ? `-translate-y-2 -rotate-45` : ""} `}></span>
        </button>
      </SheetTrigger>

      <SheetContent
        side="left"
        showCloseButton={false}
        aria-label={t("toggleNavigationMenu")}
        aria-describedby={undefined}
        className="border-tech-main/40 bg-surface-overlay/95 w-[85vw] max-w-xs border-r p-0 backdrop-blur-md md:hidden">
        <div className="flex h-full flex-col">
          <div className="border-tech-main/30 flex h-16 shrink-0 items-center justify-between border-b px-4">
            <Logo size="sm" />
          </div>
          <nav
            aria-label={t("toggleNavigationMenu")}
            className="flex-1 overflow-y-auto p-3">
            <p className="text-tech-main/50 mb-2 px-1 font-mono text-[0.625rem] tracking-[0.2em] uppercase">
              {tFooter("sectionRead")}
            </p>
            <ul className="space-y-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setIsDrawerOpen(false)}
                    className="border-tech-main/40 text-tech-main-dark hover:border-tech-signal hover:bg-tech-main/5 flex min-h-11 items-center border-b px-3 font-mono text-xs tracking-[0.15em] uppercase transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="border-tech-main/30 flex shrink-0 items-center gap-2 border-t p-3">
            <ThemeToggle />
            <LanguageSwitcher className="border-none" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/**
 * Floating site header frame. Transparent and borderless at the top of the
 * page so it reads as part of the hero, then condenses into a surfaced,
 * full-bleed band with a viewport-spanning hairline once the user scrolls.
 * Content aligns to the shared page container so the band's edges always
 * read as intentional chrome, never a plate cut off mid-air.
 */
export function SiteHeader({
  left,
  right,
}: {
  left: React.ReactNode
  right: React.ReactNode
}) {
  const scrolled = useHeaderScrolled()

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        data-scrolled={scrolled ? "" : undefined}
        className="data-scrolled:border-tech-main/30 data-scrolled:bg-surface-overlay/90 border-b border-transparent transition-[background-color,border-color,box-shadow] duration-300 data-scrolled:shadow-[0_8px_24px_-16px_rgb(32_40_60/0.35)] data-scrolled:backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 md:h-20 lg:px-8">
          <div className="flex min-w-0 items-center gap-4 md:gap-6">{left}</div>
          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            {right}
          </div>
        </div>
      </div>
    </header>
  )
}
