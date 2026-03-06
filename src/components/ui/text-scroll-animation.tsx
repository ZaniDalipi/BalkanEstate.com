"use client";
import { motion, MotionValue, useTransform } from "framer-motion";
import React from "react";
import { cn } from "@/src/lib/utils";

interface CharacterProps {
  char: string;
  index: number;
  centerIndex: number;
  scrollYProgress: MotionValue<number>;
}

const CharacterV1: React.FC<CharacterProps> = ({
  char,
  index,
  centerIndex,
  scrollYProgress,
}) => {
  const isSpace = char === " ";
  const distanceFromCenter = index - centerIndex;
  const x = useTransform(scrollYProgress, [0, 0.5], [distanceFromCenter * 50, 0]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5], [distanceFromCenter * 50, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0.15, 1]);

  return (
    <motion.span
      className={cn("inline-block", isSpace && "w-[0.3em]")}
      style={{ x, rotateX, opacity }}
    >
      {char}
    </motion.span>
  );
};

const CharacterV2: React.FC<CharacterProps & { children?: React.ReactNode }> = ({
  index,
  centerIndex,
  scrollYProgress,
  children,
}) => {
  const distanceFromCenter = index - centerIndex;
  const x = useTransform(scrollYProgress, [0, 0.5], [distanceFromCenter * 80, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.7, 1]);
  const y = useTransform(scrollYProgress, [0, 0.5], [Math.abs(distanceFromCenter) * 60, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);

  return (
    <motion.div
      className="shrink-0 will-change-transform"
      style={{ x, scale, y, opacity, transformOrigin: "center" }}
    >
      {children}
    </motion.div>
  );
};

const CharacterV3: React.FC<CharacterProps & { children?: React.ReactNode }> = ({
  index,
  centerIndex,
  scrollYProgress,
  children,
}) => {
  const distanceFromCenter = index - centerIndex;
  const x = useTransform(scrollYProgress, [0, 0.5], [distanceFromCenter * 90, 0]);
  const rotate = useTransform(scrollYProgress, [0, 0.5], [distanceFromCenter * 30, 0]);
  const y = useTransform(scrollYProgress, [0, 0.5], [-Math.abs(distanceFromCenter) * 30, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.6, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.25], [0, 1]);

  return (
    <motion.div
      className="shrink-0 will-change-transform"
      style={{ x, rotate, y, scale, opacity, transformOrigin: "center" }}
    >
      {children}
    </motion.div>
  );
};

export { CharacterV1, CharacterV2, CharacterV3 };
export type { CharacterProps };
