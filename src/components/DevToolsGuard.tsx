import React, { useState, useEffect, useRef, useCallback } from 'react';

const HOLD_DURATION = 2000;
const POLL_INTERVAL = 1000;
const SIZE_THRESHOLD = 100;

function generateRefId(): string {
  const h = (n: number, len: number) => Math.floor(n).toString(16).padStart(len, '0');
  const r = () => Math.random() * 0xffffffff;
  const t = Date.now();
  return `${h(t / 1000, 8)}-${h(r(), 4)}-${h(r(), 4)}-${h(r(), 4)}-${h(r(), 12)}`;
}

function isMobileDevice(): boolean {
  return (
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    window.matchMedia('(pointer: coarse)').matches
  );
}

function isDevToolsOpen(): boolean {
  if (typeof window === 'undefined') return false;
  // Mobile browsers have no DevTools — the outer/inner size diff is always
  // large there due to browser chrome (address bar, nav bar), so skip entirely.
  if (isMobileDevice()) return false;
  return (
    window.outerWidth - window.innerWidth > SIZE_THRESHOLD ||
    window.outerHeight - window.innerHeight > SIZE_THRESHOLD
  );
}

const DevToolsGuard: React.FC = () => {
  const [blocked, setBlocked] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const [refId] = useState(generateRefId);

  const holdingRef = useRef(false);
  const progressRef = useRef(0);
  const holdStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const triggerBlock = useCallback(() => {
    setBlocked(true);
    setProgress(0);
    setFailed(false);
    progressRef.current = 0;
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD) return;

    // Check immediately on mount (catches devtools already open at load time)
    if (isDevToolsOpen()) triggerBlock();

    // Poll as fallback for cases the resize event misses
    const poll = setInterval(() => {
      if (isDevToolsOpen()) triggerBlock();
    }, POLL_INTERVAL);

    // Instant detection: devtools docking/undocking resizes the viewport
    const onResize = () => {
      if (isDevToolsOpen()) triggerBlock();
    };
    window.addEventListener('resize', onResize);

    // Keyboard shortcut detection (capture phase fires before anything else)
    const onKey = (e: KeyboardEvent) => {
      const isDevShortcut =
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) ||
        (e.metaKey && e.altKey && ['I', 'i'].includes(e.key));
      if (isDevShortcut) triggerBlock();
    };
    document.addEventListener('keydown', onKey, true);

    return () => {
      clearInterval(poll);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [triggerBlock]);

  const animateProgress = useCallback(() => {
    if (!holdStartRef.current || !holdingRef.current) return;
    const elapsed = Date.now() - holdStartRef.current;
    const pct = Math.min((elapsed / HOLD_DURATION) * 100, 100);
    progressRef.current = pct;
    setProgress(pct);

    if (pct < 100) {
      rafRef.current = requestAnimationFrame(animateProgress);
    } else {
      holdingRef.current = false;
      holdStartRef.current = null;
      setBlocked(false);
      setProgress(0);
      setFailed(false);
      progressRef.current = 0;
    }
  }, []);

  const startHold = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    holdingRef.current = true;
    holdStartRef.current = Date.now();
    setFailed(false);
    rafRef.current = requestAnimationFrame(animateProgress);
  }, [animateProgress]);

  const endHold = useCallback(() => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (progressRef.current < 100) {
      setFailed(true);
      setProgress(0);
      progressRef.current = 0;
    }
    holdStartRef.current = null;
  }, []);

  if (!blocked) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Backdrop — page content visible but dimmed */}
      <div className="flex-1 bg-black/30 backdrop-blur-[1px]" />

      {/* Bottom sheet */}
      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-10 flex flex-col items-center gap-3 shadow-2xl">
        <h2 className="text-[22px] font-semibold text-gray-800 text-center">
          Before we continue...
        </h2>
        <p className="text-gray-500 text-sm text-center leading-relaxed">
          Press &amp; Hold to confirm you are<br />a human (and not a bot).
        </p>

        <div className="relative w-full max-w-[280px] mt-1">
          <button
            onMouseDown={startHold}
            onMouseUp={endHold}
            onMouseLeave={endHold}
            onTouchStart={startHold}
            onTouchEnd={endHold}
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
            className="relative w-full py-4 rounded-full border-2 border-blue-500 overflow-hidden select-none cursor-pointer"
          >
            <div
              className="absolute inset-0 bg-blue-100"
              style={{
                width: `${progress}%`,
                transition: holdingRef.current ? 'none' : 'width 0.15s ease-out',
              }}
            />
            <span className="relative z-10 text-blue-500 font-medium text-base">
              Press &amp; Hold
            </span>
          </button>
        </div>

        {failed && (
          <p className="text-red-500 text-sm">Please try again</p>
        )}

        <p className="text-gray-400 text-[11px] mt-3 text-center">
          Reference ID {refId}
        </p>
      </div>
    </div>
  );
};

export default DevToolsGuard;
