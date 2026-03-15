"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLink {
  href: string;
  label: string;
}

interface MobileNavProps {
  navLinks: NavLink[];
}

export function MobileNav({ navLinks }: MobileNavProps) {
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        onClick={() => setIsDrawerOpen(!isDrawerOpen)}
        className="md:hidden flex flex-col gap-1.5 p-2 min-h-[44px] min-w-[44px] items-center justify-center hover:bg-tech-main/10 transition-colors"
        aria-label="Toggle navigation menu"
        aria-expanded={isDrawerOpen}
      >
        <span
          className={`w-5 h-0.5 bg-tech-main transition-all ${isDrawerOpen ? "rotate-45 translate-y-2" : ""}`}
        ></span>
        <span
          className={`w-5 h-0.5 bg-tech-main transition-all ${isDrawerOpen ? "opacity-0" : ""}`}
        ></span>
        <span
          className={`w-5 h-0.5 bg-tech-main transition-all ${isDrawerOpen ? "-rotate-45 -translate-y-2" : ""}`}
        ></span>
      </button>

      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed top-16 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-tech-main/40 z-40 md:hidden transition-all duration-300 overflow-hidden ${
          isDrawerOpen ? "max-h-screen" : "max-h-0"
        }`}
      >
        <div className="p-4 sm:p-6 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block font-mono text-xs tracking-[0.15em] border border-tech-main/40 bg-white/60 hover:bg-tech-main hover:text-white text-tech-main-dark transition-colors p-3 min-h-[44px] flex items-center"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
