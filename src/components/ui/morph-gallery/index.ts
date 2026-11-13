/**
 * `import MorphGallery from '@/src/components/ui/morph-gallery'`
 *
 * MorphGallery is the full gallery (controls, thumbnails, fallback);
 * MorphStage is the bare canvas for callers that bring their own controls.
 */
export { default } from './MorphGallery';
export type { MorphGalleryProps } from './MorphGallery';
export { MorphStage } from './MorphStage';
export type { MorphStageProps } from './MorphStage';
export type { MorphStatus } from './useMorphRenderer';
export type { MorphItem, MorphGalleryLabels } from './types';
export { supportsWebGL } from './morphGl';
export { wrapIndex, easeInOutQuint, coverScale, containScale } from './morphMath';
