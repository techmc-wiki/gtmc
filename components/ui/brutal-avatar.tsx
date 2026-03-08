import React from "react";
import Image from "next/image";

interface BrutalAvatarProps {
  src?: string | null;
  alt?: string | null;
  size?: string;
  fallback?: string;
  className?: string;
}

export function BrutalAvatar({ src, alt, size, fallback, className = "" }: BrutalAvatarProps) {
  return (
    <div className={`relative flex items-center justify-center bg-slate-100 border-2 border-tech-main/40 overflow-hidden w-full h-full aspect-square group transition-all duration-300 hover:border-tech-main box-border ${className}`}>
      {/* 科技感装饰元素 */}
      <div className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-300 opacity-70 group-hover:opacity-100">
        {/* 中心十字准星 */}
        <div className="absolute top-1/2 left-1/2 w-4 h-[1px] bg-tech-main/40 -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute top-1/2 left-1/2 h-4 w-[1px] bg-tech-main/40 -translate-x-1/2 -translate-y-1/2"></div>
        
        {/* 动态扫描线 */}
        <div className="absolute top-1/4 left-0 right-0 h-[1px] bg-tech-main/30 opacity-50"></div>
        <div className="absolute bottom-1/4 left-0 right-0 h-[1px] bg-tech-main/30 opacity-50"></div>

        {/* 边角装饰 - 左上 */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-tech-main"></div>
        {/* 边角装饰 - 右上 */}
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-tech-main"></div>
        {/* 边角装饰 - 左下 */}
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-tech-main"></div>
        {/* 边角装饰 - 右下 */}
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-tech-main"></div>

        {/* 额外的数据点 */}
        <div className="absolute top-1 left-4 w-1 h-1 bg-tech-main/60"></div>
        <div className="absolute bottom-1 right-4 w-1 h-1 bg-tech-main/60"></div>
        
        {/* 边框缺口效果 */}
        <div className="absolute top-0 left-1/2 w-4 h-[2px] bg-white -translate-x-1/2"></div>
        <div className="absolute bottom-0 left-1/2 w-4 h-[2px] bg-white -translate-x-1/2"></div>
      </div>
      
      {/* 内层框架 */}
      <div className="absolute inset-1 border border-tech-main/20 pointer-events-none z-[5]"></div>
      
      {src ? (
        <Image
          src={src}
          alt={alt || "Avatar"}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover p-1 group-hover:scale-105 transition-transform duration-500 saturate-[0.85] group-hover:saturate-100"
        />
      ) : (
        <span className="font-mono text-xl font-bold tracking-widest text-tech-main/50 uppercase z-0 group-hover:text-tech-main transition-colors">
          {(fallback || alt || "?")[0]}
        </span>
      )}
    </div>
  );
}

