"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface CardItem {
  id: number | string;
  content: React.ReactNode;
}

interface AnimatedCardsStackProps {
  items: CardItem[];
  /**
   * Time in ms before auto-advancing to the next card.
   * Set to 0 to disable auto-play.
   * @default 5000
   */
  autoPlayInterval?: number;
  /** @default 320 */
  width?: number;
  /** @default 400 */
  height?: number;
  /** Vertical offset between stacked cards in px @default 12 */
  stackOffset?: number;
  /** Scale reduction per stacked card @default 0.06 */
  scaleStep?: number;
  /** Max number of visible cards behind the active one @default 3 */
  maxVisibleCards?: number;
  className?: string;
}

const cardVariants = {
  enter: {
    y: -60,
    opacity: 0,
    scale: 0.95,
    rotateX: 8,
  },
  active: {
    y: 0,
    opacity: 1,
    scale: 1,
    rotateX: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 24,
      mass: 0.8,
    },
  },
  exit: {
    y: 40,
    opacity: 0,
    scale: 0.9,
    rotateX: -5,
    transition: {
      duration: 0.3,
      ease: "easeIn",
    },
  },
};

export function AnimatedCardsStack({
  items,
  autoPlayInterval = 5000,
  width = 320,
  height = 400,
  stackOffset = 12,
  scaleStep = 0.06,
  maxVisibleCards = 3,
  className = "",
}: AnimatedCardsStackProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const next = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const prev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (!autoPlayInterval || autoPlayInterval <= 0) return;
    const interval = setInterval(next, autoPlayInterval);
    return () => clearInterval(interval);
  }, [autoPlayInterval, next]);

  if (!items.length) return null;

  // Build visible stack: active card + cards behind it
  const visibleCards: { item: CardItem; stackIndex: number; originalIndex: number }[] = [];
  for (let i = 0; i <= maxVisibleCards; i++) {
    const idx = (activeIndex + i) % items.length;
    visibleCards.push({ item: items[idx], stackIndex: i, originalIndex: idx });
  }

  return (
    <div
      className={`relative ${className}`}
      style={{
        width,
        height: height + stackOffset * maxVisibleCards,
        perspective: 1200,
      }}
    >
      {/* Stacked cards behind (rendered first so they appear behind) */}
      {visibleCards
        .slice()
        .reverse()
        .map(({ item, stackIndex, originalIndex }) => {
          if (stackIndex === 0) {
            // Active card — handled by AnimatePresence below
            return null;
          }

          return (
            <motion.div
              key={`stack-${originalIndex}`}
              className="absolute inset-0 rounded-2xl overflow-hidden"
              style={{
                width,
                height,
              }}
              animate={{
                y: stackIndex * stackOffset,
                scale: 1 - stackIndex * scaleStep,
                opacity: 1 - stackIndex * 0.15,
              }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 24,
              }}
            >
              <div className="w-full h-full pointer-events-none select-none opacity-60">
                {item.content}
              </div>
            </motion.div>
          );
        })}

      {/* Active card with enter/exit animation */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={items[activeIndex].id}
          className="absolute inset-0 rounded-2xl overflow-hidden cursor-pointer shadow-xl"
          style={{ width, height, zIndex: 10 }}
          variants={cardVariants}
          initial="enter"
          animate="active"
          exit="exit"
          onClick={next}
        >
          {items[activeIndex].content}
        </motion.div>
      </AnimatePresence>

      {/* Navigation dots */}
      <div
        className="absolute flex gap-1.5 justify-center"
        style={{
          bottom: -8,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
        }}
      >
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === activeIndex
                ? "bg-white scale-125 shadow-sm"
                : "bg-white/40 hover:bg-white/60"
            }`}
            aria-label={`Go to card ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export default AnimatedCardsStack;
