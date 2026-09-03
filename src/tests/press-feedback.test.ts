import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initPressFeedback, __testing } from '@/shared/interaction/pressFeedback';

const { pressScale, findPressable, hasOwnTransform } = __testing;

function pointerDown(target: Element, x = 10, y = 10) {
  target.dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y }),
  );
}

function pointerUp(target: Element = document.body, x = 10, y = 10) {
  target.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
}

function pointerMove(target: Element, x: number, y: number) {
  target.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
}

/**
 * jsdom lays out nothing, so every element's `getBoundingClientRect()` is
 * zeros by default — which the module treats as "not really on screen" and
 * skips. Stubbing it per element is how each case gets a plausible box.
 */
function stubRect(el: HTMLElement, rect: Partial<DOMRect>) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, top: 0, left: 0, right: 200, bottom: 60, width: 200, height: 60, toJSON: () => ({}),
    ...rect,
  } as DOMRect);
}

describe('pressFeedback', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.className = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.getElementById('press-ripple-layer')?.remove();
  });

  describe('pressScale', () => {
    it('presses a normal-width control by a moderate amount', () => {
      const scale = pressScale({ width: 200 } as DOMRect);
      expect(scale).toBeGreaterThan(0.94);
      expect(scale).toBeLessThan(1);
    });

    it('never crushes a very narrow control past the floor', () => {
      const scale = pressScale({ width: 20 } as DOMRect);
      expect(scale).toBeGreaterThanOrEqual(0.94);
    });

    it('barely moves a very wide control', () => {
      const scale = pressScale({ width: 2000 } as DOMRect);
      expect(scale).toBeCloseTo(0.99, 5);
    });

    it('does not scale a zero-width element', () => {
      expect(pressScale({ width: 0 } as DOMRect)).toBe(1);
    });
  });

  describe('findPressable', () => {
    it('matches a plain button', () => {
      document.body.innerHTML = '<button id="b">Go</button>';
      const btn = document.getElementById('b')!;
      expect(findPressable(btn)).toBe(btn);
    });

    it('matches the nearest pressable ancestor from a click on its label', () => {
      document.body.innerHTML = '<button id="b"><span id="s">Go</span></button>';
      const span = document.getElementById('s')!;
      expect(findPressable(span)).toBe(document.getElementById('b'));
    });

    it('ignores a disabled button', () => {
      document.body.innerHTML = '<button id="b" disabled>Go</button>';
      expect(findPressable(document.getElementById('b'))).toBeNull();
    });

    it('ignores an aria-disabled control', () => {
      document.body.innerHTML = '<div id="b" role="button" aria-disabled="true">Go</div>';
      expect(findPressable(document.getElementById('b'))).toBeNull();
    });

    it('opts a non-semantic card in via data-pressable', () => {
      document.body.innerHTML = '<div id="card" data-pressable>Listing</div>';
      const card = document.getElementById('card')!;
      expect(findPressable(card)).toBe(card);
    });

    it('does not match a div with no pressable marker', () => {
      document.body.innerHTML = '<div id="d">Just text</div>';
      expect(findPressable(document.getElementById('d'))).toBeNull();
    });

    it('opts out inside the photo gallery / map (data-no-swipe-back)', () => {
      // The gallery and map reuse the swipe-back opt-out: a drag there means
      // something else, and a ripple under that drag would misfire the same
      // way a swipe-back would.
      document.body.innerHTML = '<div data-no-swipe-back><button id="b">Next</button></div>';
      expect(findPressable(document.getElementById('b'))).toBeNull();
    });

    it('opts out via data-no-press without touching swipe-back', () => {
      document.body.innerHTML = '<div data-no-press><button id="b">Next</button></div>';
      expect(findPressable(document.getElementById('b'))).toBeNull();
    });
  });

  describe('hasOwnTransform', () => {
    it('treats `none` as no transform', () => {
      const el = document.createElement('div');
      el.style.transform = 'none';
      document.body.appendChild(el);
      expect(hasOwnTransform(el)).toBe(false);
    });

    it('treats a settled Tailwind translate-y-0 (identity matrix) as no transform', () => {
      // This is the regression this helper exists for: in a real browser, a
      // card that entered with `translate-y-0` and has since settled reports
      // its *computed* transform as the identity matrix, not the string
      // 'none' or the literal function it was declared with — getComputedStyle
      // always resolves `transform` to a matrix()/matrix3d() or 'none'. A
      // naive `=== 'none'` check would wrongly treat every such card as
      // "already has its own transform" and silently drop its press feedback.
      // (jsdom does not resolve transform to a matrix the way real browsers
      // do — it echoes back the literal value — so the matrix string is
      // asserted directly here rather than relying on jsdom to produce it.)
      const el = document.createElement('div');
      el.style.transform = 'matrix(1, 0, 0, 1, 0, 0)';
      document.body.appendChild(el);
      expect(hasOwnTransform(el)).toBe(false);
    });

    it('treats a real transform as the element owning it', () => {
      const el = document.createElement('div');
      el.style.transform = 'translateY(-8px)';
      document.body.appendChild(el);
      expect(hasOwnTransform(el)).toBe(true);
    });
  });

  describe('integration', () => {
    it('spawns a ripple clipped to the control on pointerdown', () => {
      initPressFeedback();
      document.body.innerHTML = '<button id="b">Go</button>';
      const btn = document.getElementById('b')!;
      stubRect(btn, { left: 5, top: 5, right: 105, bottom: 45, width: 100, height: 40 });

      pointerDown(btn);

      const layer = document.getElementById('press-ripple-layer');
      expect(layer).not.toBeNull();
      const ripple = layer!.querySelector('.press-ripple') as HTMLElement;
      expect(ripple).not.toBeNull();
      expect(ripple.style.left).toBe('5px');
      expect(ripple.style.top).toBe('5px');
      expect(ripple.style.width).toBe('100px');
      expect(ripple.style.height).toBe('40px');

      pointerUp();
    });

    it('presses a plain button in on pointerdown and releases it on pointerup', () => {
      initPressFeedback();
      document.body.innerHTML = '<button id="b">Go</button>';
      const btn = document.getElementById('b')!;
      stubRect(btn, {});

      pointerDown(btn);
      expect(btn.style.transform).toMatch(/scale\(/);

      pointerUp();
      expect(btn.style.transform).toBe('');
    });

    it('does not touch the transform of a control that already owns one', () => {
      // e.g. a component with its own `active:scale-95` — or, per the
      // hasOwnTransform tests above, anything with a real (non-identity)
      // transform already applied when the press starts.
      initPressFeedback();
      document.body.innerHTML = '<button id="b" style="transform: translateY(-4px)">Go</button>';
      const btn = document.getElementById('b')!;
      stubRect(btn, {});

      pointerDown(btn);
      expect(btn.style.transform).toBe('translateY(-4px)');

      pointerUp();
    });

    it('still ripples a control it does not scale', () => {
      initPressFeedback();
      document.body.innerHTML = '<button id="b" style="transform: translateY(-4px)">Go</button>';
      const btn = document.getElementById('b')!;
      stubRect(btn, {});

      pointerDown(btn);
      expect(document.querySelector('.press-ripple')).not.toBeNull();
      pointerUp();
    });

    it('cancels the press when the pointer drags past the threshold', () => {
      initPressFeedback();
      document.body.innerHTML = '<button id="b">Go</button>';
      const btn = document.getElementById('b')!;
      stubRect(btn, {});

      pointerDown(btn, 10, 10);
      expect(btn.style.transform).toMatch(/scale\(/);

      pointerMove(btn, 40, 10); // 30px — past DRAG_CANCEL_PX
      expect(btn.style.transform).toBe('');
    });

    it('does nothing for a right-click', () => {
      initPressFeedback();
      document.body.innerHTML = '<button id="b">Go</button>';
      const btn = document.getElementById('b')!;
      stubRect(btn, {});

      btn.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, button: 2, clientX: 10, clientY: 10 }),
      );
      expect(document.querySelector('.press-ripple')).toBeNull();
    });

    it('does not press-scale a control marked data-no-press-scale, but still ripples it', () => {
      initPressFeedback();
      document.body.innerHTML = '<button id="b" data-no-press-scale>Go</button>';
      const btn = document.getElementById('b')!;
      stubRect(btn, {});

      pointerDown(btn);
      expect(btn.style.transform).toBe('');
      expect(document.querySelector('.press-ripple')).not.toBeNull();
      pointerUp();
    });

    it('respects prefers-reduced-motion by doing nothing at all', () => {
      document.documentElement.classList.add('reduce-motion');
      initPressFeedback();
      document.body.innerHTML = '<button id="b">Go</button>';
      const btn = document.getElementById('b')!;
      stubRect(btn, {});

      pointerDown(btn);
      expect(btn.style.transform).toBe('');
      expect(document.querySelector('.press-ripple')).toBeNull();
    });

    it('releases via the safety timeout if pointerup never arrives', () => {
      vi.useFakeTimers();
      try {
        initPressFeedback();
        document.body.innerHTML = '<button id="b">Go</button>';
        const btn = document.getElementById('b')!;
        stubRect(btn, {});

        pointerDown(btn);
        expect(btn.style.transform).toMatch(/scale\(/);

        vi.advanceTimersByTime(2100);
        expect(btn.style.transform).toBe('');
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
