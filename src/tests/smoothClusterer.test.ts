import { describe, expect, it } from 'vitest';
import { SuperClusterViewportAlgorithm, type AlgorithmInput } from '@googlemaps/markerclusterer';
import { planClusterTransition, ViewportClusterAlgorithm } from '../features/map/utils/smoothClusterer';

const c = (...members: string[]) => ({ members });

describe('planClusterTransition', () => {
  it('splits a bubble into the clusters it contained on zoom in', () => {
    const plan = planClusterTransition([c('a', 'b', 'c', 'd')], [c('a', 'b'), c('c'), c('d')]);
    expect(plan.enter).toEqual([
      { kind: 'split', from: 0 },
      { kind: 'split', from: 0 },
      { kind: 'split', from: 0 },
    ]);
    expect(plan.exit).toEqual([{ kind: 'fade' }]);
  });

  it('lets the bubble that keeps most listings glide while the rest fly out', () => {
    const plan = planClusterTransition([c('a', 'b', 'c')], [c('a', 'b'), c('c')]);
    expect(plan.enter).toEqual([{ kind: 'morph', from: 0 }, { kind: 'split', from: 0 }]);
    expect(plan.exit).toEqual([{ kind: 'replaced' }]);
  });

  it('merges pins and bubbles into the new bubble on zoom out', () => {
    const plan = planClusterTransition([c('a', 'b'), c('c'), c('d')], [c('a', 'b', 'c', 'd')]);
    expect(plan.enter).toEqual([{ kind: 'appear' }]);
    expect(plan.exit).toEqual([
      { kind: 'merge', into: 0 },
      { kind: 'merge', into: 0 },
      { kind: 'merge', into: 0 },
    ]);
  });

  it('keeps clusters whose listings did not change', () => {
    const plan = planClusterTransition([c('a', 'b'), c('c')], [c('b', 'a'), c('c')]);
    expect(plan.enter).toEqual([{ kind: 'reuse', from: 0 }, { kind: 'reuse', from: 1 }]);
    expect(plan.exit).toEqual([{ kind: 'kept' }, { kind: 'kept' }]);
  });

  it('fades listings that regroup across clusters or are new', () => {
    const plan = planClusterTransition([c('a', 'b'), c('c', 'd')], [c('b', 'c'), c('e')]);
    expect(plan.enter).toEqual([{ kind: 'appear' }, { kind: 'appear' }]);
    expect(plan.exit).toEqual([{ kind: 'fade' }, { kind: 'fade' }]);
  });
});

describe('planClusterTransition on a data refresh', () => {
  it('morphs a bubble that gained or lost a few listings instead of re-creating it', () => {
    const plan = planClusterTransition([c('a', 'b', 'c', 'd')], [c('a', 'b', 'c', 'e', 'f')]);
    expect(plan.enter).toEqual([{ kind: 'morph', from: 0 }]);
    expect(plan.exit).toEqual([{ kind: 'replaced' }]);
  });

  it('morphs a bubble that only lost a listing', () => {
    const plan = planClusterTransition([c('a', 'b', 'c')], [c('a', 'b')]);
    expect(plan.enter).toEqual([{ kind: 'morph', from: 0 }]);
    expect(plan.exit).toEqual([{ kind: 'replaced' }]);
  });

  it('lets only one new bubble take over an old one', () => {
    const plan = planClusterTransition([c('a', 'b', 'c')], [c('a', 'b'), c('a2', 'c')]);
    expect(plan.enter[0]).toEqual({ kind: 'morph', from: 0 });
    expect(plan.enter[1]).toEqual({ kind: 'appear' });
  });
});

describe('ViewportClusterAlgorithm', () => {
  // A fixed viewport, so the test needs no live google.maps projection.
  const fixedView = { zoom: 8, view: [19, 39, 23, 43] as [number, number, number, number] };
  const input = {} as AlgorithmInput;

  it('returns no clusters when the map draws before any listings arrive', () => {
    class Guarded extends ViewportClusterAlgorithm {
      protected getViewportState() { return fixedView; }
    }
    expect(new Guarded({ maxZoom: 15 }).cluster(input)).toEqual([]);
  });

  it('guards a real crash in the stock algorithm', () => {
    class Stock extends SuperClusterViewportAlgorithm {
      protected getViewportState() { return fixedView; }
    }
    expect(() => new Stock({ maxZoom: 15 }).cluster(input)).toThrow(/range/);
  });
});
