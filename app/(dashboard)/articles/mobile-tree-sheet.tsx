"use client";

import * as React from "react";

interface MobileTreeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function MobileTreeSheet({ isOpen, onClose, children }: MobileTreeSheetProps) {
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-x-0 top-16 bottom-0 z-[60] md:hidden"
      data-testid="mobile-tree-sheet"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
        data-testid="mobile-tree-backdrop"
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="border-tech-main/40 absolute inset-0 flex flex-col overflow-hidden border-b bg-white/95 backdrop-blur-md">
        {/* Header */}
        <div
          className="border-tech-main/40 flex shrink-0 items-center justify-between border-b px-4 py-3"
          data-testid="mobile-tree-panel-header"
        >
          <div className="text-tech-main/60 flex items-center font-mono text-xs font-bold tracking-[0.2em] uppercase">
            <span className="bg-tech-main/60 mr-2 inline-block h-1.5 w-1.5 animate-pulse"></span>
            SYS.DIR_TREE
          </div>
          <button
            onClick={onClose}
            className="text-tech-main hover:bg-tech-main/10 cursor-pointer px-3 py-2 font-mono text-xs font-bold tracking-[0.15em] uppercase transition-colors"
            data-testid="mobile-tree-close"
            aria-label="Close tree"
          >
            CLOSE
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
