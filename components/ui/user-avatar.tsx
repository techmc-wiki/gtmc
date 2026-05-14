import React from "react"
import Image from "next/image"

interface UserAvatarProps {
  src?: string | null
  alt?: string | null
  size?: string
  fallback?: string
  className?: string
}

export function UesrAvatar({
  src,
  alt,
  fallback,
  className = "",
}: UserAvatarProps) {
  return (
    <div
      className={`group corner-bracket hover:border-tech-main relative box-border flex aspect-square size-full items-center justify-center overflow-hidden bg-slate-100 transition-all duration-300 ${className} `}>
      {/* 科技感装饰元素 */}
      <div className="pointer-events-none absolute inset-0 z-10 opacity-70 transition-opacity duration-300 group-hover:opacity-100">
        {/* 中心十字准星 */}
        <div className="bg-tech-main/40 absolute top-1/2 left-1/2 h-px w-4 -translate-1/2" />
        <div className="bg-tech-main/40 absolute top-1/2 left-1/2 h-4 w-px -translate-1/2" />

        {/* 动态扫描线 */}
        <div className="bg-tech-main/40 absolute inset-x-0 top-1/4 h-px" />
        <div className="bg-tech-main/40 absolute inset-x-0 bottom-1/4 h-px" />

        {/* 边角装饰 - 左上 */}
        <div className="border-tech-main/40 absolute top-0 left-0 size-3 border-t-2 border-l-2" />
        {/* 边角装饰 - 右上 */}
        <div className="border-tech-main/40 absolute top-0 right-0 size-3 border-t-2 border-r-2" />
        {/* 边角装饰 - 左下 */}
        <div className="border-tech-main/40 absolute bottom-0 left-0 size-3 border-b-2 border-l-2" />
        {/* 边角装饰 - 右下 */}
        <div className="border-tech-main/40 absolute right-0 bottom-0 size-3 border-r-2 border-b-2" />

        {/* 额外的数据点 */}
        <div className="bg-tech-main/60 absolute top-1 left-4 size-1" />
        <div className="bg-tech-main/60 absolute right-4 bottom-1 size-1" />

        {/* 边框缺口效果 */}
        <div className="absolute top-0 left-1/2 h-0.5 w-4 -translate-x-1/2 bg-white" />
        <div className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 bg-white" />
      </div>

      {/* 内层框架 */}
      <div className="guide-line pointer-events-none absolute inset-1 z-5 border" />

      {src ? (
        <Image
          src={src}
          alt={alt || "Avatar"}
          fill
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
