import React, { useState } from 'react';

/**
 * The one <img> every illustration renders.
 *
 * Decorative only: every place that shows one also prints the label next to
 * it, so the image is hidden from assistive technology. If the file fails to
 * load (a deploy that dropped an asset, a blocked request) it hides itself
 * rather than leave a broken-image glyph in the middle of a card; its box
 * stays, so the layout around it does not jump.
 */
export const DecorativeImage: React.FC<{ src: string; className?: string; lazy?: boolean }> = ({ src, className, lazy }) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      loading={lazy ? 'lazy' : undefined}
      decoding="async"
      onError={() => setFailedSrc(src)}
      style={failedSrc === src ? { visibility: 'hidden' } : undefined}
      className={`object-contain select-none ${className ?? ''}`}
    />
  );
};
