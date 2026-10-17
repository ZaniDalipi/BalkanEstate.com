import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { developmentKeys } from '../api/developmentKeys';
import {
  listScenes,
  upsertSceneImage,
  updateSceneView,
  saveSceneDraft,
  publishScene,
  unpublishScene,
  deleteScene,
  getPublishedScene,
  getPublicViews,
  getAttachableListings,
} from '../api/developmentsApi';
import type { Hotspot, SceneTargetType, SceneViewMetaPayload, UpsertSceneImageInput } from '../types';

/** All scenes (every view of every target) of a development — dashboard editor. */
export function useScenes(developmentId: string | undefined) {
  const query = useQuery({
    queryKey: developmentKeys.scenes(developmentId ?? ''),
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

/**
 * Scene/view mutations. Publishing or unpublishing also invalidates the public
 * cache so an owner previewing their own residence sees the change at once.
 */
export function useSceneMutations(developmentId: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: developmentKeys.scenes(developmentId) });
  const invalidateWithPublic = () => {
    invalidate();
    qc.invalidateQueries({ queryKey: developmentKeys.public() });
  };

  const uploadImage = useMutation({
    mutationFn: (input: UpsertSceneImageInput) => upsertSceneImage(developmentId, input),
    onSuccess: invalidate,
  });
  const updateView = useMutation({
    mutationFn: (vars: { sceneId: string; patch: SceneViewMetaPayload }) =>
      updateSceneView(developmentId, vars.sceneId, vars.patch),
    onSuccess: invalidate,
  });
  const saveDraft = useMutation({
    mutationFn: (vars: { sceneId: string; hotspots: Hotspot[]; baseVersion?: number }) =>
      saveSceneDraft(developmentId, vars.sceneId, vars.hotspots, vars.baseVersion),
    onSuccess: invalidate,
  });
  const publish = useMutation({
    mutationFn: (sceneId: string) => publishScene(developmentId, sceneId),
    onSuccess: invalidateWithPublic,
  });
  const unpublish = useMutation({
    mutationFn: (sceneId: string) => unpublishScene(developmentId, sceneId),
    onSuccess: invalidateWithPublic,
  });
  const remove = useMutation({
    mutationFn: (sceneId: string) => deleteScene(developmentId, sceneId),
    onSuccess: invalidateWithPublic,
  });

  return {
    uploadImage: uploadImage.mutateAsync,
    isUploading: uploadImage.isPending,
    updateView: updateView.mutateAsync,
    isUpdatingView: updateView.isPending,
    saveDraft: saveDraft.mutateAsync,
    isSaving: saveDraft.isPending,
    publish: publish.mutateAsync,
    isPublishing: publish.isPending,
    unpublish: unpublish.mutateAsync,
    isUnpublishing: unpublish.isPending,
    remove: remove.mutateAsync,
    isRemoving: remove.isPending,
    error:
      uploadImage.error || updateView.error || saveDraft.error || publish.error || unpublish.error || remove.error,
  };
}

/**
 * The caller's controllable listings for the scene editor's listing picker.
 * Pass an already-debounced `q` (see useDebouncedValue) so typing does not
 * fire a request per keystroke.
 */
export function useAttachableListings(developmentId: string | undefined, q: string) {
  const query = useQuery({
    queryKey: developmentKeys.attachableListings(developmentId ?? '', q),
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

/** The (legacy, single) published scene for a target. Prefer usePublicViews. */
export function usePublishedScene(
  slug: string | undefined,
  targetType: SceneTargetType = 'development',
  targetId?: string
) {
  const query = useQuery({
    queryKey: developmentKeys.publicScene(slug ?? '', targetType, targetId ?? ''),
    queryFn: () => getPublishedScene(slug as string, targetType, targetId),
    enabled: !!slug,
    staleTime: 2 * 60_000,
  });
  return { scene: query.data?.scene ?? null, isLoading: query.isLoading, error: query.error };
}

/** Every published view of a target, in display order — the explorer's perspectives. */
export function usePublicViews(
  slug: string | undefined,
  targetType: SceneTargetType = 'development',
  targetId?: string
) {
  const query = useQuery({
    queryKey: developmentKeys.publicViews(slug ?? '', targetType, targetId ?? ''),
    queryFn: () => getPublicViews(slug as string, targetType, targetId),
    enabled: !!slug && (targetType === 'development' || !!targetId),
    staleTime: 2 * 60_000,
  });
  return {
    views: query.data?.views ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
