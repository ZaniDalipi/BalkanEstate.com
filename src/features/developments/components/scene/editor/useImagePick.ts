/** Picks and checks an image file, reporting its pixel size or a clear error. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { checkImageFile, readImageDimensions, RECOMMENDED_MIN_WIDTH } from './imageFile';

export interface PickedImage {
  file: File;
  width: number | null;
  height: number | null;
}

export function useImagePick() {
  const { t } = useTranslation('developments');
  const [picked, setPicked] = useState<PickedImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined): Promise<PickedImage | null> => {
    setError(null);
    setPicked(null);
    if (!file) return null;
    const problem = checkImageFile(file);
    if (problem === 'type') {
      setError(t('editor.image.badType', 'Use a JPG, PNG, WebP or AVIF image.'));
      return null;
    }
    if (problem === 'size') {
      setError(t('editor.image.tooLarge', 'The image is larger than 10 MB.'));
      return null;
    }
    const dims = await readImageDimensions(file);
    const next = { file, width: dims?.width ?? null, height: dims?.height ?? null };
    setPicked(next);
    return next;
  };

  const describe = (p: PickedImage | null): string | null => {
    if (!p || !p.width || !p.height) return null;
    const size = t('editor.image.dimensions', '{{width}} × {{height}} px', { width: p.width, height: p.height });
    return p.width < RECOMMENDED_MIN_WIDTH
      ? `${size} — ${t('editor.image.lowRes', 'low resolution; 1600 px wide or more looks sharper')}`
      : size;
  };

  return { picked, error, setError, pick, describe, reset: () => setPicked(null) };
}
