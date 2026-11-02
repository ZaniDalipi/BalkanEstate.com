import { describe, it, expect } from 'vitest';
import { findUntrustedSources } from '@/scripts/lib/lockfile-sources.mjs';

const registryPkg = {
  resolved: 'https://registry.npmjs.org/glob/-/glob-14.0.3.tgz',
  integrity: 'sha512-abc',
};

describe('findUntrustedSources', () => {
  it('accepts packages downloaded from the npm registry with an integrity hash', () => {
    const lock = { packages: { '': {}, 'node_modules/glob': registryPkg } };
    expect(findUntrustedSources(lock)).toEqual([]);
  });

  it('skips the project itself and linked workspace folders', () => {
    const lock = { packages: { '': {}, 'node_modules/local-lib': { link: true } } };
    expect(findUntrustedSources(lock)).toEqual([]);
  });

  it('flags a package pointed at another host', () => {
    const lock = {
      packages: {
        'node_modules/lodash': { resolved: 'https://evil.example.com/lodash.tgz', integrity: 'sha512-x' },
      },
    };
    expect(findUntrustedSources(lock)).toEqual([
      { name: 'lodash', reason: expect.stringContaining('evil.example.com') },
    ]);
  });

  it('flags plain http even on the registry host', () => {
    const lock = {
      packages: { 'node_modules/a': { resolved: 'http://registry.npmjs.org/a/-/a-1.0.0.tgz', integrity: 'sha512-x' } },
    };
    expect(findUntrustedSources(lock)).toHaveLength(1);
  });

  it('flags a git dependency and a missing integrity hash', () => {
    const lock = {
      packages: {
        'node_modules/b': { resolved: 'git+ssh://git@github.com/x/b.git#abc' },
        'node_modules/c': { resolved: 'https://registry.npmjs.org/c/-/c-1.0.0.tgz' },
      },
    };
    expect(findUntrustedSources(lock).map((p) => p.name)).toEqual(['b', 'c']);
  });

  it('names nested packages by their own name', () => {
    const lock = { packages: { 'node_modules/x/node_modules/@scope/y': { resolved: 'https://other.example/y.tgz' } } };
    expect(findUntrustedSources(lock)[0].name).toBe('@scope/y');
  });
});
