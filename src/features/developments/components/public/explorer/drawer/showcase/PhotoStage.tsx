import React, { useState } from 'react';
import type { UnitPhoto } from '../unitGallery';
import { FloorPlanModel } from './FloorPlanModel';
import { PhotoCarousel } from './PhotoCarousel';
import { PhotoDock } from './PhotoDock';
import type { ScreenBox } from './showcaseMotion';
import { usePhotoLabels } from './usePhotoLabels';

interface PhotoStageProps {
  photos: UnitPhoto[];
  /** The apartment's name, for the photos' alt text. */
  name: string;
  origin: ScreenBox | null;
}

const PHOTO_RATIO = 3 / 2;

/** The apartment's photos dealt like cards, with a labelled filmstrip; ←/→ turn them while it has focus. */
export const PhotoStage: React.FC<PhotoStageProps> = ({ photos, name, origin }) => {
  const labels = usePhotoLabels(photos);
  const [photo, setPhoto] = useState<{ index: number; dir: -1 | 1 }>({ index: 0, dir: 1 });
  const step = (d: -1 | 1) => setPhoto((p) => ({ index: (p.index + d + photos.length) % photos.length, dir: d }));
  const select = (i: number) => setPhoto((p) => (i === p.index ? p : { index: i, dir: i > p.index ? 1 : -1 }));
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (photos.length < 2) return;
    if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
  };
  return (
    <div className="contents" onKeyDown={onKeyDown}>
      <FloorPlanModel url={photos[0].url} ratio={PHOTO_RATIO} alt="" tilted={false} origin={origin} fill="cover">
        <PhotoCarousel photos={photos} labels={labels} index={photo.index} dir={photo.dir} onStep={step} name={name} />
      </FloorPlanModel>
      {photos.length > 1 && <PhotoDock photos={photos} labels={labels} index={photo.index} onSelect={select} />}
    </div>
  );
};
