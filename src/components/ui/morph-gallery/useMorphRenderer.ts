import { useEffect, useRef, useState, type RefObject } from 'react';
import { createMorphProgram, getMorphContext } from './morphGl';
import { createMorphScene, type MorphScene, type MorphSceneInput } from './morphScene';

/** `loading` until the first photo is drawn; `unavailable` means use a non-WebGL fallback. */
export type MorphStatus = 'loading' | 'ready' | 'unavailable';

/**
 * Runs the morph scene on a canvas. The GL context is built once per mount (and
 * again only after the browser restores a lost one); photos, index and tuning
 * reach it through a ref, so changing them never tears the context down.
 */
export function useMorphRenderer(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  input: MorphSceneInput,
): MorphStatus {
  const [status, setStatus] = useState<MorphStatus>('loading');
  const [generation, setGeneration] = useState(0);
  const latest = useRef(input);
  latest.current = input;
  const scene = useRef<MorphScene | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = getMorphContext(canvas);
    if (!gl) {
      setStatus('unavailable');
      return;
    }
    let built: MorphScene;
    try {
      built = createMorphScene(gl, canvas, createMorphProgram(gl), () => latest.current, {
        onReady: () => setStatus('ready'),
        onUnavailable: () => setStatus('unavailable'),
      });
    } catch {
      // A driver that refused the program: show the photos without the morph.
      setStatus('unavailable');
      return;
    }
    scene.current = built;

    // A restored context holds nothing; rebuilding from scratch is the only honest answer.
    const onLost = (e: Event) => e.preventDefault();
    const onRestored = () => setGeneration((g) => g + 1);
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    const observer = new ResizeObserver(() => built.redraw());
    observer.observe(canvas);
    built.show();

    return () => {
      observer.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      built.dispose();
      scene.current = null;
    };
  }, [canvasRef, generation]);

  const sourcesKey = input.sources.join('\n');
  useEffect(() => {
    scene.current?.show();
  }, [input.active, sourcesKey, input.loop]);

  return status;
}
