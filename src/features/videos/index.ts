// Video Generation Feature Module
// Exports all video-related components, hooks, and API functions

// Components
export { default as VideoGenerator } from './components/VideoGenerator';

// Hooks
export {
  useVideoPreview,
  useGenerateVideo,
  useDeleteVideo,
  useVideoJobStatus,
} from './hooks/useVideoGeneration';
export { useInstagramReelVideo, getInstagramShortcode } from './hooks/useInstagramReel';

// API
export {
  getVideoPreview,
  generatePropertyVideo,
  startAsyncVideoGeneration,
  getJobStatus,
  deletePropertyVideo,
  pollJobUntilComplete,
  resolveInstagramVideo,
} from './api/videoApi';

// Types
export type {
  VideoFormat,
  VideoQuality,
  MusicStyle,
  VideoGenerationOptions,
  GeneratedVideo,
  VideoGenerationJob,
  VideoPreview,
} from './api/videoApi';
