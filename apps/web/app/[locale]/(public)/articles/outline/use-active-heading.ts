"use client";

import { useState, useEffect } from "react";
import type { OutlineItem } from "./use-outline";
import { addSiteScrollListener } from "@/hooks/site-scroll-root";

interface HeadingEntry {
  id: string;
  element: Element;
}

function getOutlineHeadingElement(id: string): Element | null {
  if (typeof document === "undefined") return null;

  const escapedId = CSS.escape(id);
  return document.querySelector(`main h2#${escapedId}, main h3#${escapedId}, main h4#${escapedId}`);
}

function getHeadingEntries(toc: OutlineItem[]): HeadingEntry[] {
  return toc.flatMap((item) => {
    const element = getOutlineHeadingElement(item.id);
    return element ? [{ id: item.id, element }] : [];
  });
}

function computeActiveHeading(toc: OutlineItem[]): string | null {
  if (!toc || toc.length === 0) return null;

  const headingEntries = getHeadingEntries(toc);

  if (headingEntries.length === 0) return null;

  const threshold = typeof window !== "undefined" ? window.innerHeight * 0.25 : 0;
  let activeId: string | null = headingEntries[0]?.id ?? null;
  for (const entry of headingEntries) {
    const rect = entry.element.getBoundingClientRect();
    if (rect.top <= threshold) {
      activeId = entry.id;
    } else {
      break;
    }
  }
  return activeId;
}

export function useActiveHeading(toc: OutlineItem[]): string | null {
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(() =>
    computeActiveHeading(toc),
  );

  useEffect(() => {
    const updateActiveHeading = () => {
      setActiveHeadingId(computeActiveHeading(toc));
    };

    // Compute as soon as an outline appears or is replaced: on the first outline, on a
    // route change (useOutline yields the empty outline for the new pathname, then the
    // re-tagged items) and when headings stream in after the initial scan. Waiting for
    // a scroll event would leave the previous heading highlighted indefinitely.
    updateActiveHeading();

    if (toc.length === 0) return;

    return addSiteScrollListener(updateActiveHeading, { passive: true });
  }, [toc]);

  return activeHeadingId;
}
