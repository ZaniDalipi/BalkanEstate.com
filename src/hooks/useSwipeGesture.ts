import { useRef, useCallback } from 'react';
import type React from 'react';

interface UseSwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeDown?: () => void;
  minDistance?: number;
}

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  onSwipeDown,
  minDistance = 50,
}: UseSwipeGestureOptions): SwipeHandlers {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchMove = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchMove.current = null;
    touchStart.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchMove.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart.current || !touchMove.current) return;

    const xDelta = touchStart.current.x - touchMove.current.x;
    const yDelta = touchStart.current.y - touchMove.current.y;

    if (Math.abs(xDelta) > Math.abs(yDelta)) {
      if (xDelta > minDistance) onSwipeLeft?.();
      else if (xDelta < -minDistance) onSwipeRight?.();
    } else if (yDelta < -minDistance) {
      onSwipeDown?.();
    }

    touchStart.current = null;
    touchMove.current = null;
  }, [onSwipeLeft, onSwipeRight, onSwipeDown, minDistance]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
