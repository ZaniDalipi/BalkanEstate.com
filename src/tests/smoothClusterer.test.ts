import { describe, expect, it } from 'vitest';
import { planClusterTransition } from '../features/map/utils/smoothClusterer';

const c = (...members: string[]) => ({ members });

describe('planClusterTransition', () => {
  it('splits a bubble into the clusters it contained on zoom in', () => {
    const plan = planClusterTransition([c('a', 'b', 'c')], [c('a', 'b'), c('c')]);
    expect(plan.enter).toEqual([{ kind: 'split', from: 0 }, { kind: 'split', from: 0 }]);
    expect(plan.exit).toEqual([{ kind: 'fade' }]);
  });

  it('merges pins and bubbles into the new bubble on zoom out', () => {
    const plan = planClusterTransition([c('a', 'b'), c('c')], [c('a', 'b', 'c')]);
    expect(plan.enter).toEqual([{ kind: 'appear' }]);
    expect(plan.exit).toEqual([{ kind: 'merge', into: 0 }, { kind: 'merge', into: 0 }]);
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
