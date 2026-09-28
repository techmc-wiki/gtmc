"use client";

import * as React from "react";
import { Menu, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/shadcn/button";
import { BounceSidebar, type BounceSidebarItem } from "@/components/ui/shadcn/bounce-sidebar";
import { ScrollArea } from "@/components/ui/shadcn/scroll-area";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/shadcn/sheet";
import { ArticleOutlineNavigation } from "@/components/articles/outline-navigation";
import { useOutline } from "./outline/use-outline";
import { encodeSlug } from "@/lib/articles/slug-resolver";
import type { ChapterNavNode } from "@/lib/articles/chapter-nav-types";

interface ArticlesLayoutProps {
  children: React.ReactNode;
  tree: ChapterNavNode[];
}

function useChapterTree(tree: ChapterNavNode[]) {
  const [fetchedTree, setFetchedTree] = React.useState<ChapterNavNode[]>([]);
  const locale = useLocale();

  React.useEffect(() => {
    if (tree.length) return;
    const controller = new AbortController();

    void fetch(`/api/articles/tree?locale=${locale}`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : []))
      .then((result: ChapterNavNode[]) => {
        if (!controller.signal.aborted && Array.isArray(result)) setFetchedTree(result);
      })
      .catch(() => {});

    return () => controller.abort();
  }, [locale, tree]);

  return tree.length ? tree : fetchedTree;
}

function getNavigationItems(tree: ChapterNavNode[], locale: string) {
  const items: BounceSidebarItem[] = [];

  const visit = (nodes: ChapterNavNode[]) => {
    for (const node of nodes) {
      if (node.isFolder) {
        items.push({ id: node.id, label: node.title, heading: true });
      } else {
        const path = `/articles/${encodeSlug(node.slug)}`;
        items.push({ id: node.id, label: node.title, href: `/${locale}${path}` });
      }
      visit(node.children);
    }
  };

  visit(tree);
  return items;
}

function SiteNavigation({
  items,
  activeIndex,
  onNavigate,
}: {
  items: BounceSidebarItem[];
  activeIndex: number;
  onNavigate?: () => void;
}) {
  const t = useTranslations("ChapterNav");
  const containerRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (!items.length || activeIndex < 0) return;
    const viewport = containerRef.current?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    const active = viewport?.querySelector<HTMLElement>('[data-active="true"]');
    if (!viewport || !active) return;
    viewport.scrollTop = Math.max(
      0,
      active.offsetTop - viewport.offsetTop - viewport.clientHeight / 3,
    );
  }, [activeIndex, items.length]);

  return (
    <nav ref={containerRef} aria-label={t("title")} className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        {items.length ? (
          <BounceSidebar
            items={items}
            value={activeIndex}
            onChange={onNavigate}
            dotColor="var(--color-tech-signal)"
            aria-label={t("title")}
            className="pr-3 pb-8"
          />
        ) : (
          <p className="px-4 py-3 text-sm text-muted-foreground">{t("empty")}</p>
        )}
      </ScrollArea>
    </nav>
  );
}

export function ArticlesLayoutClient({ children, tree }: ArticlesLayoutProps) {
  const t = useTranslations("ChapterNav");
  const tA11y = useTranslations("CommonA11y");
  const tOutline = useTranslations("Outline");
  const locale = useLocale();
  const pathname = usePathname();
  const treeData = useChapterTree(tree);
  const outline = useOutline();
  const [siteOpen, setSiteOpen] = React.useState(true);
  const [outlineOpen, setOutlineOpen] = React.useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const desktop = window.matchMedia("(min-width: 64rem)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileMenuOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  const items = React.useMemo(() => getNavigationItems(treeData, locale), [treeData, locale]);
  const currentPath =
    pathname === "/articles" || pathname === "/articles/" ? "/articles/preface" : pathname;
  const activeIndex = items.findIndex(
    (item) =>
      typeof item !== "string" &&
      "href" in item &&
      decodeURIComponent(item.href ?? "").endsWith(
        decodeURIComponent(currentPath).replace(/\/$/, ""),
      ),
  );
  const expandedReader = !siteOpen && !outlineOpen;

  return (
    <>
      <div className="sticky top-16 z-30 border-b bg-tech-bg lg:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              aria-label={tA11y("toggleArticleTree")}
            >
              <Menu aria-hidden="true" />
              {t("title")}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" showCloseButton={false} className="w-[min(88vw,24rem)] p-0">
            <SheetHeader className="border-b">
              <div className="flex items-center justify-between gap-3">
                <SheetTitle>{t("title")}</SheetTitle>
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" aria-label={tA11y("closeNavigationMenu")}>
                    <X aria-hidden="true" />
                  </Button>
                </SheetClose>
              </div>
            </SheetHeader>
            <SiteNavigation
              items={items}
              activeIndex={activeIndex}
              onNavigate={() => setMobileMenuOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>

      <div
        className={`relative mx-auto flex w-full min-w-0 flex-1 gap-6 ${expandedReader ? "max-w-none" : "max-w-[98rem]"}`}
      >
        {siteOpen && (
          <aside className="hidden w-60 shrink-0 self-stretch lg:block" aria-label={t("title")}>
            <div className="sticky top-24 flex h-[calc(100dvh-7rem)] min-h-0 flex-col border-r pr-3">
              <h2 className="px-4 pb-3 text-sm font-semibold">{t("title")}</h2>
              <SiteNavigation items={items} activeIndex={activeIndex} />
            </div>
          </aside>
        )}

        <main
          className={`my-5 min-w-0 flex-1 ${expandedReader ? "max-w-none" : "mx-auto max-w-5xl"}`}
        >
          <div className="sticky top-20 z-20 mb-3 hidden items-center justify-between bg-tech-bg/95 py-1 lg:flex">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={siteOpen ? tA11y("hideChapterNav") : tA11y("showChapterNav")}
              aria-expanded={siteOpen}
              onClick={() => setSiteOpen((open) => !open)}
            >
              {siteOpen ? (
                <PanelLeftClose aria-hidden="true" />
              ) : (
                <PanelLeftOpen aria-hidden="true" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={outlineOpen ? tOutline("hideRail") : tOutline("showRail")}
              aria-expanded={outlineOpen}
              onClick={() => setOutlineOpen((open) => !open)}
            >
              {outlineOpen ? (
                <PanelRightClose aria-hidden="true" />
              ) : (
                <PanelRightOpen aria-hidden="true" />
              )}
            </Button>
          </div>
          {children}
        </main>

        {outlineOpen && (
          <aside className="hidden w-40 shrink-0 self-stretch lg:block">
            <ArticleOutlineNavigation outline={outline} />
          </aside>
        )}
      </div>
      <ArticleOutlineNavigation outline={outline} mobile />
    </>
  );
}
