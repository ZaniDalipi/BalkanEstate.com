import type { MorphGalleryLabels, MorphItem } from './types';

interface MorphThumbnailsProps {
  items: MorphItem[];
  active: number;
  onSelect: (i: number) => void;
  labels: MorphGalleryLabels;
}

const STRIP =
  'absolute inset-x-0 bottom-8 z-10 mx-auto flex w-max max-w-[calc(100%-2rem)] gap-2 ' +
  'list-none overflow-x-auto scroll-smooth p-0 pb-2.5 ' +
  '[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-track]:bg-white/10 ' +
  '[&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-white/30 max-sm:hidden';

export function MorphThumbnails({ items, active, onSelect, labels }: MorphThumbnailsProps) {
  return (
    <ul className={STRIP}>
      {items.map((item, i) => (
        <li key={item.src} className="shrink-0 list-none">
          <button
            type="button"
            onClick={() => onSelect(i)}
            aria-current={i === active}
            aria-label={item.alt ?? labels.showImage(i + 1)}
            className={
              'block cursor-pointer overflow-hidden rounded border-2 bg-transparent p-0 transition ' +
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ' +
              (i === active ? 'border-white opacity-100' : 'border-transparent opacity-55 hover:opacity-85')
            }
          >
            <img
              src={item.thumb ?? item.src}
              alt=""
              width={80}
              height={50}
              loading="lazy"
              decoding="async"
              className="block object-cover"
              // Preflight's img { max-width: 100% } would shrink these inside the scroller.
              style={{ maxWidth: 'none', width: 80, height: 50 }}
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
