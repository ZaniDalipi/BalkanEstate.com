/**
 * Keeps the local editor in sync with the server copy of one scene view:
 * loading the draft, dirty tracking, optimistic-concurrency saves, publish and
 * unpublish, and mapping server-side HotspotIssue[] back onto regions.
 *
 * Load rule: the draft is (re)loaded when the scene first mounts and whenever
 * the server's draft version changes — but NEVER over dirty local edits. A
 * refetch after our own save carries the version we already know, so it is a
 * no-op and the selection survives. A foreign save while we are dirty surfaces
 * as a 409 on our next save, with "Reload latest" to discard local edits.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSceneMutations, useScenes } from '../../../hooks/useScenes';
import type { Hotspot, HotspotIssue, Scene } from '../../../types';
import type { PolygonEditor } from '../../../hooks/usePolygonEditor';
import type { AnyIssueCode } from './issueText';

export type SyncNotice =
  | { kind: 'saved' | 'published' | 'unpublished' | 'blocked' | 'blockedSave' | 'invalid' }
  | { kind: 'error'; message: string };

interface ServerIssue {
  code: HotspotIssue['code'];
  /** The hotspot object the issue was raised against; stale once the region changes. */
  ref: Hotspot;
}

interface ApiError {
  statusCode?: number;
  code?: string | null;
  message?: string;
  details?: { code?: string; errors?: HotspotIssue[]; currentVersion?: number; message?: string };
}

const sameHotspots = (a: Hotspot[], b: Hotspot[]) => a === b || JSON.stringify(a) === JSON.stringify(b);

export function useSceneSync(developmentId: string, scene: Scene, editor: PolygonEditor) {
  const { saveDraft, isSaving, publish, isPublishing, unpublish, isUnpublishing } = useSceneMutations(developmentId);
  const { refetch } = useScenes(developmentId);
  const { state, dispatch, issues: localIssues } = editor;

  const [baseline, setBaseline] = useState<Hotspot[]>(scene.draft?.hotspots ?? []);
  const [baseVersion, setBaseVersion] = useState<number>(scene.draft?.version ?? 0);
  const [conflict, setConflict] = useState(false);
  const [serverIssues, setServerIssues] = useState<Record<string, ServerIssue[]>>({});
  const [generalIssues, setGeneralIssues] = useState<HotspotIssue[]>([]);
  const [notice, setNotice] = useState<SyncNotice | null>(null);

  const dirty = useMemo(() => !sameHotspots(state.hotspots, baseline), [state.hotspots, baseline]);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  // The editor is created from this scene's draft, so the first render is already loaded.
  const loaded = useRef<{ id: string; version: number } | null>({ id: scene.id, version: scene.draft?.version ?? 0 });

  const loadFrom = useCallback(
    (s: Scene, keepSelection: boolean) => {
      const hs = s.draft?.hotspots ?? [];
      dispatch({ type: 'LOAD', hotspots: hs, keepSelection });
      setBaseline(hs);
      setBaseVersion(s.draft?.version ?? 0);
      loaded.current = { id: s.id, version: s.draft?.version ?? 0 };
    },
    [dispatch]
  );

  const draftVersion = scene.draft?.version ?? 0;
  useEffect(() => {
    const prev = loaded.current;
    if (prev && prev.id === scene.id && prev.version === draftVersion) return;
    if (prev && prev.id === scene.id && dirtyRef.current) return; // never clobber local edits
    loadFrom(scene, prev?.id === scene.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.id, draftVersion, loadFrom]);

  /** Every region's issues: live local checks plus still-current server findings. */
  const issues = useMemo(() => {
    const out: Record<string, AnyIssueCode[]> = {};
    for (const h of state.hotspots) {
      const local = localIssues[h.id] ?? [];
      const server = (serverIssues[h.id] ?? []).filter((si) => si.ref === h).map((si) => si.code);
      const all = [...new Set<AnyIssueCode>([...local, ...server])];
      if (all.length) out[h.id] = all;
    }
    return out;
  }, [state.hotspots, localIssues, serverIssues]);

  const applyServerError = (err: ApiError, sent: Hotspot[]): void => {
    const code = err.details?.code ?? err.code;
    if (err.statusCode === 409 && code === 'version_conflict') {
      setConflict(true);
      setNotice(null);
      return;
    }
    const list = err.details?.errors;
    if (err.statusCode === 400 && Array.isArray(list) && list.length) {
      const byId: Record<string, ServerIssue[]> = {};
      const general: HotspotIssue[] = [];
      for (const issue of list) {
        const ref = sent.find((h) => h.id === issue.hotspotId) ?? sent[issue.index];
        if (ref) (byId[ref.id] ??= []).push({ code: issue.code, ref });
        else general.push(issue);
      }
      setServerIssues(byId);
      setGeneralIssues(general);
      setNotice({ kind: 'invalid' });
      const first = Object.keys(byId)[0];
      if (first) dispatch({ type: 'SELECT', id: first });
      return;
    }
    setNotice({ kind: 'error', message: err.details?.message || err.message || 'Request failed' });
  };

  /** Select the first region with a local issue; true when there is one. */
  const focusFirstIssue = (): boolean => {
    const first = Object.keys(localIssues)[0];
    if (first) dispatch({ type: 'SELECT', id: first });
    return !!first;
  };

  const save = async (): Promise<boolean> => {
    // The server rejects (never clamps) bad geometry and unresolved links, so do not send them.
    if (focusFirstIssue()) {
      setNotice({ kind: 'blockedSave' });
      return false;
    }
    const sent = state.hotspots;
    setServerIssues({});
    setGeneralIssues([]);
    try {
      const res = await saveDraft({ sceneId: scene.id, hotspots: sent, baseVersion });
      const v = res.scene?.draft?.version ?? baseVersion + 1;
      setBaseline(sent);
      setBaseVersion(v);
      loaded.current = { id: scene.id, version: v };
      setConflict(false);
      setNotice({ kind: 'saved' });
      return true;
    } catch (err) {
      applyServerError(err as ApiError, sent);
      return false;
    }
  };

  const publishNow = async (): Promise<boolean> => {
    if (focusFirstIssue()) {
      setNotice({ kind: 'blocked' });
      return false;
    }
    // Publish snapshots the SERVER draft: only publish when that draft is ours.
    if (dirty && !(await save())) return false;
    try {
      await publish(scene.id);
      setNotice({ kind: 'published' });
      return true;
    } catch (err) {
      applyServerError(err as ApiError, state.hotspots);
      return false;
    }
  };

  const unpublishNow = async () => {
    try {
      await unpublish(scene.id);
      setNotice({ kind: 'unpublished' });
    } catch (err) {
      applyServerError(err as ApiError, state.hotspots);
    }
  };

  /** Discard local edits and load the newest server draft (after a 409). */
  const reloadLatest = async () => {
    const res = await refetch();
    const fresh = res.data?.scenes?.find((s) => s.id === scene.id) ?? scene;
    loadFrom(fresh, true);
    setConflict(false);
    setServerIssues({});
    setGeneralIssues([]);
    setNotice(null);
  };

  return {
    dirty,
    baseVersion,
    issues,
    generalIssues,
    conflict,
    notice,
    dismissNotice: () => setNotice(null),
    save,
    publish: publishNow,
    unpublish: unpublishNow,
    reloadLatest,
    isSaving,
    isPublishing,
    isUnpublishing,
  };
}

export type SceneSync = ReturnType<typeof useSceneSync>;
