import * as React from "react";
import Link from "next/link";

import { ProfileButton } from "@/components/ui/profile-button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen text-tech-main font-sans selection:bg-tech-main/20 selection:text-tech-main-dark flex flex-col relative w-full overflow-x-hidden">
      {/* Top Navigation - Tech/Brutalist Style */}
      <nav className="border-b border-tech-main/40 bg-white/60 backdrop-blur-md sticky top-0 z-50">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-tech-main/20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 md:h-20 items-center">
            <div className="flex items-center space-x-4 md:space-x-8">
              <Link href="/" className="text-xl md:text-2xl font-black tracking-tighter uppercase bg-tech-main-dark text-white px-3 py-1 -skew-x-12 hover:skew-x-0 transition-transform flex items-center shadow-[2px_2px_0px_theme(colors.tech.main/50)]">
                <span className="opacity-70 mr-2 text-xs font-mono font-normal">{'//'}</span>GTMC
              </Link>
              <div className="hidden md:flex space-x-6 pt-1">
                <Link href="/articles" className="font-mono text-xs tracking-[0.15em] border-b-2 border-transparent hover:border-tech-main text-tech-main-dark hover:text-tech-main transition-colors pb-1">
                  DATABASE
                </Link>
                <Link href="/draft" className="font-mono text-xs tracking-[0.15em] border-b-2 border-transparent hover:border-tech-main text-tech-main-dark hover:text-tech-main transition-colors pb-1">
                  MY DRAFTS
                </Link>
                <Link href="/review" className="font-mono text-xs tracking-[0.15em] border-b-2 border-transparent hover:border-tech-main text-tech-main-dark hover:text-tech-main transition-colors pb-1">
                  REVIEW HUB
                </Link>
              </div>
            </div>
            
            <div className="flex items-center">
              <React.Suspense fallback={<div className="w-8 h-8 md:w-10 md:h-10 border border-tech-main/40 rounded-none bg-tech-main/10 animate-pulse" />}>
                <ProfileButton />
              </React.Suspense>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto relative z-10 p-4 sm:p-6 lg:p-8">
        <div className="absolute top-0 left-0 w-[1px] h-full bg-tech-main/10 hidden lg:block"></div>
        <div className="absolute top-0 right-0 w-[1px] h-full bg-tech-main/10 hidden lg:block"></div>
        {children}
      </main>
    </div>
  );
}