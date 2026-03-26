"use client";

import { useState, useCallback } from "react";

interface LazyImageProps {
  src: string;
  alt: string;
}

export function LazyImage({ src, alt }: LazyImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  const handleLoad = useCallback(() => {
    setStatus("loaded");
  }, []);

  const handleError = useCallback(() => {
    setStatus("error");
  }, []);

  return (
    <div className="my-8 relative grid max-w-full">
      {/* Skeleton */}
      <div
        className={`col-start-1 row-start-1 flex min-h-[200px] w-full flex-col border border-tech-main/30 bg-tech-main/5 p-1 shadow-sm z-10 ${
          status === "loaded"
            ? "animate-skeleton-exit pointer-events-none opacity-0 motion-reduce:animate-fade-out"
            : ""
        }`}
        aria-hidden="true"
      >
        <div className="relative flex h-full w-full flex-1 items-center justify-center overflow-hidden bg-tech-accent/10">
          {/* Corner brackets */}
          <div className="absolute left-0 top-0 size-2 border-l-2 border-t-2 border-tech-main/30" />
          <div className="absolute right-0 top-0 size-2 border-r-2 border-t-2 border-tech-main/30" />
          <div className="absolute bottom-0 left-0 size-2 border-b-2 border-l-2 border-tech-main/30" />
          <div className="absolute bottom-0 right-0 size-2 border-b-2 border-r-2 border-tech-main/30" />

          <span className="relative z-10 select-none text-[9px] uppercase tracking-widest text-tech-main/40">
            {status === "error" ? "// LOAD_FAIL" : "// IMG_LOAD"}
          </span>

          {status === "loading" && (
            <div className="absolute inset-0 animate-blueprint-sweep bg-linear-to-r from-transparent via-tech-accent/30 to-transparent motion-reduce:animate-none" />
          )}
        </div>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={handleLoad}
        onError={handleError}
        className={`col-start-1 row-start-1 h-auto max-w-full border border-tech-main/30 bg-tech-main/5 p-1 shadow-sm z-0 ${
          status === "loaded" ? "animate-fade-in motion-reduce:animate-none" : "opacity-0"
        }`}
      />
    </div>
  );
}
