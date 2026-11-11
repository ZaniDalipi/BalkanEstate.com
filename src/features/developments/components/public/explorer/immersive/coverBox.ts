export interface StageBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Where the picture sits in a full-screen stage: it covers the stage edge to
 * edge, like a photo hero, but never crops more than `maxCrop` of the picture
 * off each side, so buildings near its edges stay reachable. When the stage's
 * shape is too far from the picture's, the picture stops growing and the
 * stage's blurred backdrop fills the thin bands left over. Centred.
 */
export function coverBox(stage: { width: number; height: number }, ratio: number, maxCrop = 0.12): StageBox {
  if (stage.width <= 0 || stage.height <= 0 || !(ratio > 0)) return { left: 0, top: 0, width: stage.width, height: stage.height };
  const keep = 1 - 2 * maxCrop;
  const cover = Math.max(stage.width, stage.height * ratio);
  const width = Math.round(Math.min(cover, stage.width / keep, (stage.height * ratio) / keep));
  const height = Math.round(width / ratio);
  return { left: Math.round((stage.width - width) / 2), top: Math.round((stage.height - height) / 2), width, height };
}
