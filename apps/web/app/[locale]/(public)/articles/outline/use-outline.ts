"use client";

import { useEffect, useState } from "react";

export type OutlineDepth = 1 | 2 | 3 | 4;

export interface OutlineItem {
  id: string;
  text: string;
  depth: OutlineDepth;
  isAdvanced: boolean;
}

const OUTLINE_HEADING_SELECTOR =
  "[data-article-content] h1[id], [data-article-content] h2[id], [data-article-content] h3[id], [data-article-content] h4[id]";

function getOutlineDepth(heading: Element): OutlineDepth {
  if (heading.tagName === "H2") return 2;
  if (heading.tagName === "H3") return 3;
  if (heading.tagName === "H4") return 4;
  return 1;
}

function scanHeadings(): OutlineItem[] {
  if (typeof document === "undefined") return [];
  const headings = document.querySelectorAll(OUTLINE_HEADING_SELECTOR);
  if (headings.length === 0) return [];

  const outlineItems: OutlineItem[] = [];
  const seenIds = new Map<string, number>();
  headings.forEach((heading) => {
    if (heading.id && heading.textContent) {
      const clone = heading.cloneNode(true) as Element;
      clone.querySelectorAll('[aria-hidden="true"]').forEach((el) => {
        el.remove();
      });
      const text = clone.textContent?.replace(/^#\s*/, "") ?? "";

      let uniqueId = heading.id;
      const count = seenIds.get(heading.id) ?? 0;
      if (count > 0) {
        uniqueId = `${heading.id}-${count}`;
      }
      seenIds.set(heading.id, count + 1);

      outlineItems.push({
        id: uniqueId,
        text,
        depth: getOutlineDepth(heading),
        isAdvanced: heading.getAttribute("data-advanced") === "true",
      });
    }
  });
  return outlineItems;
}

export function useOutline(): OutlineItem[] {
  const [outline, setOutline] = useState<OutlineItem[]>([]);

  useEffect(() => {
    const updateOutline = () => {
      const next = scanHeadings();
      setOutline((previous) =>
        previous.length === next.length &&
        previous.every(
          (item, index) =>
            item.id === next[index]?.id &&
            item.text === next[index]?.text &&
            item.depth === next[index]?.depth &&
            item.isAdvanced === next[index]?.isAdvanced,
        )
          ? previous
          : next,
      );
    };

    const frame = requestAnimationFrame(() => {
      updateOutline();
    });

    const observer = new MutationObserver(updateOutline);

    const main = document.querySelector("main") || document.body;
    observer.observe(main, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return outline;
}
