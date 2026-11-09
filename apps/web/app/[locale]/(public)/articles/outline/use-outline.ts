"use client";

import { useEffect, useState } from "react";

export type OutlineDepth = 1 | 2 | 3;

export interface OutlineItem {
  id: string;
  text: string;
  depth: OutlineDepth;
  isAdvanced: boolean;
}

const OUTLINE_HEADING_SELECTOR = "main h2[id], main h3[id], main h4[id]";
const HEADING_TAG_SELECTOR = "h2, h3, h4";
const TRACKED_HEADING_ATTRIBUTES = ["id", "data-advanced"];

const EMPTY_OUTLINE: OutlineItem[] = [];

function getOutlineDepth(heading: Element): OutlineDepth {
  if (heading.tagName === "H3") return 2;
  if (heading.tagName === "H4") return 3;
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

function outlineItemsEqual(a: OutlineItem[], b: OutlineItem[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => {
    const other = b[index];
    return (
      other !== undefined &&
      item.id === other.id &&
      item.text === other.text &&
      item.depth === other.depth &&
      item.isAdvanced === other.isAdvanced
    );
  });
}

function containsHeadingNode(node: Node): boolean {
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  if (element === null) return false;
  if (element.closest(HEADING_TAG_SELECTOR) !== null) return true;
  return element.querySelector(HEADING_TAG_SELECTOR) !== null;
}

function isOutlineRelevantMutation(record: MutationRecord): boolean {
  const target =
    record.target.nodeType === Node.ELEMENT_NODE
      ? (record.target as Element)
      : record.target.parentElement;
  if (target === null || target.closest("main") === null) return false;

  // A page swap replaces <main>'s children wholesale; rescan even when the incoming
  // article has no headings so the previous outline is cleared.
  if (record.type === "childList" && target.tagName === "MAIN") return true;

  if (record.type === "attributes" || record.type === "characterData") {
    return containsHeadingNode(record.target);
  }

  // Children changed on the heading itself (or inside it), e.g. streamed text.
  if (target.closest(HEADING_TAG_SELECTOR) !== null) return true;

  for (const node of record.addedNodes) {
    if (containsHeadingNode(node)) return true;
  }
  for (const node of record.removedNodes) {
    if (containsHeadingNode(node)) return true;
  }
  return false;
}

interface OutlineState {
  pathname: string;
  items: OutlineItem[];
}

export function useOutline(pathname: string): OutlineItem[] {
  const [state, setState] = useState<OutlineState>({ pathname, items: EMPTY_OUTLINE });

  useEffect(() => {
    if (typeof document === "undefined") return;

    let frame: number | null = null;

    const commit = (items: OutlineItem[]) => {
      setState((previous) => {
        if (previous.pathname === pathname && outlineItemsEqual(previous.items, items)) {
          return previous;
        }
        return { pathname, items };
      });
    };

    const scheduleScan = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        commit(scanHeadings());
      });
    };

    const observer = new MutationObserver((records) => {
      if (records.some(isOutlineRelevantMutation)) scheduleScan();
    });

    // Observe the whole document so a persisted reader layout keeps tracking content
    // replaced by client-side navigation, but only rescan for mutations that can
    // change headings inside the article. The outline is rendered outside <main>,
    // so its own DOM updates never schedule another scan.
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRACKED_HEADING_ATTRIBUTES,
    });

    commit(scanHeadings());

    return () => {
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [pathname]);

  // A pathname change hides the previous article's outline immediately; the scan for
  // the newly committed article happens in the effect above and on streamed mutations.
  return state.pathname === pathname ? state.items : EMPTY_OUTLINE;
}
