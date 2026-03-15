import * as React from "react";
import Link from "next/link";

import { ProfileButton } from "@/components/ui/profile-button";
import { Logo } from "@/components/ui/logo";
import { MobileNav } from "./mobile-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navLinks = [
    { href: "/articles", label: "DATABASE" },
    { href: "/draft", label: "MY DRAFTS" },
    { href: "/review", label: "REVIEW HUB" },
    { href: "/features", label: "FEATURES" },
  ];

  return (
    <div className="min-h-screen text-tech-main font-sans selection:bg-tech-main/20 selection:text-tech-main-dark flex flex-col relative w-full">
      <nav className="border-b border-tech-main/40 bg-white/60 backdrop-blur-md sticky top-0 z-50">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-tech-main/20"></div>
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 md:h-20 items-center">
            <div className="flex items-center space-x-4 md:space-x-8">
              <Logo size="md" />
              <div className="hidden md:flex space-x-6 pt-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="font-mono text-xs tracking-[0.15em] border-b-2 border-transparent hover:border-tech-main text-tech-main-dark hover:text-tech-main transition-colors pb-1"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <MobileNav navLinks={navLinks} />
              <React.Suspense
                fallback={
                  <div className="w-8 h-8 md:w-10 md:h-10 border border-tech-main/40 rounded-none bg-tech-main/10 animate-pulse" />
                }
              >
                <ProfileButton />
              </React.Suspense>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-[1800px] mx-auto relative z-10 p-4 sm:p-6 lg:p-8">
        <div className="absolute top-0 left-0 w-[1px] h-full bg-tech-main/20 hidden lg:block"></div>
        <div className="absolute top-0 right-0 w-[1px] h-full bg-tech-main/20 hidden lg:block"></div>
        {children}
      </main>
    </div>
  );
}
