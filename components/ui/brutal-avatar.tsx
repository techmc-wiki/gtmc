import * as React from "react";

export function BrutalAvatar({ src, alt, size = "md" }: { src?: string | null; alt?: string | null; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-24 h-24 border-4",
  };

  if (!src) {
    return (
      <div className={`${sizeClasses[size]} border-2 border-black rounded-full bg-neon-green shadow-brutal-sm flex items-center justify-center font-black uppercase overflow-hidden`}>
        {alt ? alt.slice(0, 2) : "?"}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      className={`${sizeClasses[size]} border-2 border-black rounded-full shadow-brutal-sm object-cover bg-white`}
      alt={alt || "Avatar"}
    />
  );
}
