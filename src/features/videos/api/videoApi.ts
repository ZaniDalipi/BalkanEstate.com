// Video Generation API module
//
// The generator renders a showcase MP4 on the server and hands it straight to
// the seller as a download. Nothing is stored: sellers post the video to
// TikTok / YouTube / Instagram and paste that link into their listing.

import { apiRequest, blobRequest } from '@/src/shared/api';

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
  backgroundStyle?: BackgroundStyle;
}

/** A rendered video held in the browser only (an object URL over the blob). */
export interface DownloadedVideo {
  blob: Blob;
  /** `URL.createObjectURL(blob)` — revoke it when the video is discarded. */
  objectUrl: string;
  fileName: string;
  duration: number;
  width: number;
  height: number;
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

/** File name from a Content-Disposition header, or a safe default. */
const fileNameFrom = (disposition: string | null): string => {
  const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const name = match ? decodeURIComponent(match[1]) : '';
  return /^[\w.-]+\.mp4$/i.test(name) ? name : 'listing-video.mp4';
};

const numberHeader = (headers: Headers, name: string): number => {
  const value = Number(headers.get(name));
  return Number.isFinite(value) ? value : 0;
};

/**
 * Render a video for a listing and return it as a local file.
 * Rendering takes a while; pass an AbortSignal to cancel.
 */
export const generatePropertyVideo = async (
  propertyId: string,
  options: VideoGenerationOptions = {},
  signal?: AbortSignal
): Promise<DownloadedVideo> => {
  const { blob, headers } = await blobRequest(`/videos/generate/${propertyId}`, {
    method: 'POST',
    body: options,
    signal,
  });

  if (blob.size === 0) {
    throw new Error('The server returned an empty video. Please try again.');
  }

  return {
    blob,
    objectUrl: URL.createObjectURL(blob),
    fileName: fileNameFrom(headers.get('content-disposition')),
    duration: numberHeader(headers, 'x-video-duration'),
    width: numberHeader(headers, 'x-video-width'),
    height: numberHeader(headers, 'x-video-height'),
  };
};

/** Save a downloaded video to the seller's device. */
export const saveVideoToDevice = (video: DownloadedVideo): void => {
  const link = document.createElement('a');
  link.href = video.objectUrl;
  link.download = video.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
};
