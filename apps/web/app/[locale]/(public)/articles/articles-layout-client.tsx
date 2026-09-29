"use client";

import * as React from "react";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/shadcn/button";
import { HookSidebar, type HookSidebarItem } from "@/components/ui/shadcn/hook-sidebar";
import { IconButton } from "@/components/ui/icon-button";
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
  const items: HookSidebarItem[] = [];

  const visit = (nodes: ChapterNavNode[]) => {
    for (const node of nodes) {
      if (node.isFolder) {
        items.push({ id: node.id, label: node.title });
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
  items: HookSidebarItem[];
  activeIndex: number;
  onNavigate?: () => void;
}) {
  const t = useTranslations("ChapterNav");
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!items.length || activeIndex < 0) return;
    const viewport = containerRef.current?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    const active = viewport?.querySelector<HTMLElement>('[data-active="true"]');
    if (!viewport || !active) return;
    const bounds = viewport.getBoundingClientRect();
    const row = active.getBoundingClientRect();
    if (row.top >= bounds.top && row.bottom <= bounds.bottom) return;
    viewport.scrollTop = Math.max(
      0,
      active.offsetTop - viewport.offsetTop - viewport.clientHeight / 3,
    );
  }, [activeIndex, items.length]);

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        {items.length ? (
          <HookSidebar
            items={items}
            value={activeIndex}
            onNavigate={onNavigate}
            aria-label={t("title")}
            className="pr-3 pb-8"
          />
        ) : (
          <p className="px-4 py-3 text-sm text-muted-foreground">{t("empty")}</p>
        )}
      </ScrollArea>
    </div>
  );
}

export function ArticlesLayoutClient({ children, tree }: ArticlesLayoutProps) {
  const t = useTranslations("ChapterNav");
  const tA11y = useTranslations("CommonA11y");
  const locale = useLocale();
  const pathname = usePathname();
  const treeData = useChapterTree(tree);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const outline = useOutline(contentRef, pathname);
  const [siteOpen, setSiteOpen] = React.useState(true);
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
      item.href &&
      decodeURIComponent(item.href).endsWith(
        decodeURIComponent(currentPath).replace(/\/$/, ""),
      ),
  );

  return (
    <>
      <div className="fixed bottom-6 left-4 z-30 lg:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="bg-surface"
              aria-label={tA11y("toggleArticleTree")}
            >
              <Menu aria-hidden="true" />
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

      <div className="relative flex w-full min-w-0 flex-1 gap-4 lg:-mx-8 lg:w-[calc(100%+4rem)]">
        <aside className={`t-resize relative hidden shrink-0 lg:block ${siteOpen ? "w-64" : "w-8"}`}>
          <div className="sticky top-24 flex h-[calc(100dvh-7rem)] min-h-0">
            <div id="article-chapters" inert={!siteOpen} className={`flex w-56 shrink-0 flex-col ${siteOpen ? "" : "invisible"}`}>
              <h2 className="pb-3 pl-5 text-sm font-semibold">{t("title")}</h2>
              <SiteNavigation items={items} activeIndex={activeIndex} />
            </div>
            <IconButton
              size="icon-sm"
              className="absolute top-0 right-0"
              label={siteOpen ? tA11y("hideChapterNav") : tA11y("showChapterNav")}
              aria-controls="article-chapters"
              aria-expanded={siteOpen}
              onClick={() => setSiteOpen((open) => !open)}>
              <span className="t-icon-swap" data-state={siteOpen ? "a" : "b"}>
                <PanelLeftClose className="t-icon" data-icon="a" aria-hidden />
                <PanelLeftOpen className="t-icon" data-icon="b" aria-hidden />
              </span>
            </IconButton>
          </div>
        </aside>
        <div ref={contentRef} data-reader-content className="min-w-0 flex-1">
          {children}
        </div>
        <aside className="relative z-20 hidden w-10 shrink-0 lg:block">
          <ArticleOutlineNavigation outline={outline} />
        </aside>
      </div>
      <ArticleOutlineNavigation outline={outline} mobile />
    </>
  );
}
