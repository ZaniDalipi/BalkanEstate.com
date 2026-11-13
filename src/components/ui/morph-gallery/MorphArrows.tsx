import type { MorphGalleryLabels } from './types';

const ARROW =
  'absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center ' +
  'rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md ' +
  'transition-colors hover:bg-white/25 focus-visible:outline focus-visible:outline-2 ' +
  'focus-visible:outline-offset-2 focus-visible:outline-white ' +
  'disabled:pointer-events-none disabled:opacity-25';

interface MorphArrowsProps {
  onPrev: () => void;
  onNext: () => void;
  atStart: boolean;
  atEnd: boolean;
  labels: MorphGalleryLabels;
}

const Chevron = ({ points }: { points: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points={points} />
  </svg>
);

export function MorphArrows({ onPrev, onNext, atStart, atEnd, labels }: MorphArrowsProps) {
  return (
    <>
      <button type="button" className={`${ARROW} left-4 sm:left-8`} onClick={onPrev} disabled={atStart} aria-label={labels.previous}>
        <Chevron points="15 18 9 12 15 6" />
      </button>
      <button type="button" className={`${ARROW} right-4 sm:right-8`} onClick={onNext} disabled={atEnd} aria-label={labels.next}>
        <Chevron points="9 18 15 12 9 6" />
      </button>
    </>
  );
}
