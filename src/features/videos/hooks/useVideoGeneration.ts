import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  getVideoPreview,
  generatePropertyVideo,
  VideoGenerationOptions,
  DownloadedVideo,
  VideoFormat,
} from '../api/videoApi';

export const useVideoPreview = (propertyId: string, options?: { format?: VideoFormat; duration?: number }) => {
  return useQuery({
    queryKey: ['videoPreview', propertyId, options?.format, options?.duration],
    queryFn: () => getVideoPreview(propertyId, options),
    enabled: !!propertyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

interface UseGenerateVideoOptions {
  onSuccess?: (video: DownloadedVideo) => void;
  onError?: (error: Error) => void;
}

/**
 * Render a video on the server and keep it in the browser as a blob.
 * The object URL is revoked on reset, on a new render and on unmount, so a
 * discarded video never lingers in memory.
 */
export const useGenerateVideo = (options?: UseGenerateVideoOptions) => {
  const [status, setStatus] = useState<'idle' | 'generating' | 'completed' | 'failed'>('idle');
  const abortRef = useRef<AbortController | null>(null);
  const currentUrlRef = useRef<string | null>(null);

  const releaseVideo = useCallback(() => {
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current);
      currentUrlRef.current = null;
    }
  }, []);

  const mutation = useMutation({
    mutationFn: async ({ propertyId, videoOptions }: { propertyId: string; videoOptions?: VideoGenerationOptions }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      releaseVideo();
      setStatus('generating');
      return generatePropertyVideo(propertyId, videoOptions, controller.signal);
    },
    onSuccess: (video) => {
      currentUrlRef.current = video.objectUrl;
      setStatus('completed');
      options?.onSuccess?.(video);
    },
    onError: (error: Error) => {
      if (error.name === 'AbortError') {
        setStatus('idle');
        return;
      }
      setStatus('failed');
      options?.onError?.(error);
    },
  });

  const reset = useCallback(() => {
    abortRef.current?.abort();
    releaseVideo();
    setStatus('idle');
    mutation.reset();
  }, [mutation, releaseVideo]);

  // Cancel an in-flight render and free the blob when the modal closes.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      releaseVideo();
    },
    [releaseVideo]
  );

  return {
    generateVideo: mutation.mutate,
    isGenerating: mutation.isPending,
    status,
    error: mutation.error,
    reset,
    data: mutation.data,
  };
};
