import type { MorphItem } from './types';

/** The same gallery without WebGL: stacked photos, opacity only. */
export function MorphFallback({ items, active }: { items: MorphItem[]; active: number }) {
  return (
    <>
      {items.map((item, i) => (
        <img
          key={item.src}
          src={item.src}
          alt={item.alt ?? ''}
          className="absolute inset-0 block h-full w-full object-cover transition-opacity duration-700 motion-reduce:transition-none"
          style={{ maxWidth: 'none', opacity: i === active ? 1 : 0 }}
          aria-hidden={i !== active}
        />
      ))}
    </>
  );
}
