"use client";

import * as React from "react";
import { createPortal } from "react-dom";

interface MobileTreeCardProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  isFloating?: boolean;
}

export function MobileTreeCard({ isOpen, onClose, children, isFloating }: MobileTreeCardProps) {
  const canUseDOM = typeof document !== "undefined";

  React.useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!canUseDOM || !isOpen || !isFloating) return null;

  return createPortal(
    <div className="fixed inset-0 z-[59] md:hidden">
      <div
        className="animate-fade-in absolute inset-0 bg-slate-950/35 backdrop-blur-md"
        onClick={onClose}
        data-testid="mobile-tree-card-backdrop"
        aria-hidden="true"
      />

      <div
        className="border-tech-main/40 animate-tech-pop-in absolute top-1/2 left-1/2 z-[60] flex max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-[24rem] -translate-x-1/2 -translate-y-1/2 flex-col border bg-white/95 backdrop-blur-md"
        data-testid="mobile-tree-card"
      >
        <div className="border-tech-main/40 pointer-events-none absolute top-0 left-0 h-2 w-2 -translate-x-[1px] -translate-y-[1px] border-t-2 border-l-2" />
        <div className="border-tech-main/40 pointer-events-none absolute top-0 right-0 h-2 w-2 translate-x-[1px] -translate-y-[1px] border-t-2 border-r-2" />
        <div className="border-tech-main/40 pointer-events-none absolute bottom-0 left-0 h-2 w-2 -translate-x-[1px] translate-y-[1px] border-b-2 border-l-2" />
        <div className="border-tech-main/40 pointer-events-none absolute right-0 bottom-0 h-2 w-2 translate-x-[1px] translate-y-[1px] border-r-2 border-b-2" />

        <div
          className="border-tech-main/40 flex shrink-0 items-center justify-between border-b px-4 py-3"
          data-testid="mobile-tree-card-header"
        >
          <div className="text-tech-main/60 flex items-center gap-2 font-mono text-xs font-bold tracking-[0.2em] uppercase">
            <span className="bg-tech-main/60 h-1.5 w-1.5 animate-pulse" />
            SYS.DIR_TREE
          </div>
          <button
            onClick={onClose}
            className="text-tech-main hover:bg-tech-main/10 cursor-pointer px-3 py-2 font-mono text-xs font-bold tracking-[0.15em] uppercase transition-colors"
            data-testid="mobile-tree-card-close"
            aria-label="Close tree"
          >
            CLOSE
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
