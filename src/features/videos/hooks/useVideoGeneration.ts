import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getVideoPreview,
  generatePropertyVideo,
  startAsyncVideoGeneration,
  getJobStatus,
  deletePropertyVideo,
  pollJobUntilComplete,
  VideoGenerationOptions,
  VideoPreview,
  GeneratedVideo,
  VideoGenerationJob,
  VideoFormat,
} from '../api/videoApi';

interface UseVideoGenerationOptions {
  onSuccess?: (video: GeneratedVideo) => void;
  onError?: (error: Error) => void;
  onProgress?: (job: VideoGenerationJob) => void;
}

export const useVideoPreview = (propertyId: string, options?: { format?: VideoFormat; duration?: number }) => {
  return useQuery({
    queryKey: ['videoPreview', propertyId, options?.format, options?.duration],
    queryFn: () => getVideoPreview(propertyId, options),
    enabled: !!propertyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useGenerateVideo = (options?: UseVideoGenerationOptions) => {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<'idle' | 'generating' | 'uploading' | 'completed' | 'failed'>('idle');

  const mutation = useMutation({
    mutationFn: async ({
      propertyId,
      videoOptions,
      useAsync = false,
    }: {
      propertyId: string;
      videoOptions?: VideoGenerationOptions;
      useAsync?: boolean;
    }) => {
      setStatus('generating');
      setProgress(0);

      if (useAsync) {
        // Start async job and poll for completion
        const { jobId } = await startAsyncVideoGeneration(propertyId, videoOptions);

        const completedJob = await pollJobUntilComplete(jobId, (job) => {
          setProgress(job.progress);
          if (options?.onProgress) {
            options.onProgress(job);
          }
        });

        if (completedJob.status === 'failed') {
          throw new Error(completedJob.error || 'Video generation failed');
        }

        if (!completedJob.result) {
          throw new Error('No video result');
        }

        return completedJob.result;
      } else {
        // Synchronous generation
        setProgress(50);
        const result = await generatePropertyVideo(propertyId, videoOptions);
        setProgress(100);
        return result.video;
      }
    },
    onSuccess: (video) => {
      setStatus('completed');
      queryClient.invalidateQueries({ queryKey: ['videoPreview'] });
      queryClient.invalidateQueries({ queryKey: ['property'] });
      queryClient.invalidateQueries({ queryKey: ['myListings'] });
      if (options?.onSuccess) {
        options.onSuccess(video);
      }
    },
    onError: (error: Error) => {
      setStatus('failed');
      if (options?.onError) {
        options.onError(error);
      }
    },
  });

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    mutation.reset();
  }, [mutation]);

  return {
    generateVideo: mutation.mutate,
    generateVideoAsync: mutation.mutateAsync,
    isGenerating: mutation.isPending,
    progress,
    status,
    error: mutation.error,
    reset,
    data: mutation.data,
  };
};

export const useDeleteVideo = (options?: { onSuccess?: () => void; onError?: (error: Error) => void }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (propertyId: string) => deletePropertyVideo(propertyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoPreview'] });
      queryClient.invalidateQueries({ queryKey: ['property'] });
      queryClient.invalidateQueries({ queryKey: ['myListings'] });
      if (options?.onSuccess) {
        options.onSuccess();
      }
    },
    onError: (error: Error) => {
      if (options?.onError) {
        options.onError(error);
      }
    },
  });
};

export const useVideoJobStatus = (jobId: string | null) => {
  return useQuery({
    queryKey: ['videoJob', jobId],
    queryFn: () => getJobStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data as VideoGenerationJob | undefined;
      // Stop polling when job is completed or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
  });
};
