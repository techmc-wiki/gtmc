"use client";

import { usePathname } from "next/navigation";

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="animate-page-transit min-h-[calc(100vh-8rem)]">
      {children}
    </div>
  );
}
