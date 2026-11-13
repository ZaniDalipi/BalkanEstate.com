/**
 * The morph gallery's render state, outside React: which photos hold textures,
 * what is on screen, and the dissolve in flight. React tells it what to show
 * through `show()`; it draws only while something is moving.
 */

import { driftDirection, easeInOutQuint, textureWindow, wrapIndex } from './morphMath';
import { fitCanvas, loadTextureImage, uploadTexture, type MorphProgram } from './morphGl';

export interface MorphTuning {
  duration: number;
  noiseScale: number;
  edge: number;
  drift: number;
  reduced: boolean;
}

export interface MorphSceneInput {
  sources: string[];
  active: number;
  loop: boolean;
  /** How many photos either side of the visible one keep a texture. */
  keepRadius: number;
  tuning: MorphTuning;
  /** Per photo: fill the frame (true) or show it whole (false). Default: fill. */
  shouldCover?: (imgAspect: number, frameAspect: number) => boolean;
}

interface Texture {
  tex: WebGLTexture;
  aspect: number;
}

export interface MorphSceneCallbacks {
  /** The first photo is on the canvas. */
  onReady: () => void;
  /** A photo could not be textured (no CORS, broken URL, refused upload). */
  onUnavailable: () => void;
}

export interface MorphScene {
  show: () => void;
  redraw: () => void;
  dispose: () => void;
}

export const createMorphScene = (
  gl: WebGLRenderingContext,
  canvas: HTMLCanvasElement,
  prog: MorphProgram,
  read: () => MorphSceneInput,
  cb: MorphSceneCallbacks,
): MorphScene => {
  const textures = new Map<string, Texture>();
  const loading = new Set<string>();
  let dead = false;
  let raf = 0;
  let shown = false;
  let target = '';
  let from = '';
  let to = '';
  let progress = 1;
  let startedAt = 0;
  let direction: 1 | -1 = 1;

  const fail = () => {
    if (dead) return;
    dead = true;
    cancelAnimationFrame(raf);
    cb.onUnavailable();
  };

  /** Srcs that should hold a texture: the window round the active photo, plus what is on screen. */
  const wanted = (): string[] => {
    const { sources, active, loop, keepRadius } = read();
    return textureWindow(active, sources.length, loop, keepRadius).map((i) => sources[i]);
  };

  const evict = () => {
    const keep = new Set([...wanted(), from, to]);
    for (const [src, t] of textures) {
      if (keep.has(src)) continue;
      gl.deleteTexture(t.tex);
      textures.delete(src);
    }
  };

  /** Starts (or queues, until its texture lands) the dissolve to `target`. */
  const advance = () => {
    if (!textures.has(target)) return;
    if (!shown) {
      shown = true;
      from = to = target;
      progress = 1;
      cb.onReady();
      return;
    }
    if (target === to && progress >= 1) return;
    // Interrupted mid-dissolve: carry on from whichever photo dominates now.
    const visible = progress < 0.5 ? from : to;
    if (visible === target) {
      from = to = target;
      progress = 1;
      return;
    }
    const { sources, loop } = read();
    const a = sources.indexOf(visible);
    const b = sources.indexOf(target);
    direction = a < 0 || b < 0 ? 1 : driftDirection(a, b, sources.length, loop);
    from = visible;
    to = target;
    progress = 0;
    startedAt = performance.now();
  };

  const ensure = () => {
    for (const src of wanted()) {
      if (!src || textures.has(src) || loading.has(src)) continue;
      loading.add(src);
      loadTextureImage(src).then(
        (img) => {
          loading.delete(src);
          if (dead) return;
          try {
            textures.set(src, { tex: uploadTexture(gl, img), aspect: img.naturalWidth / Math.max(img.naturalHeight, 1) });
          } catch {
            fail();
            return;
          }
          advance();
          evict();
          schedule();
        },
        () => {
          loading.delete(src);
          // A photo we cannot texture would leave a hole in the gallery, and
          // showing a neighbour in its place shows the wrong room. Hand the
          // whole gallery back to the caller's non-WebGL version instead.
          fail();
        },
      );
    }
  };

  const draw = (): boolean => {
    const { tuning, shouldCover } = read();
    if (progress < 1) {
      const span = tuning.reduced ? 0 : Math.max(tuning.duration, 1);
      const raw = span === 0 ? 1 : (performance.now() - startedAt) / span;
      progress = raw >= 1 ? 1 : easeInOutQuint(raw);
      if (progress >= 1) from = to;
    }
    const a = textures.get(from);
    const b = textures.get(to);
    if (!a || !b) return false;

    const u = prog.uniforms;
    const frameAspect = canvas.width / Math.max(canvas.height, 1);
    const contain = (t: Texture) => (shouldCover && !shouldCover(t.aspect, frameAspect) ? 1 : 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, a.tex);
    gl.uniform1i(u.from, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, b.tex);
    gl.uniform1i(u.to, 1);
    gl.uniform1f(u.progress, progress);
    gl.uniform2f(u.resolution, canvas.width, canvas.height);
    gl.uniform1f(u.fromAspect, a.aspect);
    gl.uniform1f(u.toAspect, b.aspect);
    gl.uniform1f(u.fromContain, contain(a));
    gl.uniform1f(u.toContain, contain(b));
    gl.uniform1f(u.scale, tuning.noiseScale);
    gl.uniform1f(u.direction, direction);
    gl.uniform1f(u.edge, Math.max(tuning.edge, 0.001));
    gl.uniform1f(u.drift, tuning.drift);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return progress < 1;
  };

  // Draws on demand, never on an idle loop: the fbm pass is the heaviest thing
  // on the page, and a still photo needs no frames at all.
  function schedule() {
    if (raf || dead) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (dead) return;
      fitCanvas(gl, canvas);
      if (draw()) schedule();
    });
  }

  return {
    show: () => {
      if (dead) return;
      const { sources, active, loop } = read();
      if (sources.length === 0) return;
      target = sources[wrapIndex(active, sources.length, loop)];
      ensure();
      advance();
      evict();
      schedule();
    },
    redraw: schedule,
    dispose: () => {
      dead = true;
      cancelAnimationFrame(raf);
      for (const t of textures.values()) gl.deleteTexture(t.tex);
      textures.clear();
      if (prog.buffer) gl.deleteBuffer(prog.buffer);
      gl.deleteProgram(prog.program);
    },
  };
};
