"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import ProximitySidebar from "@/components/ui/shadcn/proximity-sidebar";
import { ScrollProgress } from "@/components/ui/shadcn/scroll-progress";
import { SITE_SCROLL_ROOT_ID } from "@/hooks/site-scroll-root";
import type { OutlineItem } from "@/app/[locale]/(public)/articles/outline/use-outline";

export function ArticleOutlineNavigation({
  outline,
  mobile = false,
}: {
  outline: OutlineItem[];
  mobile?: boolean;
}) {
  const t = useTranslations("Outline");
  const scrollRootRef = React.useRef<HTMLElement | null>(null);
  const [scrollRootReady, setScrollRootReady] = React.useState(false);

  React.useEffect(() => {
    if (!mobile) return;
    scrollRootRef.current = document.getElementById(SITE_SCROLL_ROOT_ID);
    const frame = requestAnimationFrame(() => setScrollRootReady(true));
    return () => cancelAnimationFrame(frame);
  }, [mobile]);

  if (mobile) {
    return scrollRootReady && outline.length > 0 ? (
      <ScrollProgress
        sections={outline}
        containerRef={scrollRootRef}
        ariaLabel={t("openSheet")}
        className="lg:hidden"
      />
    ) : null;
  }

  return (
    <div className="sticky top-24 flex h-[calc(100dvh-7rem)] min-h-0 flex-col">
      {outline.length > 0 && (
        <ProximitySidebar sections={outline} ariaLabel={t("railLabel")} />
      )}
    </div>
  );
}
