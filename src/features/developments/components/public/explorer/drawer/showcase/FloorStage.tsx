import React from 'react';
import { FloorPlanModel } from './FloorPlanModel';
import { FloorShotView } from './FloorShotView';
import type { FloorShot } from './floorShot';
import type { ScreenBox } from './showcaseMotion';

interface FloorStageProps {
  shot: FloorShot;
  alt: string;
  /** The floor's name, over the picture's corner. */
  caption?: string;
  origin: ScreenBox | null;
}

/** The apartment on its floor's picture, rising out of the building like the plan does. */
export const FloorStage: React.FC<FloorStageProps> = ({ shot, alt, caption, origin }) => {
  const ratio = (shot.view.imageWidth || 1600) / (shot.view.imageHeight || 900);
  return (
    <FloorPlanModel url={shot.view.imageUrl} ratio={ratio} alt={alt} tilted={false} origin={origin} fill="cover" maxWidth={960}>
      <FloorShotView shot={shot} alt={alt} caption={caption} className="h-full w-full rounded-2xl shadow-[0_40px_70px_-30px_rgba(70,50,30,0.45)]" />
    </FloorPlanModel>
  );
};
