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

// API
export {
  getVideoPreview,
  generatePropertyVideo,
  startAsyncVideoGeneration,
  getJobStatus,
  deletePropertyVideo,
  pollJobUntilComplete,
} from './api/videoApi';

// Types
export type {
  VideoFormat,
  MusicStyle,
  VideoGenerationOptions,
  GeneratedVideo,
  VideoGenerationJob,
  VideoPreview,
} from './api/videoApi';
