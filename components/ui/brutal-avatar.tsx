import React from "react"
import Image from "next/image"

interface BrutalAvatarProps {
  src?: string | null
  alt?: string | null
  size?: string
  fallback?: string
  className?: string
}

export function BrutalAvatar({
  src,
  alt,
  fallback,
  className = "",
}: BrutalAvatarProps) {
  return (
    <div
      className={`border-tech-main/40 group hover:border-tech-main relative box-border flex aspect-square h-full w-full items-center justify-center overflow-hidden border-2 bg-slate-100 transition-all duration-300 ${className}`}>
      {/* 科技感装饰元素 */}
      <div className="pointer-events-none absolute inset-0 z-10 opacity-70 transition-opacity duration-300 group-hover:opacity-100">
        {/* 中心十字准星 */}
        <div className="bg-tech-main/40 absolute top-1/2 left-1/2 h-[1px] w-4 -translate-x-1/2 -translate-y-1/2"></div>
        <div className="bg-tech-main/40 absolute top-1/2 left-1/2 h-4 w-[1px] -translate-x-1/2 -translate-y-1/2"></div>

        {/* 动态扫描线 */}
        <div className="bg-tech-main/40 absolute top-1/4 right-0 left-0 h-[1px]"></div>
        <div className="bg-tech-main/40 absolute right-0 bottom-1/4 left-0 h-[1px]"></div>

        {/* 边角装饰 - 左上 */}
        <div className="border-tech-main/40 absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2"></div>
        {/* 边角装饰 - 右上 */}
        <div className="border-tech-main/40 absolute top-0 right-0 h-3 w-3 border-t-2 border-r-2"></div>
        {/* 边角装饰 - 左下 */}
        <div className="border-tech-main/40 absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2"></div>
        {/* 边角装饰 - 右下 */}
        <div className="border-tech-main/40 absolute right-0 bottom-0 h-3 w-3 border-r-2 border-b-2"></div>

        {/* 额外的数据点 */}
        <div className="bg-tech-main/60 absolute top-1 left-4 h-1 w-1"></div>
        <div className="bg-tech-main/60 absolute right-4 bottom-1 h-1 w-1"></div>

        {/* 边框缺口效果 */}
        <div className="absolute top-0 left-1/2 h-[2px] w-4 -translate-x-1/2 bg-white"></div>
        <div className="absolute bottom-0 left-1/2 h-[2px] w-4 -translate-x-1/2 bg-white"></div>
      </div>

      {/* 内层框架 */}
      <div className="border-tech-main/20 pointer-events-none absolute inset-1 z-[5] border"></div>

      {src ? (
        <Image
          src={src}
          alt={alt || "Avatar"}
          fill
          unoptimized
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover p-1 saturate-[0.85] transition-transform duration-500 group-hover:scale-105 group-hover:saturate-100"
        />
      ) : (
        <span className="text-tech-main/50 group-hover:text-tech-main z-0 font-mono text-xl font-bold tracking-widest uppercase transition-colors">
          {(fallback || alt || "?")[0]}
        </span>
      )}
    </div>
  )
}
