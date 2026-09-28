// Video Generation Feature Module
// Renders a showcase video the seller downloads and posts themselves —
// videos are never stored by us; listings link to TikTok/YouTube/Instagram.

// Components
export { default as VideoGenerator } from './components/VideoGenerator';

// Hooks
export { useVideoPreview, useGenerateVideo } from './hooks/useVideoGeneration';

// API
export { getVideoPreview, generatePropertyVideo, saveVideoToDevice } from './api/videoApi';

// Types
export type {
  VideoFormat,
  VideoQuality,
  MusicStyle,
  VideoGenerationOptions,
  DownloadedVideo,
  VideoPreview,
} from './api/videoApi';
