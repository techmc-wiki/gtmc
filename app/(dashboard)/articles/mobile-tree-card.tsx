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
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-md animate-fade-in"
        onClick={onClose}
        data-testid="mobile-tree-card-backdrop"
        aria-hidden="true"
      />

      <div
        className="absolute top-20 right-4 left-4 z-[60] ml-auto flex max-h-[calc(100vh-5rem)] max-w-[24rem] flex-col border border-tech-main/40 bg-white/95 backdrop-blur-md animate-tech-pop-in"
        data-testid="mobile-tree-card"
      >
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-tech-main/40 -translate-x-[1px] -translate-y-[1px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-tech-main/40 translate-x-[1px] -translate-y-[1px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-tech-main/40 -translate-x-[1px] translate-y-[1px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-tech-main/40 translate-x-[1px] translate-y-[1px] pointer-events-none" />

        <div
          className="flex items-center justify-between border-b border-tech-main/40 px-4 py-3 flex-shrink-0"
          data-testid="mobile-tree-card-header"
        >
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-tech-main/60 font-bold flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-tech-main/60 animate-pulse" />
            SYS.DIR_TREE
          </div>
          <button
            onClick={onClose}
            className="font-mono text-xs tracking-[0.15em] text-tech-main hover:bg-tech-main/10 px-3 py-2 transition-colors font-bold uppercase"
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
