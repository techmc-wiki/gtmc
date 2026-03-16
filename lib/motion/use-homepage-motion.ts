'use client';

import { useEffect, useState } from 'react';
import {
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  MotionValue,
} from 'motion/react';
import { HOMEPAGE_MOTION } from './homepage-constants';

export interface LayerTransform {
  x: MotionValue<number>;
  y: MotionValue<number>;
  filter: MotionValue<string>;
}

export interface ForegroundTransform extends LayerTransform {
  rotateX: MotionValue<number>;
  rotateY: MotionValue<number>;
}

export interface HomepageMotionValues {
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  isReducedMotion: boolean;
  isMobile: boolean;
  foreground: ForegroundTransform;
  midground: LayerTransform;
  background: LayerTransform;
}

export function useHomepageMotion(): HomepageMotionValues {
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const reducedMotionQuery = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile || reducedMotionQuery) return;

    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const normalizedX = (e.clientX - centerX) / centerX;
      const normalizedY = (e.clientY - centerY) / centerY;
      pointerX.set(normalizedX);
      pointerY.set(normalizedY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [pointerX, pointerY, isMobile, reducedMotionQuery]);

  const smoothX = useSpring(pointerX, { damping: 20, stiffness: 300 });
  const smoothY = useSpring(pointerY, { damping: 20, stiffness: 300 });

  // Pointer distance from center (0 at center, ~1.41 at corners), clamped to [0,1]
  const pointerDist = useTransform([smoothX, smoothY], ([x, y]: number[]) =>
    Math.min(1, Math.sqrt(x * x + y * y))
  );

  const config = reducedMotionQuery
    ? HOMEPAGE_MOTION.reducedMotion
    : isMobile
      ? HOMEPAGE_MOTION.mobile
      : HOMEPAGE_MOTION.desktop;

  const blurMax = reducedMotionQuery
    ? { foreground: 0, midground: 0, background: 0 }
    : HOMEPAGE_MOTION.blurMax;

  const fgBlur = useTransform(pointerDist, (d) => d * blurMax.foreground);
  const mgBlur = useTransform(pointerDist, (d) => d * blurMax.midground);
  const bgBlur = useTransform(pointerDist, (d) => d * blurMax.background);

  const foreground: ForegroundTransform = {
    x: useTransform(smoothX, (v) => v * config.pointerAmplitude * HOMEPAGE_MOTION.layers.foreground * 20),
    y: useTransform(smoothY, (v) => v * config.pointerAmplitude * HOMEPAGE_MOTION.layers.foreground * 20),
    filter: useTransform(fgBlur, (v) => `blur(${v}px)`),
    rotateX: useTransform(smoothY, (v) => v * -2),
    rotateY: useTransform(smoothX, (v) => v * 2),
  };

  const midground: LayerTransform = {
    x: useTransform(smoothX, (v) => v * config.pointerAmplitude * HOMEPAGE_MOTION.layers.midground * 20),
    y: useTransform(smoothY, (v) => v * config.pointerAmplitude * HOMEPAGE_MOTION.layers.midground * 20),
    filter: useTransform(mgBlur, (v) => `blur(${v}px)`),
  };

  const background: LayerTransform = {
    x: useTransform(smoothX, (v) => v * config.pointerAmplitude * HOMEPAGE_MOTION.layers.background * 20),
    y: useTransform(smoothY, (v) => v * config.pointerAmplitude * HOMEPAGE_MOTION.layers.background * 20),
    filter: useTransform(bgBlur, (v) => `blur(${v}px)`),
  };

  return {
    pointerX,
    pointerY,
    isReducedMotion: reducedMotionQuery ?? false,
    isMobile,
    foreground,
    midground,
    background,
  };
}
