import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { developmentKeys } from '../api/developmentKeys';
import {
  listScenes,
  upsertSceneImage,
  saveSceneDraft,
  publishScene,
  deleteScene,
  getPublishedScene,
  getAttachableListings,
} from '../api/developmentsApi';
import type { Hotspot, SceneTargetType } from '../types';

const scenesKey = (developmentId: string) =>
  [...developmentKeys.detail(developmentId), 'scenes'] as const;

/** All scenes of a development (dashboard editor). */
export function useScenes(developmentId: string | undefined) {
  const query = useQuery({
    queryKey: scenesKey(developmentId ?? ''),
    queryFn: () => listScenes(developmentId as string),
    enabled: !!developmentId,
  });
  return {
    scenes: query.data?.scenes ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/** Scene mutations: upload/replace image, save draft hotspots, publish, delete. */
export function useSceneMutations(developmentId: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: scenesKey(developmentId) });

  const uploadImage = useMutation({
    mutationFn: (vars: { targetType: SceneTargetType; file: File; targetId?: string }) =>
      upsertSceneImage(developmentId, vars.targetType, vars.file, vars.targetId),
    onSuccess: invalidate,
  });
  const saveDraft = useMutation({
    mutationFn: (vars: { sceneId: string; hotspots: Hotspot[] }) =>
      saveSceneDraft(developmentId, vars.sceneId, vars.hotspots),
    onSuccess: invalidate,
  });
  const publish = useMutation({
    mutationFn: (sceneId: string) => publishScene(developmentId, sceneId),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (sceneId: string) => deleteScene(developmentId, sceneId),
    onSuccess: invalidate,
  });

  return {
    uploadImage: uploadImage.mutateAsync,
    isUploading: uploadImage.isPending,
    saveDraft: saveDraft.mutateAsync,
    isSaving: saveDraft.isPending,
    publish: publish.mutateAsync,
    isPublishing: publish.isPending,
    remove: remove.mutateAsync,
    error: uploadImage.error || saveDraft.error || publish.error || remove.error,
  };
}

/**
 * The caller's controllable listings for the scene editor's listing picker.
 * `q` is a server-side search; keep queries distinct per search term and short-
 * lived so the dropdown stays responsive.
 */
export function useAttachableListings(developmentId: string | undefined, q: string) {
  const query = useQuery({
    queryKey: [...developmentKeys.detail(developmentId ?? ''), 'attachable-listings', q] as const,
    queryFn: () => getAttachableListings(developmentId as string, q),
    enabled: !!developmentId,
    staleTime: 30_000,
  });
  return {
    listings: query.data?.listings ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

/** The published scene for a target, for the public interactive viewer. */
export function usePublishedScene(
  slug: string | undefined,
  targetType: SceneTargetType = 'development',
  targetId?: string
) {
  const query = useQuery({
    queryKey: [...developmentKeys.publicDetail(slug ?? ''), 'scene', targetType, targetId ?? ''] as const,
    queryFn: () => getPublishedScene(slug as string, targetType, targetId),
    enabled: !!slug,
    staleTime: 2 * 60_000,
  });
  return { scene: query.data?.scene ?? null, isLoading: query.isLoading, error: query.error };
}
