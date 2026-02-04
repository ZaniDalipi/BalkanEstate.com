// Video Generation API module
// Handles all video generation API calls

import { apiRequest } from '@/src/shared/api';

// --- Types ---

export type VideoFormat = 'vertical' | 'horizontal' | 'square';
export type VideoQuality = 'standard' | 'mobile';
export type MusicStyle = 'elegant' | 'upbeat' | 'calm' | 'modern';
export type BackgroundStyle = 'gradient' | 'blur' | 'dark' | 'elegant';

export interface VideoGenerationOptions {
  format?: VideoFormat;
  quality?: VideoQuality; // 'mobile' (default) for smaller file size, 'standard' for full quality
  duration?: number; // seconds per image (2-10)
  includeWatermark?: boolean;
  musicStyle?: MusicStyle;
  backgroundStyle?: BackgroundStyle; // Professional background style
  embedInListing?: boolean; // Save video to property for auto-play on listing open
}

export interface GeneratedVideo {
  url: string;
  publicId: string;
  duration: number;
  format: string;
  width: number;
  height: number;
}

export interface VideoGenerationJob {
  id: string;
  propertyId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: GeneratedVideo;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VideoPreview {
  imageCount: number;
  estimatedDuration: number;
  estimatedSizeMB: number;
  formats: {
    vertical: { width: number; height: number; description: string };
    horizontal: { width: number; height: number; description: string };
    square: { width: number; height: number; description: string };
  };
  backgroundStyles: {
    gradient: string;
    blur: string;
    dark: string;
    elegant: string;
  };
  musicStyles: {
    elegant: string;
    upbeat: string;
    calm: string;
    modern: string;
  };
  existingVideo: string | null;
  generatedVideo: {
    url: string;
    format: VideoFormat;
    duration: number;
  } | null;
}

// --- API Functions ---

/**
 * Get video generation preview with estimated duration and size
 */
export const getVideoPreview = async (
  propertyId: string,
  options?: { format?: VideoFormat; duration?: number }
): Promise<VideoPreview> => {
  const params = new URLSearchParams();
  if (options?.format) params.append('format', options.format);
  if (options?.duration) params.append('duration', options.duration.toString());

  const queryString = params.toString();
  const endpoint = `/videos/preview/${propertyId}${queryString ? `?${queryString}` : ''}`;

  return apiRequest<VideoPreview>(endpoint, { requiresAuth: true });
};

/**
 * Generate video for a property (synchronous - for smaller videos)
 * Returns the generated video immediately
 */
export const generatePropertyVideo = async (
  propertyId: string,
  options?: VideoGenerationOptions
): Promise<{ message: string; video: GeneratedVideo }> => {
  return apiRequest<{ message: string; video: GeneratedVideo }>(
    `/videos/generate/${propertyId}`,
    {
      method: 'POST',
      body: options || {},
      requiresAuth: true,
    }
  );
};

/**
 * Start async video generation job (for larger videos)
 * Returns a job ID to poll for status
 */
export const startAsyncVideoGeneration = async (
  propertyId: string,
  options?: VideoGenerationOptions
): Promise<{ message: string; jobId: string; statusUrl: string }> => {
  return apiRequest<{ message: string; jobId: string; statusUrl: string }>(
    `/videos/generate-async/${propertyId}`,
    {
      method: 'POST',
      body: options || {},
      requiresAuth: true,
    }
  );
};

/**
 * Get video generation job status
 */
export const getJobStatus = async (jobId: string): Promise<VideoGenerationJob> => {
  return apiRequest<VideoGenerationJob>(`/videos/status/${jobId}`, {
    requiresAuth: true,
  });
};

/**
 * Delete generated video for a property
 */
export const deletePropertyVideo = async (propertyId: string): Promise<{ message: string }> => {
  return apiRequest<{ message: string }>(`/videos/${propertyId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
};

/**
 * Poll for job completion
 * Polls every 2 seconds until job is completed or failed
 */
export const pollJobUntilComplete = async (
  jobId: string,
  onProgress?: (job: VideoGenerationJob) => void,
  maxAttempts = 120 // 4 minutes max
): Promise<VideoGenerationJob> => {
  let attempts = 0;

  while (attempts < maxAttempts) {
    const job = await getJobStatus(jobId);

    if (onProgress) {
      onProgress(job);
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return job;
    }

    // Wait 2 seconds before next poll
    await new Promise((resolve) => setTimeout(resolve, 2000));
    attempts++;
  }

  throw new Error('Video generation timed out');
};
