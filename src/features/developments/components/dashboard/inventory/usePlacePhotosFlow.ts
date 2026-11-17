import { useRef, useState } from 'react';

interface PlacePhotosFlowArgs {
  /** Photos in the gallery now. */
  photoCount: number;
  /** The floor plan's URL, uploading a picked-but-unsaved plan first; null when there is none. Throws on a failed upload. */
  preparePlan: () => Promise<string | null>;
  /** Opens the photo picker (must run inside the click: browsers block it later). */
  pickPhotos: () => void;
  onError: (err: unknown) => void;
}

/**
 * "Place photos on floor plan" from the moment a plan is there: makes sure the
 * plan is uploaded, and with no photos yet asks for them first — the placer
 * then opens as soon as they are uploaded.
 */
export function usePlacePhotosFlow({ photoCount, preparePlan, pickPhotos, onError }: PlacePhotosFlowArgs) {
  /** The plan the placer is open on; null = closed. */
  const [planUrl, setPlanUrl] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  /** The plan (on its way) to open the placer on once the photos being picked are uploaded. */
  const waiting = useRef<Promise<string | null> | null>(null);

  const prepare = async (): Promise<string | null> => {
    setPreparing(true);
    try {
      return await preparePlan();
    } catch (err) {
      onError(err);
      return null;
    } finally {
      setPreparing(false);
    }
  };

  const start = () => {
    if (photoCount === 0) {
      pickPhotos();
      waiting.current = prepare();
      return;
    }
    void prepare().then((url) => url && setPlanUrl(url));
  };

  /** Photos were uploaded: open the placer if that was the way there. */
  const photosAdded = () => {
    const plan = waiting.current;
    waiting.current = null;
    void plan?.then((url) => url && setPlanUrl(url));
  };

  return {
    planUrl,
    preparing,
    start,
    close: () => setPlanUrl(null),
    photosAdded,
    /** The photos were not added (or were added another way): don't open the placer later. */
    forget: () => {
      waiting.current = null;
    },
  };
}
