import Link from "next/link";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  showSlash?: boolean;
}

export function Logo({ className = "", size = "md", showSlash = true }: LogoProps) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-xl",
    lg: "text-3xl",
    xl: "text-2xl sm:text-3xl md:text-5xl lg:text-6xl",
    "2xl": "text-3xl sm:text-4xl md:text-6xl lg:text-7xl",
  };

  const slashClasses = {
    sm: "text-[10px]",
    md: "text-sm",
    lg: "text-lg",
    xl: "text-sm sm:text-base md:text-2xl lg:text-3xl",
    "2xl": "text-base sm:text-lg md:text-3xl lg:text-4xl",
  };

  return (
    <Link
      href="/"
      className={`inline-flex items-center font-sans tracking-widest transition-opacity hover:opacity-80 ${sizeClasses[size]} ${className}`}
    >
      {showSlash && (
        <span className={`text-tech-main mr-1 font-light opacity-40 ${slashClasses[size]}`}>
          {"//"}
        </span>
      )}
      <span className="text-tech-main-dark font-bold">GTMC</span>
    </Link>
  );
}
