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
        className="hover:bg-tech-main/10 flex min-h-[44px] min-w-[44px] cursor-pointer flex-col items-center justify-center gap-1.5 p-2 transition-colors md:hidden"
        aria-label="Toggle navigation menu"
        aria-expanded={isDrawerOpen}
      >
        <span
          className={`bg-tech-main h-0.5 w-5 transition-all ${isDrawerOpen ? "translate-y-2 rotate-45" : ""}`}
        ></span>
        <span
          className={`bg-tech-main h-0.5 w-5 transition-all ${isDrawerOpen ? "opacity-0" : ""}`}
        ></span>
        <span
          className={`bg-tech-main h-0.5 w-5 transition-all ${isDrawerOpen ? "-translate-y-2 -rotate-45" : ""}`}
        ></span>
      </button>

      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`border-tech-main/40 fixed top-16 right-0 left-0 z-40 overflow-hidden border-b bg-white/95 backdrop-blur-md transition-all duration-300 md:hidden ${
          isDrawerOpen ? "max-h-screen" : "max-h-0"
        }`}
      >
        <div className="space-y-2 p-4 sm:p-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="border-tech-main/40 hover:bg-tech-main text-tech-main-dark block flex min-h-[44px] items-center border bg-white/60 p-3 font-mono text-xs tracking-[0.15em] transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
